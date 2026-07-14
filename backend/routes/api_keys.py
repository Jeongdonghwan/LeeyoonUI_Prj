from flask import Blueprint, request, jsonify

from models.api_key import ApiKeyModel
from models.user import UserModel
from utils.jwt_utils import require_roles

api_keys_bp = Blueprint('api_keys', __name__, url_prefix='/api/api-keys')


@api_keys_bp.route('/', methods=['POST'])
@require_roles('admin')
def issue_key():
    """계정에 API 키 발급. 원본키는 이 응답에서만 확인 가능(이후 조회 불가)."""
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '계정을 선택해주세요.'}), 400
        if not UserModel.find_by_id(user_id):
            return jsonify({'error': 'NOT_FOUND', 'message': '존재하지 않는 계정입니다.'}), 404

        result = ApiKeyModel.create(user_id, (data.get('label') or '').strip() or None)
        return jsonify({
            'success': True,
            'data': result,  # {id, raw_key, key_prefix}
            'message': 'API 키가 발급되었습니다. 원본 키는 지금만 확인할 수 있습니다.'
        }), 201
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@api_keys_bp.route('/', methods=['GET'])
@require_roles('admin')
def list_keys():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': 'user_id가 필요합니다.'}), 400
        keys = ApiKeyModel.list_for_user(int(user_id))
        return jsonify({'success': True, 'data': keys, 'message': 'API 키 목록 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@api_keys_bp.route('/<int:key_id>', methods=['DELETE'])
@require_roles('admin')
def revoke_key(key_id):
    try:
        ApiKeyModel.revoke(key_id)
        return jsonify({'success': True, 'data': None, 'message': 'API 키가 폐기되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
