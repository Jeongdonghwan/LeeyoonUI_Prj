from functools import wraps

from flask import request, jsonify, g

from models.api_key import ApiKeyModel


def require_api_key(fn):
    """외부 연동용 API 키 인증 데코레이터.

    X-API-Key 헤더의 원본키로 소유자를 조회해 g.api_owner 에 담는다.
    유효하지 않으면 401. 성공 시 last_used_at 갱신.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        raw_key = request.headers.get('X-API-Key')
        owner = ApiKeyModel.find_owner_by_raw(raw_key)
        if not owner:
            return jsonify({
                'error': 'UNAUTHORIZED',
                'message': '유효하지 않은 API 키입니다.'
            }), 401
        g.api_owner = owner
        ApiKeyModel.touch_last_used(owner['key_id'])
        return fn(*args, **kwargs)
    return wrapper
