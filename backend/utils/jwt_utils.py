from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from flask import jsonify

ROLE_HIERARCHY = {
    'admin': 3,
    'distributor': 2,
    'user': 1
}


def require_roles(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user = get_current_user()
            if current_user['role'] not in allowed_roles:
                return jsonify({
                    'error': '권한이 없습니다',
                    'message': '이 작업을 수행할 권한이 없습니다.'
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user():
    """JWT의 sub(문자열 id)와 추가 클레임을 합쳐 유저 dict로 반환.

    flask-jwt-extended 4.6+ 는 sub 클레임이 문자열이어야 하므로,
    identity 로 str(id) 를 저장하고 username/role 은 additional_claims 에 담는다.
    """
    identity = get_jwt_identity()
    claims = get_jwt()
    return {
        'id': int(identity),
        'username': claims.get('username'),
        'role': claims.get('role'),
    }
