from flask import Blueprint, request, jsonify
from models.notice import NoticeModel
from utils.jwt_utils import require_roles, get_current_user

notices_bp = Blueprint('notices', __name__, url_prefix='/api/notices')


@notices_bp.route('/', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def list_notices():
    try:
        rows = NoticeModel.get_list(search=request.args.get('search') or None)
        return jsonify({'success': True, 'data': {'notices': rows}, 'message': '공지 목록 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@notices_bp.route('/<int:notice_id>', methods=['GET'])
@require_roles('admin', 'distributor', 'agency', 'user')
def get_notice(notice_id):
    try:
        n = NoticeModel.find_by_id(notice_id)
        if not n:
            return jsonify({'error': 'NOT_FOUND', 'message': '공지를 찾을 수 없습니다.'}), 404
        return jsonify({'success': True, 'data': n, 'message': '공지 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@notices_bp.route('/', methods=['POST'])
@require_roles('admin')
def create_notice():
    try:
        current = get_current_user()
        data = request.get_json() or {}
        title = (data.get('title') or '').strip()
        if not title:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '제목은 필수입니다.'}), 400
        nid = NoticeModel.create(title, data.get('content', ''), data.get('pinned', False), current['id'])
        return jsonify({'success': True, 'data': {'id': nid}, 'message': '공지가 등록되었습니다.'}), 201
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@notices_bp.route('/<int:notice_id>', methods=['PUT'])
@require_roles('admin')
def update_notice(notice_id):
    try:
        data = request.get_json() or {}
        if not NoticeModel.find_by_id(notice_id):
            return jsonify({'error': 'NOT_FOUND', 'message': '공지를 찾을 수 없습니다.'}), 404
        title = (data.get('title') or '').strip()
        if not title:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '제목은 필수입니다.'}), 400
        NoticeModel.update(notice_id, title, data.get('content', ''), data.get('pinned', False))
        return jsonify({'success': True, 'data': {'id': notice_id}, 'message': '공지가 수정되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@notices_bp.route('/<int:notice_id>', methods=['DELETE'])
@require_roles('admin')
def delete_notice(notice_id):
    try:
        if not NoticeModel.find_by_id(notice_id):
            return jsonify({'error': 'NOT_FOUND', 'message': '공지를 찾을 수 없습니다.'}), 404
        NoticeModel.delete(notice_id)
        return jsonify({'success': True, 'data': None, 'message': '공지가 삭제되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
