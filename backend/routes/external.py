from flask import Blueprint, request, jsonify, g

from models.campaign import CampaignModel
from models.campaign_day import CampaignDayModel
from utils.api_key_auth import require_api_key
from utils.db import get_cursor
from routes.campaigns import register_campaign, _stringify

external_bp = Blueprint('external', __name__, url_prefix='/api/ext')


def _expire_overdue():
    with get_cursor() as (cursor, conn):
        cursor.execute("UPDATE campaigns SET status = 'expired' "
                       "WHERE status = 'active' AND end_date IS NOT NULL AND end_date < CURDATE()")
        conn.commit()


@external_bp.route('/campaigns', methods=['POST'])
@require_api_key
def ext_create_campaign():
    """외부 사이트 캠페인 등록. 키 소유자 계정으로 귀속, 상태는 대기(pending)."""
    try:
        owner = g.api_owner
        data = request.get_json(silent=True) or {}
        days = data.pop('days', None)

        campaign_id, err = register_campaign(data, owner['id'], owner['id'], days)
        if err:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': err}), 400

        return jsonify({
            'success': True,
            'data': {'id': campaign_id, 'status': 'pending'},
            'message': '캠페인이 등록되었습니다. 관리자 승인 후 구동됩니다.'
        }), 201
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@external_bp.route('/campaigns', methods=['GET'])
@require_api_key
def ext_list_campaigns():
    """키 소유자 계정의 캠페인 목록 조회."""
    try:
        owner = g.api_owner
        _expire_overdue()
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        rows, total = CampaignModel.get_list(
            user_id=owner['id'],
            status=request.args.get('status') or None,
            product_type=request.args.get('product_type') or None,
            page=page, per_page=per_page,
        )
        _stringify(rows)
        return jsonify({
            'success': True,
            'data': {'campaigns': rows, 'total': total, 'page': page, 'per_page': per_page},
            'message': '캠페인 목록 조회 성공'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@external_bp.route('/campaigns/<int:campaign_id>', methods=['GET'])
@require_api_key
def ext_get_campaign(campaign_id):
    """단건 상태 조회. 소유자 불일치 시 404(정보 노출 방지)."""
    try:
        owner = g.api_owner
        _expire_overdue()
        c = CampaignModel.find_by_id(campaign_id)
        if not c or c['user_id'] != owner['id']:
            return jsonify({'error': 'NOT_FOUND', 'message': '캠페인을 찾을 수 없습니다.'}), 404
        _stringify([c])
        c['days'] = CampaignDayModel.get_by_campaign(campaign_id)
        return jsonify({'success': True, 'data': c, 'message': '캠페인 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
