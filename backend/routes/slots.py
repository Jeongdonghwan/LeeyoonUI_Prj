from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import get_jwt_identity
from models.slot import SlotModel
from models.slot_change_detail import SlotChangeDetailModel
from utils.jwt_utils import require_roles
from utils.excel_utils import generate_slot_template, parse_slot_excel, export_slots_excel
from utils.db import get_cursor

slots_bp = Blueprint('slots', __name__, url_prefix='/api/slots')

CONTENT_FIELDS = {'keyword_main', 'keyword_compare', 'product_url', 'product_id',
                  'product_name', 'compare_url', 'single_mid', 'compare_mid', 'memo'}

ALLOWED_FIELDS = {'status', 'keyword_main', 'keyword_compare', 'product_url',
                  'product_id', 'product_name', 'compare_url', 'single_mid', 'compare_mid',
                  'start_date', 'end_date', 'quantity', 'slot_type', 'memo'}


def _compute_changes(old_slot, new_data):
    """수정 전/후 비교하여 변경된 필드 목록 반환"""
    changes = []
    for key, new_val in new_data.items():
        if key not in ALLOWED_FIELDS:
            continue
        old_val = old_slot.get(key)
        old_str = str(old_val) if old_val is not None else None
        new_str = str(new_val) if new_val is not None else None
        if old_str != new_str:
            changes.append({'field_name': key, 'old_value': old_str, 'new_value': new_str})
    return changes


def _apply_auto_pending(old_slot, data, changes):
    """컨텐츠 필드가 변경되면 자동으로 status를 pending으로 설정"""
    changed_fields = {c['field_name'] for c in changes}
    if changed_fields & CONTENT_FIELDS:
        data['status'] = 'pending'
        if old_slot.get('status') != 'pending':
            existing = next((c for c in changes if c['field_name'] == 'status'), None)
            if existing:
                existing['new_value'] = 'pending'
            else:
                changes.append({
                    'field_name': 'status',
                    'old_value': str(old_slot.get('status')),
                    'new_value': 'pending'
                })


@slots_bp.route('/', methods=['GET'])
@require_roles('admin', 'distributor', 'user')
def get_slots():
    try:
        current = get_jwt_identity()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        sort = request.args.get('sort', 'created_at')
        order = request.args.get('order', 'DESC')

        user_id = None
        created_by = None

        if current['role'] == 'user':
            user_id = current['id']
        elif current['role'] == 'distributor':
            created_by = current['id']

        # 종료일 지난 슬롯 자동 만료 처리
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "UPDATE slots SET status = 'expired' WHERE status = 'active' AND end_date IS NOT NULL AND end_date < CURDATE()"
            )
            conn.commit()

        slots, total = SlotModel.get_list(
            user_id=user_id, created_by=created_by, status=status or None,
            search=search or None, page=page, per_page=per_page,
            sort=sort, order=order
        )

        for s in slots:
            for key in ['start_date', 'end_date', 'created_at', 'updated_at']:
                if s.get(key):
                    s[key] = str(s[key])

        return jsonify({
            'success': True,
            'data': {'slots': slots, 'total': total, 'page': page, 'per_page': per_page},
            'message': '슬롯 목록 조회 성공'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@slots_bp.route('/', methods=['POST'])
@require_roles('admin', 'distributor')
def create_slot():
    try:
        current = get_jwt_identity()
        data = request.get_json()

        if not data.get('keyword_main'):
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '메인키워드는 필수입니다.'}), 400
        if not data.get('user_id'):
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '사용자를 선택해주세요.'}), 400

        data['created_by'] = current['id']
        slot_id = SlotModel.create(data)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO slot_logs (type, user_id, slot_id, modified_by, quantity, slot_type, period_days) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                ('등록', data['user_id'], slot_id, current['id'], data.get('quantity', 1), data.get('slot_type', 100), 0)
            )
            conn.commit()

        return jsonify({
            'success': True,
            'data': {'id': slot_id},
            'message': '슬롯이 등록되었습니다.'
        }), 201
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@slots_bp.route('/<int:slot_id>', methods=['PUT'])
@require_roles('admin', 'distributor', 'user')
def update_slot(slot_id):
    try:
        current = get_jwt_identity()
        data = request.get_json()

        slot = SlotModel.find_by_id(slot_id)
        if not slot:
            return jsonify({'error': 'NOT_FOUND', 'message': '슬롯을 찾을 수 없습니다.'}), 404

        if current['role'] == 'user' and slot['user_id'] != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403
        if current['role'] == 'distributor':
            # 총판: 자신의 슬롯, 자신이 생성한 슬롯, 하위 유저의 슬롯 수정 가능
            is_own = slot['user_id'] == current['id']
            is_created = slot.get('created_by') == current['id']
            with get_cursor() as (cursor, conn):
                cursor.execute("SELECT id FROM users WHERE parent_id = %s", (current['id'],))
                sub_ids = [r['id'] for r in cursor.fetchall()]
            is_sub_user = slot['user_id'] in sub_ids
            if not (is_own or is_created or is_sub_user):
                return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        if current['role'] != 'admin':
            data.pop('status', None)
        if current['role'] == 'user':
            data.pop('start_date', None)
            data.pop('end_date', None)

        # 변경 감지
        changes = _compute_changes(slot, data)

        # 컨텐츠 변경 시 자동 대기
        _apply_auto_pending(slot, data, changes)

        SlotModel.update(slot_id, data)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO slot_logs (type, user_id, slot_id, modified_by, quantity, slot_type) VALUES (%s, %s, %s, %s, %s, %s)",
                ('수정', slot['user_id'], slot_id, current['id'], slot.get('quantity', 1), slot.get('slot_type') or 100)
            )
            log_id = cursor.lastrowid
            conn.commit()

        # 상세 변경 기록
        if changes:
            SlotChangeDetailModel.create_batch(log_id, slot_id, changes)

        return jsonify({
            'success': True,
            'data': {'id': slot_id},
            'message': '슬롯이 수정되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@slots_bp.route('/bulk', methods=['PUT'])
@require_roles('admin', 'distributor', 'user')
def bulk_update_slots():
    try:
        current = get_jwt_identity()
        data = request.get_json()
        slot_ids = data.get('ids', [])
        update_data = data.get('data', {})

        if not slot_ids:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '수정할 슬롯을 선택해주세요.'}), 400

        if current['role'] != 'admin':
            update_data.pop('status', None)
        if current['role'] == 'user':
            update_data.pop('start_date', None)
            update_data.pop('end_date', None)

        updated = 0
        for sid in slot_ids:
            old_slot = SlotModel.find_by_id(sid)
            if not old_slot:
                continue

            per_slot_data = dict(update_data)
            changes = _compute_changes(old_slot, per_slot_data)
            _apply_auto_pending(old_slot, per_slot_data, changes)

            if SlotModel.update(sid, per_slot_data):
                updated += 1

                with get_cursor() as (cursor, conn):
                    cursor.execute(
                        "INSERT INTO slot_logs (type, user_id, slot_id, modified_by, quantity, slot_type) VALUES (%s, %s, %s, %s, %s, %s)",
                        ('수정', old_slot['user_id'], sid, current['id'], old_slot.get('quantity', 1), old_slot.get('slot_type') or 100)
                    )
                    log_id = cursor.lastrowid
                    conn.commit()

                if changes:
                    SlotChangeDetailModel.create_batch(log_id, sid, changes)

        return jsonify({
            'success': True,
            'data': {'updated': updated},
            'message': f'{updated}개 슬롯이 수정되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@slots_bp.route('/<int:slot_id>', methods=['DELETE'])
@require_roles('admin', 'distributor')
def delete_slot(slot_id):
    try:
        current = get_jwt_identity()
        slot = SlotModel.find_by_id(slot_id)
        if not slot:
            return jsonify({'error': 'NOT_FOUND', 'message': '슬롯을 찾을 수 없습니다.'}), 404

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO slot_logs (type, user_id, slot_id, modified_by, quantity, slot_type) VALUES (%s, %s, %s, %s, %s, %s)",
                ('삭제', slot['user_id'], slot_id, current['id'], slot.get('quantity', 1), slot.get('slot_type') or 100)
            )
            conn.commit()

        SlotModel.delete(slot_id)

        return jsonify({
            'success': True,
            'data': None,
            'message': '슬롯이 삭제되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@slots_bp.route('/excel-template', methods=['GET'])
@require_roles('admin', 'distributor', 'user')
def download_template():
    output = generate_slot_template()
    return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name='slot_template.xlsx')


@slots_bp.route('/excel-upload', methods=['POST'])
@require_roles('admin', 'distributor', 'user')
def upload_excel():
    try:
        current = get_jwt_identity()

        if 'file' not in request.files:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '파일을 선택해주세요.'}), 400

        file = request.files['file']
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'VALIDATION_ERROR', 'message': 'Excel 파일만 업로드 가능합니다.'}), 400

        file_bytes = file.read()
        target_user_id = int(request.form.get('user_id', current['id']))

        results, success_count, errors = parse_slot_excel(file_bytes, target_user_id, current['id'])

        if not results:
            return jsonify({
                'success': False,
                'data': {'updated': 0, 'errors': errors},
                'message': '유효한 데이터가 없습니다.'
            }), 400

        empty_slot_ids = SlotModel.get_empty_slots(target_user_id, limit=len(results))
        if len(empty_slot_ids) < len(results):
            return jsonify({
                'success': False,
                'data': {'available': len(empty_slot_ids), 'requested': len(results)},
                'message': f'빈 슬롯이 부족합니다. (빈 슬롯: {len(empty_slot_ids)}개, 요청: {len(results)}건)'
            }), 400

        updated_count = 0
        for slot_data, slot_id in zip(results, empty_slot_ids):
            update_fields = {k: v for k, v in slot_data.items() if k not in ('user_id', 'created_by', 'status', 'quantity')}
            SlotModel.update(slot_id, update_fields)
            updated_count += 1

        if updated_count:
            with get_cursor() as (cursor, conn):
                cursor.execute(
                    "INSERT INTO slot_logs (type, user_id, slot_id, modified_by, quantity, slot_type) VALUES (%s, %s, %s, %s, %s, %s)",
                    ('수정', target_user_id, None, current['id'], updated_count, 100)
                )
                conn.commit()

        return jsonify({
            'success': True,
            'data': {
                'updated': updated_count,
                'errors': errors
            },
            'message': f'{updated_count}건 등록 성공, {len(errors)}건 실패'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@slots_bp.route('/excel-export', methods=['GET'])
@require_roles('admin', 'distributor', 'user')
def export_excel():
    try:
        current = get_jwt_identity()

        user_id = None
        created_by = None
        if current['role'] == 'user':
            user_id = current['id']
        elif current['role'] == 'distributor':
            created_by = current['id']

        slots, _ = SlotModel.get_list(user_id=user_id, created_by=created_by, per_page=10000)

        for s in slots:
            for key in ['start_date', 'end_date', 'created_at', 'updated_at']:
                if s.get(key):
                    s[key] = str(s[key])

        output = export_slots_excel(slots)
        return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         as_attachment=True, download_name='slots_export.xlsx')
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
