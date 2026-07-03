from flask import Blueprint, request, jsonify, send_file
from models.log import LogModel
from models.campaign_change_detail import CampaignChangeDetailModel
from utils.jwt_utils import require_roles, get_current_user
from utils.db import get_cursor
from utils.excel_utils import export_logs_excel
from datetime import datetime

logs_bp = Blueprint('logs', __name__, url_prefix='/api/logs')


def _resolve_search_user_ids(search):
    if not search:
        return None
    with get_cursor() as (cursor, conn):
        cursor.execute(
            "SELECT id FROM users WHERE username LIKE %s",
            (f'%{search}%',)
        )
        return [row['id'] for row in cursor.fetchall()]


def _parse_filters():
    user_id = request.args.get('user_id')
    search = request.args.get('search', '').strip() or None
    start_date = request.args.get('start_date', '').strip() or None
    end_date = request.args.get('end_date', '').strip() or None

    filter_user_id = int(user_id) if user_id else None
    search_user_ids = None
    if search and not filter_user_id:
        search_user_ids = _resolve_search_user_ids(search)
        # 검색 결과 없음 -> 빈 리스트로 강제 (결과 0건 보장)
        if not search_user_ids:
            search_user_ids = [-1]

    return filter_user_id, search_user_ids, start_date, end_date


@logs_bp.route('/', methods=['GET'])
@require_roles('admin', 'distributor')
def get_logs():
    try:
        current = get_current_user()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        filter_user_id, search_user_ids, start_date, end_date = _parse_filters()

        logs, total = LogModel.get_list(
            page=page,
            per_page=per_page,
            user_id=filter_user_id,
            search_user_ids=search_user_ids,
            start_date=start_date,
            end_date=end_date,
            current_user=current
        )

        return jsonify({
            'success': True,
            'data': {'logs': logs, 'total': total},
            'message': '로그 목록 조회 성공'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@logs_bp.route('/stats', methods=['GET'])
@require_roles('admin', 'distributor')
def get_stats():
    try:
        current = get_current_user()
        filter_user_id, search_user_ids, start_date, end_date = _parse_filters()

        stats = LogModel.get_stats(
            user_id=filter_user_id,
            search_user_ids=search_user_ids,
            start_date=start_date,
            end_date=end_date,
            current_user=current
        )

        return jsonify({
            'success': True,
            'data': stats,
            'message': '통계 조회 성공'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@logs_bp.route('/excel-export', methods=['GET'])
@require_roles('admin', 'distributor')
def excel_export():
    try:
        current = get_current_user()
        filter_user_id, search_user_ids, start_date, end_date = _parse_filters()

        logs = LogModel.get_all_for_export(
            user_id=filter_user_id,
            search_user_ids=search_user_ids,
            start_date=start_date,
            end_date=end_date,
            current_user=current
        )

        # 수정 로그의 변경 상세 조회
        changes_map = {}
        edit_log_ids = [log['id'] for log in logs if log.get('type') == '수정']
        for log_id in edit_log_ids:
            details = CampaignChangeDetailModel.get_by_log_id(log_id)
            if details:
                changes_map[log_id] = details

        bio = export_logs_excel(logs, changes_map=changes_map)
        filename = f"logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return send_file(
            bio,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@logs_bp.route('/<int:log_id>/details', methods=['GET'])
@require_roles('admin', 'distributor')
def get_log_details(log_id):
    try:
        log = LogModel.find_by_id(log_id)
        if not log:
            return jsonify({'error': 'NOT_FOUND', 'message': '로그를 찾을 수 없습니다.'}), 404

        details = CampaignChangeDetailModel.get_by_log_id(log_id)

        return jsonify({
            'success': True,
            'data': {'log': log, 'details': details},
            'message': '로그 상세 조회 성공'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
