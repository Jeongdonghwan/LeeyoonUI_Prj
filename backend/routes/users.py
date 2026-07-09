from flask import Blueprint, request, jsonify
from models.user import UserModel
from models.campaign import CampaignModel
from utils.jwt_utils import require_roles, get_current_user
from utils.db import get_cursor

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

# 총판이 생성 가능한 하위 등급
DISTRIBUTOR_CREATABLE = ('user', 'agency')


@users_bp.route('/', methods=['GET'])
@require_roles('admin', 'distributor')
def get_users():
    try:
        current = get_current_user()
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        offset = (page - 1) * per_page

        with get_cursor() as (cursor, conn):
            if current['role'] == 'admin':
                where = "WHERE u.role != 'admin'"
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
                f"SELECT u.id, u.username, u.role, u.parent_id, "
                f"p.username AS parent_username, u.company, u.memo, u.created_at, "
                f"(SELECT COUNT(*) FROM users s WHERE s.parent_id = u.id AND s.role='distributor') AS sub_distributor, "
                f"(SELECT COUNT(*) FROM users s WHERE s.parent_id = u.id AND s.role='agency') AS sub_agency, "
                f"(SELECT COUNT(*) FROM users s WHERE s.parent_id = u.id AND s.role='user') AS sub_user, "
                f"(SELECT COUNT(*) FROM campaigns c WHERE c.user_id = u.id) AS campaign_total, "
                f"(SELECT COUNT(*) FROM campaigns c WHERE c.user_id = u.id "
                f"   AND c.place_name IS NOT NULL AND c.place_name <> '') AS campaign_used "
                f"FROM users u LEFT JOIN users p ON u.parent_id = p.id "
                f"{where} ORDER BY u.created_at DESC LIMIT %s OFFSET %s",
                params + [per_page, offset]
            )
            users = cursor.fetchall()

        for u in users:
            if u.get('created_at'):
                u['created_at'] = str(u['created_at'])
            for k in ('sub_distributor', 'sub_agency', 'sub_user', 'campaign_total', 'campaign_used'):
                u[k] = int(u.get(k) or 0)
            u['prices'] = {}

        # 상품별 단가 부착
        if users:
            uid_list = [u['id'] for u in users]
            with get_cursor() as (cursor, conn):
                ph = ','.join(['%s'] * len(uid_list))
                cursor.execute(f"SELECT user_id, product_type, price FROM user_prices WHERE user_id IN ({ph})", uid_list)
                by_id = {u['id']: u for u in users}
                for row in cursor.fetchall():
                    by_id[row['user_id']]['prices'][row['product_type']] = row['price']

        return jsonify({'success': True, 'data': {'users': users, 'total': total},
                        'message': '계정 목록 조회 성공'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/', methods=['POST'])
@require_roles('admin', 'distributor')
def create_user():
    try:
        current = get_current_user()
        data = request.get_json() or {}

        username = data.get('username', '').strip()
        password = data.get('password', '')
        role = data.get('role', 'user')
        company = data.get('company', '')
        memo = data.get('memo', '')

        if not username or not password:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '아이디와 비밀번호는 필수입니다.'}), 400

        if current['role'] == 'distributor' and role not in DISTRIBUTOR_CREATABLE:
            return jsonify({'error': 'FORBIDDEN', 'message': '총판은 대행사/광고주만 생성할 수 있습니다.'}), 403
        if current['role'] != 'admin' and role == 'admin':
            return jsonify({'error': 'FORBIDDEN', 'message': '관리자 계정은 생성할 수 없습니다.'}), 403

        if UserModel.find_by_username(username):
            return jsonify({'error': 'DUPLICATE', 'message': '이미 존재하는 아이디입니다.'}), 409

        password_hash = UserModel.hash_password(password)
        parent_id = current['id'] if current['role'] == 'distributor' else data.get('parent_id')

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
        return jsonify({'success': True, 'data': user, 'message': '계정이 생성되었습니다.'}), 201
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/<int:user_id>', methods=['PUT'])
@require_roles('admin', 'distributor')
def update_user(user_id):
    try:
        current = get_current_user()
        data = request.get_json() or {}

        target = UserModel.find_by_id(user_id)
        if not target:
            return jsonify({'error': 'NOT_FOUND', 'message': '해당 계정을 찾을 수 없습니다.'}), 404
        if current['role'] == 'distributor' and target.get('parent_id') != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        fields, params = [], []
        if data.get('password'):
            fields.append("password_hash = %s")
            params.append(UserModel.hash_password(data['password']))
        if 'role' in data:
            if current['role'] == 'distributor' and data['role'] not in DISTRIBUTOR_CREATABLE:
                return jsonify({'error': 'FORBIDDEN', 'message': '총판은 대행사/광고주 권한만 설정할 수 있습니다.'}), 403
            fields.append("role = %s")
            params.append(data['role'])
        if 'company' in data:
            fields.append("company = %s")
            params.append(data['company'])
        if 'memo' in data:
            fields.append("memo = %s")
            params.append(data['memo'])

        prices = data.get('prices') if isinstance(data.get('prices'), dict) else None

        if not fields and not prices:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '수정할 항목이 없습니다.'}), 400

        with get_cursor() as (cursor, conn):
            if fields:
                cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", params + [user_id])
            # 상품별 단가 upsert
            if prices:
                for pt in ('bdc1', 'bdc2', 'bdc3', 'bdcnav'):
                    if pt in prices:
                        try:
                            p = int(prices[pt] or 0)
                        except (ValueError, TypeError):
                            p = 0
                        cursor.execute(
                            "INSERT INTO user_prices (user_id, product_type, price) VALUES (%s, %s, %s) "
                            "ON DUPLICATE KEY UPDATE price = VALUES(price)",
                            (user_id, pt, p)
                        )
            conn.commit()

        updated = UserModel.find_by_id(user_id)
        if updated and updated.get('created_at'):
            updated['created_at'] = str(updated['created_at'])
        return jsonify({'success': True, 'data': updated, 'message': '계정이 수정되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@require_roles('admin', 'distributor')
def delete_user(user_id):
    try:
        current = get_current_user()
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
        return jsonify({'success': True, 'data': None, 'message': '계정이 삭제되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500


@users_bp.route('/<int:user_id>/add-campaign', methods=['POST'])
@require_roles('admin', 'distributor')
def add_campaign_quantity(user_id):
    """광고주/대행사에게 빈 캠페인(슬롯) 수량 추가"""
    try:
        current = get_current_user()
        data = request.get_json() or {}
        quantity = int(data.get('quantity', 0) or 0)
        product_type = data.get('product_type', 'bdc1')

        if quantity <= 0:
            return jsonify({'error': 'VALIDATION_ERROR', 'message': '수량은 1 이상이어야 합니다.'}), 400

        target = UserModel.find_by_id(user_id)
        if not target:
            return jsonify({'error': 'NOT_FOUND', 'message': '해당 계정을 찾을 수 없습니다.'}), 404
        if current['role'] == 'distributor' and target.get('parent_id') != current['id']:
            return jsonify({'error': 'FORBIDDEN', 'message': '권한이 없습니다.'}), 403

        created = CampaignModel.create_empty(
            user_id, current['id'], product_type, quantity,
            start_date=data.get('start_date'), end_date=data.get('end_date')
        )

        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaign_logs (type, user_id, modified_by, product_type, total_ta) "
                "VALUES (%s, %s, %s, %s, %s)",
                ('등록', user_id, current['id'], product_type, 0)
            )
            conn.commit()

        return jsonify({'success': True, 'data': {'user_id': user_id, 'quantity': created},
                        'message': f'캠페인 {created}개가 추가되었습니다.'})
    except Exception as e:
        return jsonify({'error': 'INTERNAL_ERROR', 'message': str(e)}), 500
