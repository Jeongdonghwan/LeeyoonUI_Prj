from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from models.user import UserModel
from models.slot import SlotModel
from utils.jwt_utils import require_roles
from utils.db import get_cursor

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('/', methods=['GET'])
@require_roles('admin', 'distributor')
def get_users():
    try:
        current = get_jwt_identity()
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        offset = (page - 1) * per_page

        with get_cursor() as (cursor, conn):
            if current['role'] == 'admin':
                where = "WHERE 1=1"
                params = []
            else:
                where = "WHERE u.parent_id = %s"
                params = [current['id']]

            if search:
                where += " AND u.username LIKE %s"
                params.append(f'%{search}%')

            cursor.execute(f"SELECT COUNT(*) as cnt FROM users u {where}", params)
            total = cursor.fetchone()['cnt']

            cursor.execute(
                f"SELECT u.id, u.username, u.password_hash, u.role, u.parent_id, "
                f"p.username AS parent_username, u.company, u.memo, u.created_at, "
                f"COALESCE(sc.total_slots, 0) AS total_slots, "
                f"COALESCE(sc.used_slots, 0) AS used_slots "
                f"FROM users u LEFT JOIN users p ON u.parent_id = p.id "
                f"LEFT JOIN ("
                f"  SELECT user_id, COUNT(*) AS total_slots, "
                f"  SUM(CASE WHEN keyword_main != '' AND keyword_main IS NOT NULL THEN 1 ELSE 0 END) AS used_slots "
                f"  FROM slots GROUP BY user_id"
                f") sc ON u.id = sc.user_id "
                f"{where} ORDER BY u.created_at DESC LIMIT %s OFFSET %s",
                params + [per_page, offset]
            )
            users = cursor.fetchall()

        for u in users:
            u.pop('password_hash', None)
            if u.get('created_at'):
                u['created_at'] = str(u['created_at'])

        return jsonify({
            'success': True,
            'data': {'users': users, 'total': total},
            'message': '계정 목록 조회 성공'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/', methods=['POST'])
@require_roles('admin', 'distributor')
def create_user():
    try:
        current = get_jwt_identity()
        data = request.get_json()

        username = data.get('username', '').strip()
        password = data.get('password', '')
        role = data.get('role', 'user')
        company = data.get('company', '')
        memo = data.get('memo', '')

        if not username or not password:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '아이디와 비밀번호는 필수입니다.'}), 400

        if current['role'] == 'distributor' and role != 'user':
            return jsonify({'error': 'FORBIDDEN', 'message': '총판은 일반유저만 생성할 수 있습니다.'}), 403

        if current['role'] != 'admin' and role == 'admin':
            return jsonify({'error': 'FORBIDDEN', 'message': '관리자 계정은 생성할 수 없습니다.'}), 403

        existing = UserModel.find_by_username(username)
        if existing:
            return jsonify({'error': 'DUPLICATE', 'message': '이미 존재하는 아이디입니다.'}), 409

        password_hash = UserModel.hash_password(password)
        parent_id = current['id'] if current['role'] == 'distributor' else None

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO users (username, password_hash, role, parent_id, company, memo) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (username, password_hash, role, parent_id, company, memo)
            )
            conn.commit()
            new_id = cursor.lastrowid

        user = UserModel.find_by_id(new_id)
        if user and user.get('created_at'):
            user['created_at'] = str(user['created_at'])

        return jsonify({
            'success': True,
            'data': user,
            'message': '계정이 생성되었습니다.'
        }), 201
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/<int:user_id>', methods=['PUT'])
@require_roles('admin', 'distributor')
def update_user(user_id):
    try:
        current = get_jwt_identity()
        data = request.get_json()

        target = UserModel.find_by_id(user_id)
        if not target:
            return jsonify({'error': 'NOT_FOUND', 'message': '해당 계정을 찾을 수 없습니다.'}), 404

        if current['role'] == 'distributor' and target.get('parent_id') != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        fields = []
        params = []

        if 'password' in data and data['password']:
            fields.append("password_hash = %s")
            params.append(UserModel.hash_password(data['password']))
        if 'role' in data:
            if current['role'] == 'distributor' and data['role'] != 'user':
                return jsonify({'error': 'FORBIDDEN', 'message': '총판은 유저 권한만 설정할 수 있습니다.'}), 403
            fields.append("role = %s")
            params.append(data['role'])
        if 'company' in data:
            fields.append("company = %s")
            params.append(data['company'])
        if 'memo' in data:
            fields.append("memo = %s")
            params.append(data['memo'])

        if not fields:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '수정할 항목이 없습니다.'}), 400

        params.append(user_id)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                f"UPDATE users SET {', '.join(fields)} WHERE id = %s",
                params
            )
            conn.commit()

        updated = UserModel.find_by_id(user_id)
        if updated and updated.get('created_at'):
            updated['created_at'] = str(updated['created_at'])

        return jsonify({
            'success': True,
            'data': updated,
            'message': '계정이 수정되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@require_roles('admin', 'distributor')
def delete_user(user_id):
    try:
        current = get_jwt_identity()

        target = UserModel.find_by_id(user_id)
        if not target:
            return jsonify({'error': 'NOT_FOUND', 'message': '해당 계정을 찾을 수 없습니다.'}), 404

        if target['id'] == current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '자기 자신은 삭제할 수 없습니다.'}), 403

        if current['role'] == 'distributor' and target.get('parent_id') != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        with get_cursor() as (cursor, conn):
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()

        return jsonify({
            'success': True,
            'data': None,
            'message': '계정이 삭제되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/<int:user_id>/add-slot', methods=['POST'])
@require_roles('admin', 'distributor')
def add_slot_quantity(user_id):
    try:
        current = get_jwt_identity()
        data = request.get_json()
        quantity = data.get('quantity', 0)

        if quantity <= 0:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '수량은 1 이상이어야 합니다.'}), 400

        target = UserModel.find_by_id(user_id)
        if not target:
            return jsonify({'error': 'NOT_FOUND', 'message': '해당 계정을 찾을 수 없습니다.'}), 404

        if current['role'] == 'distributor' and target.get('parent_id') != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        slot_type = data.get('slot_type', 100)
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        created = SlotModel.create_empty_slots(user_id, current['id'], quantity, slot_type,
                                                start_date=start_date, end_date=end_date)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO slot_logs (type, user_id, quantity, slot_type) VALUES (%s, %s, %s, %s)",
                ('등록', user_id, quantity, slot_type)
            )
            conn.commit()

        return jsonify({
            'success': True,
            'data': {'user_id': user_id, 'quantity': created},
            'message': f'슬롯 {created}개가 추가되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
