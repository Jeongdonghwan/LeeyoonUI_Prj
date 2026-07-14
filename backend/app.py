from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config
from routes.auth import auth_bp
from routes.users import users_bp
from routes.campaigns import campaigns_bp
from routes.logs import logs_bp
from routes.notices import notices_bp
from routes.external import external_bp
from routes.api_keys import api_keys_bp


def create_app():
    app = Flask(__name__)

    # JWT 설정
    app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = Config.JWT_ACCESS_TOKEN_EXPIRES
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = Config.JWT_REFRESH_TOKEN_EXPIRES
    app.config['JWT_TOKEN_LOCATION'] = Config.JWT_TOKEN_LOCATION
    app.config['JWT_COOKIE_SECURE'] = Config.JWT_COOKIE_SECURE
    app.config['JWT_COOKIE_CSRF_PROTECT'] = Config.JWT_COOKIE_CSRF_PROTECT
    app.config['JWT_REFRESH_COOKIE_PATH'] = Config.JWT_REFRESH_COOKIE_PATH
    app.config['JWT_COOKIE_SAMESITE'] = Config.JWT_COOKIE_SAMESITE

    # Extensions
    jwt = JWTManager(app)
    CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

    # JWT 에러 핸들러
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'TOKEN_EXPIRED',
            'message': '토큰이 만료되었습니다. 다시 로그인해주세요.'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({
            'error': 'INVALID_TOKEN',
            'message': '유효하지 않은 토큰입니다.'
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({
            'error': 'MISSING_TOKEN',
            'message': '인증 토큰이 필요합니다.'
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'TOKEN_REVOKED',
            'message': '토큰이 취소되었습니다.'
        }), 401

    # Blueprint 등록
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(campaigns_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(notices_bp)
    app.register_blueprint(external_bp)
    app.register_blueprint(api_keys_bp)

    # 헬스체크
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'success': True,
            'data': {'status': 'healthy'},
            'message': 'Server is running'
        })

    # 글로벌 에러 핸들러
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            'error': 'NOT_FOUND',
            'message': '요청한 리소스를 찾을 수 없습니다.'
        }), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            'error': 'INTERNAL_ERROR',
            'message': '서버 내부 오류가 발생했습니다.'
        }), 500

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001, debug=Config.DEBUG)
