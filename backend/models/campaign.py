from utils.db import get_cursor

# 캠페인 저장/수정 가능 필드
EDITABLE_FIELDS = [
    'status', 'product_type', 'place_name', 'keyword_main', 'place_url',
    'intake_date', 'start_date', 'end_date', 'daily_ta', 'run_days', 'total_ta', 'memo'
]

ALLOWED_SORTS = {'created_at', 'start_date', 'end_date', 'id', 'status', 'total_ta'}


class CampaignModel:

    @staticmethod
    def find_by_id(campaign_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT c.*, u.username as user_username, cr.username as creator_username "
                "FROM campaigns c "
                "LEFT JOIN users u ON c.user_id = u.id "
                "LEFT JOIN users cr ON c.created_by = cr.id "
                "WHERE c.id = %s",
                (campaign_id,)
            )
            return cursor.fetchone()

    @staticmethod
    def _scope_where(user_id=None, created_by=None):
        """역할 스코프 WHERE 조각 반환. user_id=리프(광고주/대행사), created_by=총판"""
        parts, params = [], []
        if user_id:
            parts.append("c.user_id = %s")
            params.append(user_id)
        if created_by:
            parts.append("(c.user_id = %s OR c.created_by = %s OR c.user_id IN "
                         "(SELECT id FROM users WHERE parent_id = %s))")
            params.extend([created_by, created_by, created_by])
        return parts, params

    @staticmethod
    def get_list(user_id=None, created_by=None, status=None, product_type=None,
                 search=None, page=1, per_page=20, sort='created_at', order='DESC',
                 ids=None, created_from=None, created_to=None):
        where_parts = ["1=1"]
        params = []

        scope_parts, scope_params = CampaignModel._scope_where(user_id, created_by)
        where_parts += scope_parts
        params += scope_params

        if ids is not None:
            if not ids:
                return [], 0
            placeholders = ','.join(['%s'] * len(ids))
            where_parts.append(f"c.id IN ({placeholders})")
            params.extend(ids)
        if status:
            where_parts.append("c.status = %s")
            params.append(status)
        if product_type:
            where_parts.append("c.product_type = %s")
            params.append(product_type)
        if created_from:
            where_parts.append("DATE(c.created_at) >= %s")
            params.append(created_from)
        if created_to:
            where_parts.append("DATE(c.created_at) <= %s")
            params.append(created_to)
        if search:
            where_parts.append("(c.place_name LIKE %s OR c.keyword_main LIKE %s OR u.username LIKE %s)")
            params.extend([f'%{search}%'] * 3)

        where = " AND ".join(where_parts)
        sort_col = sort if sort in ALLOWED_SORTS else 'created_at'
        order_dir = 'ASC' if str(order).upper() == 'ASC' else 'DESC'
        offset = (page - 1) * per_page

        with get_cursor() as (cursor, conn):
            cursor.execute(
                f"SELECT COUNT(*) as cnt FROM campaigns c "
                f"LEFT JOIN users u ON c.user_id = u.id WHERE {where}",
                params
            )
            total = cursor.fetchone()['cnt']

            cursor.execute(
                f"SELECT c.*, u.username as user_username, cr.username as creator_username "
                f"FROM campaigns c "
                f"LEFT JOIN users u ON c.user_id = u.id "
                f"LEFT JOIN users cr ON c.created_by = cr.id "
                f"WHERE {where} ORDER BY c.{sort_col} {order_dir} "
                f"LIMIT %s OFFSET %s",
                params + [per_page, offset]
            )
            rows = cursor.fetchall()

        return rows, total

    @staticmethod
    def get_stats(user_id=None, created_by=None, product_type=None):
        """캠페인 관리 통계 카드: 전체/정상/오류/대기/종료예정/종료"""
        where_parts = ["1=1"]
        params = []
        scope_parts, scope_params = CampaignModel._scope_where(user_id, created_by)
        where_parts += scope_parts
        params += scope_params
        if product_type:
            where_parts.append("c.product_type = %s")
            params.append(product_type)
        where = " AND ".join(where_parts)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                f"SELECT "
                f"  COUNT(*) as total, "
                f"  SUM(c.status = 'active') as active, "
                f"  SUM(c.status = 'error') as error, "
                f"  SUM(c.status = 'pending') as pending, "
                f"  SUM(c.status = 'expired') as expired, "
                f"  SUM(c.status = 'active' AND c.end_date IS NOT NULL "
                f"      AND c.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) as ending_soon "
                f"FROM campaigns c LEFT JOIN users u ON c.user_id = u.id WHERE {where}",
                params
            )
            row = cursor.fetchone() or {}

        return {k: int(row.get(k) or 0) for k in
                ['total', 'active', 'error', 'pending', 'expired', 'ending_soon']}

    @staticmethod
    def create(data: dict):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO campaigns "
                "(user_id, created_by, product_type, status, place_name, keyword_main, place_url, "
                " intake_date, start_date, end_date, daily_ta, run_days, total_ta, memo) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    data['user_id'], data['created_by'],
                    data.get('product_type', 'bdc1'), data.get('status', 'pending'),
                    data.get('place_name'), data.get('keyword_main'), data.get('place_url'),
                    data.get('intake_date'), data.get('start_date'), data.get('end_date'),
                    data.get('daily_ta'), data.get('run_days'), data.get('total_ta', 0),
                    data.get('memo')
                )
            )
            conn.commit()
            return cursor.lastrowid

    @staticmethod
    def update(campaign_id: int, data: dict):
        fields, params = [], []
        for key in EDITABLE_FIELDS:
            if key in data:
                fields.append(f"{key} = %s")
                params.append(data[key])
        if not fields:
            return False
        params.append(campaign_id)
        with get_cursor() as (cursor, conn):
            cursor.execute(f"UPDATE campaigns SET {', '.join(fields)} WHERE id = %s", params)
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def create_empty(user_id: int, created_by: int, product_type: str, quantity: int,
                     start_date=None, end_date=None):
        """총판/관리자의 수량추가 → 빈 캠페인 생성 (엑셀/모달로 채움). 등록은 항상 대기."""
        status = 'pending'
        with get_cursor() as (cursor, conn):
            values = [(user_id, created_by, product_type, status, start_date, end_date)] * quantity
            cursor.executemany(
                "INSERT INTO campaigns "
                "(user_id, created_by, product_type, status, start_date, end_date) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                values
            )
            conn.commit()
            return cursor.rowcount

    @staticmethod
    def get_empty(user_id: int, product_type: str = None, limit: int = None):
        """비어있는(업체명 미입력) 대기 캠페인 id 목록"""
        sql = ("SELECT id FROM campaigns WHERE user_id = %s "
               "AND (place_name = '' OR place_name IS NULL) AND status = 'pending'")
        params = [user_id]
        if product_type:
            sql += " AND product_type = %s"
            params.append(product_type)
        sql += " ORDER BY id ASC"
        if limit:
            sql += " LIMIT %s"
            params.append(limit)
        with get_cursor() as (cursor, conn):
            cursor.execute(sql, params)
            return [row['id'] for row in cursor.fetchall()]

    @staticmethod
    def delete(campaign_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute("DELETE FROM campaigns WHERE id = %s", (campaign_id,))
            conn.commit()
            return cursor.rowcount > 0
