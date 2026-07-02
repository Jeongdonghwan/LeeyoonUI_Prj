from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
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
            current_user = get_jwt_identity()
            if current_user['role'] not in allowed_roles:
                return jsonify({
                    'error': '권한이 없습니다',
                    'message': '이 작업을 수행할 권한이 없습니다.'
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user():
    return get_jwt_identity()
