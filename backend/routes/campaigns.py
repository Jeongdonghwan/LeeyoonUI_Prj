import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, send_file
from models.campaign import CampaignModel
from models.campaign_day import CampaignDayModel
from models.campaign_change_detail import CampaignChangeDetailModel
from utils.jwt_utils import require_roles, get_current_user
from utils.excel_utils import generate_template, parse_campaign_excel, export_campaigns_excel, export_campaigns_multi, PRODUCTS
from utils.db import get_cursor

campaigns_bp = Blueprint('campaigns', __name__, url_prefix='/api/campaigns')

XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

# 대행사(agency)는 광고주(user)와 동일한 리프 노드
LEAF_ROLES = ('user', 'agency')

# 내용 변경 시 자동으로 status=pending 재검토
CONTENT_FIELDS = {'place_name', 'keyword_main', 'place_url', 'daily_ta', 'run_days', 'total_ta', 'memo'}
ALLOWED_FIELDS = {'status', 'product_type', 'place_name', 'keyword_main', 'place_url',
                  'intake_date', 'start_date', 'end_date', 'daily_ta', 'run_days', 'total_ta', 'memo'}


def _scope_for(current):
    """역할별 (user_id, created_by) 스코프 반환"""
    if current['role'] in LEAF_ROLES:
        return current['id'], None
    if current['role'] == 'distributor':
        return None, current['id']
    return None, None  # admin


def _stringify(rows):
    for s in rows:
        for key in ('intake_date', 'start_date', 'end_date', 'created_at', 'updated_at'):
            if s.get(key):
                s[key] = str(s[key])
    return rows


def _compute_changes(old, new_data):
    changes = []
    for key, new_val in new_data.items():
        if key not in ALLOWED_FIELDS:
            continue
        old_val = old.get(key)
        old_str = str(old_val) if old_val is not None else None
        new_str = str(new_val) if new_val is not None else None
        if old_str != new_str:
            changes.append({'field_name': key, 'old_value': old_str, 'new_value': new_str})
    return changes


def _force_pending(old, data, changes):
    """수정 시 무조건 대기 상태로 되돌림 (관리자 승인 전까지)"""
    data['status'] = 'pending'
    if old.get('status') != 'pending':
        existing = next((c for c in changes if c['field_name'] == 'status'), None)
        if existing:
            existing['new_value'] = 'pending'
        else:
            changes.append({'field_name': 'status',
                            'old_value': str(old.get('status')), 'new_value': 'pending'})


JAMO_RE = re.compile('[ㄱ-ㅣ]')  # 한글 자음(ㄱ~ㅎ)/모음(ㅏ~ㅣ) 단독 = 오타
PLACE_URL_HOST = 'm.place.naver.com'


def _validate_content(data):
    """메인키워드 자음/모음 오타 + 플레이스 URL 형식 검증. 오류 메시지 or None"""
    kw = data.get('keyword_main')
    if kw and JAMO_RE.search(str(kw)):
        return '메인키워드에 자음/모음만 입력되었습니다. 오타를 확인해주세요.'
    url = data.get('place_url')
    if url and PLACE_URL_HOST not in str(url):
        return 'URL은 https://m.place.naver.com/ 형식이어야 합니다. 다시 입력해주세요.'
    return None


def _ensure_end_date(data):
    """start_date + run_days가 있고 end_date가 없으면 자동 계산"""
    if data.get('end_date') or not data.get('start_date') or not data.get('run_days'):
        return
    try:
        start = datetime.strptime(str(data['start_date'])[:10], '%Y-%m-%d').date()
        data['end_date'] = (start + timedelta(days=int(data['run_days']))).isoformat()
    except (ValueError, TypeError):
        pass


def _compute_total(data, days):
    """총타수 자동계산: B형=일자별 합, A형=일타수×구동일수"""
    if days:
        return sum(int(d.get('ta') or 0) for d in days)
    dt = data.get('daily_ta')
    rd = data.get('run_days')
    if dt and rd:
        return int(dt) * int(rd)
    return data.get('total_ta') or 0


def _can_distributor_edit(current, campaign):
    if campaign['user_id'] == current['id'] or campaign.get('created_by') == current['id']:
        return True
    with get_cursor() as (cursor, conn):
        cursor.execute("SELECT id FROM users WHERE parent_id = %s", (current['id'],))
        sub_ids = [r['id'] for r in cursor.fetchall()]
    return campaign['user_id'] in sub_ids


@campaigns_bp.route('/', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def list_campaigns():
    try:
        current = get_current_user()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        user_id, created_by = _scope_for(current)

        # 종료일 지난 캠페인 자동 만료
        with get_cursor() as (cursor, conn):
            cursor.execute("UPDATE campaigns SET status = 'expired' "
                           "WHERE status = 'active' AND end_date IS NOT NULL AND end_date < CURDATE()")
            conn.commit()

        rows, total = CampaignModel.get_list(
            user_id=user_id, created_by=created_by,
            status=request.args.get('status') or None,
            product_type=request.args.get('product_type') or None,
            search=request.args.get('search') or None,
            page=page, per_page=per_page,
            sort=request.args.get('sort', 'created_at'),
            order=request.args.get('order', 'DESC'),
        )
        _stringify(rows)
        return jsonify({'success': True,
                        'data': {'campaigns': rows, 'total': total, 'page': page, 'per_page': per_page},
                        'message': '캠페인 목록 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/stats', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def campaign_stats():
    try:
        current = get_current_user()
        user_id, created_by = _scope_for(current)
        with get_cursor() as (cursor, conn):
            cursor.execute("UPDATE campaigns SET status = 'expired' "
                           "WHERE status = 'active' AND end_date IS NOT NULL AND end_date < CURDATE()")
            conn.commit()
        stats = CampaignModel.get_stats(user_id=user_id, created_by=created_by,
                                        product_type=request.args.get('product_type') or None)
        return jsonify({'success': True, 'data': stats, 'message': '통계 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/<int:campaign_id>', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def get_campaign(campaign_id):
    try:
        current = get_current_user()
        c = CampaignModel.find_by_id(campaign_id)
        if not c:
            return jsonify({'error': 'NOT_FOUND', 'message': '캠페인을 찾을 수 없습니다.'}), 404
        if current['role'] in LEAF_ROLES and c['user_id'] != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403
        if current['role'] == 'distributor' and not _can_distributor_edit(current, c):
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403
        _stringify([c])
        c['days'] = CampaignDayModel.get_by_campaign(campaign_id)
        return jsonify({'success': True, 'data': c, 'message': '캠페인 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/', methods=['POST'])
@require_roles('admin', 'distributor', 'agency', 'user')
def create_campaign():
    try:
        current = get_current_user()
        data = request.get_json() or {}
        days = data.pop('days', None)

        # 광고주/대행사는 본인 것만 등록 가능
        if current['role'] in LEAF_ROLES:
            data['user_id'] = current['id']
        if not data.get('user_id'):
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '사용자를 선택해주세요.'}), 400
        if not data.get('place_name') and not data.get('keyword_main'):
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '업체명 또는 메인키워드는 필수입니다.'}), 400
        verr = _validate_content(data)
        if verr:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': verr}), 400

        data['created_by'] = current['id']
        data.setdefault('product_type', 'bdc1')
        _ensure_end_date(data)
        data['total_ta'] = _compute_total(data, days)
        data['status'] = 'pending'  # 등록 시 무조건 대기 → 관리자 승인 필요

        campaign_id = CampaignModel.create(data)
        if days:
            CampaignDayModel.replace_for_campaign(campaign_id, days)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaign_logs (type, user_id, campaign_id, modified_by, product_type, total_ta, period_days) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                ('등록', data['user_id'], campaign_id, current['id'], data['product_type'],
                 data['total_ta'], data.get('run_days') or 0)
            )
            conn.commit()

        return jsonify({'success': True, 'data': {'id': campaign_id}, 'message': '캠페인이 등록되었습니다.'}), 201
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/<int:campaign_id>', methods=['PUT'])
@require_roles('admin', 'distributor', 'agency', 'user')
def update_campaign(campaign_id):
    try:
        current = get_current_user()
        data = request.get_json() or {}
        days = data.pop('days', None)

        campaign = CampaignModel.find_by_id(campaign_id)
        if not campaign:
            return jsonify({'error': 'NOT_FOUND', 'message': '캠페인을 찾을 수 없습니다.'}), 404

        if current['role'] in LEAF_ROLES and campaign['user_id'] != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403
        if current['role'] == 'distributor' and not _can_distributor_edit(current, campaign):
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        # 상태(승인) 변경은 관리자만 — 그 외 역할은 status 무시. 날짜/내용은 본인 것 수정 허용.
        if current['role'] != 'admin':
            data.pop('status', None)

        verr = _validate_content(data)
        if verr:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': verr}), 400

        # 만료일 재계산 (시작일/구동일수 변경 시, end_date 미지정이면)
        if ('start_date' in data or 'run_days' in data) and 'end_date' not in data:
            merged_dates = {'start_date': data.get('start_date', campaign.get('start_date')),
                            'run_days': data.get('run_days', campaign.get('run_days'))}
            _ensure_end_date(merged_dates)
            if merged_dates.get('end_date'):
                data['end_date'] = merged_dates['end_date']
        # 총타수 재계산
        if days is not None or 'daily_ta' in data or 'run_days' in data:
            merged = {**campaign, **data}
            data['total_ta'] = _compute_total(merged, days)

        changes = _compute_changes(campaign, data)
        _force_pending(campaign, data, changes)
        CampaignModel.update(campaign_id, data)
        if days is not None:
            CampaignDayModel.replace_for_campaign(campaign_id, days)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaign_logs (type, user_id, campaign_id, modified_by, product_type, total_ta, period_days) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                ('수정', campaign['user_id'], campaign_id, current['id'], campaign.get('product_type'),
                 data.get('total_ta', campaign.get('total_ta') or 0), campaign.get('run_days') or 0)
            )
            log_id = cursor.lastrowid
            conn.commit()

        if changes:
            CampaignChangeDetailModel.create_batch(log_id, campaign_id, changes)

        return jsonify({'success': True, 'data': {'id': campaign_id}, 'message': '캠페인이 수정되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/bulk', methods=['PUT'])
@require_roles('admin', 'distributor')
def bulk_update():
    try:
        current = get_current_user()
        body = request.get_json() or {}
        ids = body.get('ids', [])
        update_data = body.get('data', {})
        if not ids:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '수정할 캠페인을 선택해주세요.'}), 400
        if current['role'] != 'admin':
            update_data.pop('status', None)

        updated = 0
        for cid in ids:
            old = CampaignModel.find_by_id(cid)
            if not old:
                continue
            if current['role'] == 'distributor' and not _can_distributor_edit(current, old):
                continue
            per = dict(update_data)
            if 'daily_ta' in per or 'run_days' in per:
                per['total_ta'] = _compute_total({**old, **per}, None)
            changes = _compute_changes(old, per)
            _force_pending(old, per, changes)
            if CampaignModel.update(cid, per):
                updated += 1
                with get_cursor() as (cursor, conn):
                    cursor.execute(
                        "INSERT INTO campaign_logs (type, user_id, campaign_id, modified_by, product_type, total_ta, period_days) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                        ('수정', old['user_id'], cid, current['id'], old.get('product_type'),
                         per.get('total_ta', old.get('total_ta') or 0), old.get('run_days') or 0)
                    )
                    log_id = cursor.lastrowid
                    conn.commit()
                if changes:
                    CampaignChangeDetailModel.create_batch(log_id, cid, changes)

        return jsonify({'success': True, 'data': {'updated': updated}, 'message': f'{updated}개 캠페인이 수정되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/<int:campaign_id>', methods=['DELETE'])
@require_roles('admin', 'distributor')
def delete_campaign(campaign_id):
    try:
        current = get_current_user()
        c = CampaignModel.find_by_id(campaign_id)
        if not c:
            return jsonify({'error': 'NOT_FOUND', 'message': '캠페인을 찾을 수 없습니다.'}), 404
        if current['role'] == 'distributor' and not _can_distributor_edit(current, c):
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaign_logs (type, user_id, campaign_id, modified_by, product_type, total_ta, period_days) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                ('삭제', c['user_id'], campaign_id, current['id'], c.get('product_type'),
                 c.get('total_ta') or 0, c.get('run_days') or 0)
            )
            conn.commit()
        CampaignModel.delete(campaign_id)
        return jsonify({'success': True, 'data': None, 'message': '캠페인이 삭제되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/<int:campaign_id>/approve', methods=['PUT'])
@require_roles('admin')
def approve_campaign(campaign_id):
    """관리자 승인: 대기 → 정상"""
    try:
        current = get_current_user()
        c = CampaignModel.find_by_id(campaign_id)
        if not c:
            return jsonify({'error': 'NOT_FOUND', 'message': '캠페인을 찾을 수 없습니다.'}), 404

        CampaignModel.update(campaign_id, {'status': 'active'})
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaign_logs (type, user_id, campaign_id, modified_by, product_type, total_ta, period_days) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                ('수정', c['user_id'], campaign_id, current['id'], c.get('product_type'),
                 c.get('total_ta') or 0, c.get('run_days') or 0)
            )
            log_id = cursor.lastrowid
            conn.commit()
        CampaignChangeDetailModel.create_batch(log_id, campaign_id, [
            {'field_name': 'status', 'old_value': c.get('status'), 'new_value': 'active'}
        ])
        return jsonify({'success': True, 'data': {'id': campaign_id}, 'message': '캠페인이 승인되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


STATUS_SETTABLE = {'active', 'pending', 'expired'}  # 관리자 수동 상태변경 허용값(오류 제외)


@campaigns_bp.route('/<int:campaign_id>/status', methods=['PUT'])
@require_roles('admin')
def set_campaign_status(campaign_id):
    """관리자 상태 변경: 정상(active)/대기(pending)/종료(expired)"""
    try:
        current = get_current_user()
        c = CampaignModel.find_by_id(campaign_id)
        if not c:
            return jsonify({'error': 'NOT_FOUND', 'message': '캠페인을 찾을 수 없습니다.'}), 404
        new_status = (request.get_json() or {}).get('status')
        if new_status not in STATUS_SETTABLE:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '허용되지 않은 상태입니다.'}), 400
        old = c.get('status')
        if old == new_status:
            return jsonify({'success': True, 'data': {'id': campaign_id}, 'message': '변경 없음'})

        CampaignModel.update(campaign_id, {'status': new_status})
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaign_logs (type, user_id, campaign_id, modified_by, product_type, total_ta, period_days) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                ('수정', c['user_id'], campaign_id, current['id'], c.get('product_type'),
                 c.get('total_ta') or 0, c.get('run_days') or 0)
            )
            log_id = cursor.lastrowid
            conn.commit()
        CampaignChangeDetailModel.create_batch(log_id, campaign_id, [
            {'field_name': 'status', 'old_value': old, 'new_value': new_status}
        ])
        return jsonify({'success': True, 'data': {'id': campaign_id}, 'message': '상태가 변경되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/<int:campaign_id>/history', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def campaign_history(campaign_id):
    """캠페인 변경 이력 (로그 + 변경 전/후)"""
    try:
        current = get_current_user()
        c = CampaignModel.find_by_id(campaign_id)
        if not c:
            return jsonify({'error': 'NOT_FOUND', 'message': '캠페인을 찾을 수 없습니다.'}), 404
        if current['role'] in LEAF_ROLES and c['user_id'] != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403
        if current['role'] == 'distributor' and not _can_distributor_edit(current, c):
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT cl.*, u.username, m.username as modified_by_username "
                "FROM campaign_logs cl "
                "LEFT JOIN users u ON cl.user_id = u.id "
                "LEFT JOIN users m ON cl.modified_by = m.id "
                "WHERE cl.campaign_id = %s ORDER BY cl.created_at DESC, cl.id DESC",
                (campaign_id,)
            )
            logs = cursor.fetchall()
        for log in logs:
            if log.get('created_at'):
                log['created_at'] = str(log['created_at'])
            if log.get('job_start_date'):
                log['job_start_date'] = str(log['job_start_date'])
            log['changes'] = CampaignChangeDetailModel.get_by_log_id(log['id']) if log['type'] == '수정' else []

        return jsonify({'success': True, 'data': {'logs': logs}, 'message': '이력 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


# ---------------------------------------------------------------- Excel
@campaigns_bp.route('/excel-template', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def download_template():
    product_type = request.args.get('product_type', 'bdc1')
    if product_type not in PRODUCTS:
        product_type = 'bdc1'
    output = generate_template(product_type)
    return send_file(output, mimetype=XLSX_MIME, as_attachment=True,
                     download_name=f'{product_type}_template.xlsx')


@campaigns_bp.route('/excel-upload', methods=['POST'])
@require_roles('admin', 'distributor', 'agency', 'user')
def upload_excel():
    try:
        current = get_current_user()
        if 'file' not in request.files:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '파일을 선택해주세요.'}), 400
        file = request.files['file']
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'VALIDATION_ERROR', 'message': 'Excel 파일만 업로드 가능합니다.'}), 400

        product_type = request.form.get('product_type', 'bdc1')
        if product_type not in PRODUCTS:
            product_type = 'bdc1'
        # 광고주/대행사는 본인 대상으로만 업로드
        if current['role'] in LEAF_ROLES:
            target_user_id = current['id']
        else:
            if not request.form.get('user_id'):
                return jsonify({'error': 'VALIDATION_ERROR', 'message': '대상 사용자를 선택해주세요.'}), 400
            target_user_id = int(request.form.get('user_id'))

        results, count, errors = parse_campaign_excel(file.read(), product_type, target_user_id, current['id'])
        if not results:
            return jsonify({'success': False, 'data': {'updated': 0, 'errors': errors},
                            'message': '유효한 데이터가 없습니다.'}), 400

        # 빈 캠페인 채우기 (부족하면 새로 생성)
        empty_ids = CampaignModel.get_empty(target_user_id, product_type, limit=len(results))
        created = 0
        for i, cdata in enumerate(results):
            days = cdata.pop('days', None)
            if i < len(empty_ids):
                cid = empty_ids[i]
                fields = {k: v for k, v in cdata.items() if k not in ('user_id', 'created_by')}
                CampaignModel.update(cid, fields)
            else:
                cid = CampaignModel.create(cdata)
                created += 1
            if days is not None:
                CampaignDayModel.replace_for_campaign(cid, days)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaign_logs (type, user_id, campaign_id, modified_by, product_type, total_ta, period_days) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                ('등록', target_user_id, None, current['id'], product_type,
                 sum(r.get('total_ta') or 0 for r in results), 0)
            )
            conn.commit()

        return jsonify({'success': True, 'data': {'updated': count, 'errors': errors},
                        'message': f'{count}건 등록 성공, {len(errors)}건 실패'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/excel-export', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def export_excel():
    try:
        current = get_current_user()
        product_type = request.args.get('product_type', 'bdc1')
        if product_type not in PRODUCTS:
            product_type = 'bdc1'
        user_id, created_by = _scope_for(current)
        rows, _ = CampaignModel.get_list(user_id=user_id, created_by=created_by,
                                         product_type=product_type, per_page=10000)
        _stringify(rows)
        days_map = {}
        if PRODUCTS[product_type]['format'] == 'B':
            for r in rows:
                days_map[r['id']] = CampaignDayModel.get_by_campaign(r['id'])
        output = export_campaigns_excel(rows, product_type, days_map)
        return send_file(output, mimetype=XLSX_MIME, as_attachment=True,
                         download_name=f'{product_type}_campaigns.xlsx')
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@campaigns_bp.route('/export-intake', methods=['POST'])
@require_roles('admin', 'distributor')
def export_intake():
    """접수 양식(채워진 트래픽/일자별 시트) 다운로드.
    body: {ids?: [], product_type?, start_date?, end_date?} — ids 우선, 없으면 상품+등록일 범위"""
    try:
        current = get_current_user()
        body = request.get_json() or {}
        ids = body.get('ids')
        product_type = body.get('product_type') or None
        start_date = (body.get('start_date') or '').strip() or None
        end_date = (body.get('end_date') or '').strip() or None
        user_id, created_by = _scope_for(current)

        if ids:
            rows, _ = CampaignModel.get_list(user_id=user_id, created_by=created_by,
                                             ids=[int(i) for i in ids], per_page=100000)
        else:
            if product_type and product_type not in PRODUCTS:
                product_type = None
            rows, _ = CampaignModel.get_list(user_id=user_id, created_by=created_by,
                                             product_type=product_type,
                                             created_from=start_date, created_to=end_date,
                                             per_page=100000)
        _stringify(rows)

        # 상품별 그룹핑 (+ B형 days 로딩)
        groups = {}
        for r in rows:
            pt = r.get('product_type') or 'bdc1'
            groups.setdefault(pt, ([], {}))
            groups[pt][0].append(r)
            if PRODUCTS.get(pt, {}).get('format') == 'B':
                groups[pt][1][r['id']] = CampaignDayModel.get_by_campaign(r['id'])

        output = export_campaigns_multi(groups)
        return send_file(output, mimetype=XLSX_MIME, as_attachment=True,
                         download_name='접수양식.xlsx')
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
