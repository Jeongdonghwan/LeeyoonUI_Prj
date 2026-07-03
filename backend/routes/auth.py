from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    set_refresh_cookies,
    unset_jwt_cookies
)
from models.user import UserModel
from utils.jwt_utils import get_current_user

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        if not data or not data.get('username') or not data.get('password'):
            return jsonify({
                'error': 'VALIDATION_ERROR',
                'message': '아이디와 비밀번호를 입력해주세요.'
            }), 400

        username = data['username'].strip()
        password = data['password']

        user = UserModel.find_by_username(username)

        if not user or not UserModel.verify_password(password, user['password_hash']):
            return jsonify({
                'error': 'INVALID_CREDENTIALS',
                'message': '아이디 또는 비밀번호가 올바르지 않습니다.'
            }), 401

        identity = str(user['id'])
        claims = {
            'username': user['username'],
            'role': user['role'],
            'company': user.get('company'),
        }

        access_token = create_access_token(identity=identity, additional_claims=claims)
        refresh_token = create_refresh_token(identity=identity, additional_claims=claims)

        response = jsonify({
            'success': True,
            'data': {
                'access_token': access_token,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'role': user['role'],
                    'company': user.get('company'),
                }
            },
            'message': '로그인 성공'
        })

        set_refresh_cookies(response, refresh_token)

        return response, 200

    except Exception as e:
        return jsonify({
            'error': 'INTERNAL_ERROR',
            'message': '서버 오류가 발생했습니다.'
        }), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True, locations=['cookies'])
def refresh():
    try:
        current_user = get_current_user()
        new_access_token = create_access_token(
            identity=str(current_user['id']),
            additional_claims={
                'username': current_user['username'],
                'role': current_user['role'],
            }
        )

        return jsonify({
            'success': True,
            'data': {
                'access_token': new_access_token
            },
            'message': '토큰 갱신 성공'
        }), 200

    except Exception as e:
        return jsonify({
            'error': 'INTERNAL_ERROR',
            'message': '서버 오류가 발생했습니다.'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    response = jsonify({
        'success': True,
        'data': None,
        'message': '로그아웃 성공'
    })

    unset_jwt_cookies(response)

    return response, 200
