from utils.db import get_cursor


class SlotModel:

    @staticmethod
    def find_by_id(slot_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute("SELECT * FROM slots WHERE id = %s", (slot_id,))
            return cursor.fetchone()

    @staticmethod
    def get_list(user_id=None, created_by=None, status=None, search=None,
                 page=1, per_page=20, sort='created_at', order='DESC'):
        where_parts = ["1=1"]
        params = []

        if user_id:
            where_parts.append("s.user_id = %s")
            params.append(user_id)
        if created_by:
            where_parts.append("(s.user_id = %s OR s.created_by = %s OR s.user_id IN (SELECT id FROM users WHERE parent_id = %s))")
            params.extend([created_by, created_by, created_by])
        if status:
            where_parts.append("s.status = %s")
            params.append(status)
        if search:
            where_parts.append("(s.keyword_main LIKE %s OR s.single_mid LIKE %s OR u.username LIKE %s)")
            params.extend([f'%{search}%'] * 3)

        where = " AND ".join(where_parts)

        allowed_sorts = {'created_at', 'start_date', 'end_date', 'id', 'status'}
        sort_col = sort if sort in allowed_sorts else 'created_at'
        order_dir = 'ASC' if order.upper() == 'ASC' else 'DESC'

        offset = (page - 1) * per_page

        with get_cursor() as (cursor, conn):
            cursor.execute(
                f"SELECT COUNT(*) as cnt FROM slots s "
                f"LEFT JOIN users u ON s.user_id = u.id WHERE {where}",
                params
            )
            total = cursor.fetchone()['cnt']

            cursor.execute(
                f"SELECT s.*, u.username as user_username, c.username as creator_username "
                f"FROM slots s "
                f"LEFT JOIN users u ON s.user_id = u.id "
                f"LEFT JOIN users c ON s.created_by = c.id "
                f"WHERE {where} ORDER BY s.{sort_col} {order_dir} "
                f"LIMIT %s OFFSET %s",
                params + [per_page, offset]
            )
            slots = cursor.fetchall()

        return slots, total

    @staticmethod
    def create(data: dict):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO slots (user_id, status, created_by, keyword_main, keyword_compare, "
                "product_url, product_id, product_name, compare_url, single_mid, compare_mid, "
                "start_date, end_date, quantity, slot_type, memo) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    data['user_id'], data.get('status', 'pending'), data['created_by'],
                    data['keyword_main'], data.get('keyword_compare'),
                    data.get('product_url'), data.get('product_id'), data.get('product_name'),
                    data.get('compare_url'),
                    data.get('single_mid'), data.get('compare_mid'),
                    data.get('start_date'), data.get('end_date'),
                    data.get('quantity', 1), data.get('slot_type', 100),
                    data.get('memo')
                )
            )
            conn.commit()
            return cursor.lastrowid

    @staticmethod
    def update(slot_id: int, data: dict):
        fields = []
        params = []
        allowed = ['status', 'keyword_main', 'keyword_compare', 'product_url',
                    'product_id', 'product_name', 'compare_url', 'single_mid', 'compare_mid',
                    'start_date', 'end_date', 'quantity', 'slot_type', 'memo']

        for key in allowed:
            if key in data:
                fields.append(f"{key} = %s")
                params.append(data[key])

        if not fields:
            return False

        params.append(slot_id)

        with get_cursor() as (cursor, conn):
            cursor.execute(
                f"UPDATE slots SET {', '.join(fields)} WHERE id = %s",
                params
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def create_empty_slots(user_id: int, created_by: int, quantity: int, slot_type: int = 100,
                           start_date=None, end_date=None):
        status = 'active' if start_date else 'pending'
        with get_cursor() as (cursor, conn):
            values = [(user_id, status, created_by, '', slot_type, start_date, end_date)] * quantity
            cursor.executemany(
                "INSERT INTO slots (user_id, status, created_by, keyword_main, slot_type, start_date, end_date) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                values
            )
            conn.commit()
            return cursor.rowcount

    @staticmethod
    def get_empty_slots(user_id: int, limit: int = None):
        with get_cursor() as (cursor, conn):
            sql = ("SELECT id FROM slots WHERE user_id = %s "
                   "AND (keyword_main = '' OR keyword_main IS NULL) "
                   "AND status = 'pending' ORDER BY id ASC")
            params = [user_id]
            if limit:
                sql += " LIMIT %s"
                params.append(limit)
            cursor.execute(sql, params)
            return [row['id'] for row in cursor.fetchall()]

    @staticmethod
    def delete(slot_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute("DELETE FROM slots WHERE id = %s", (slot_id,))
            conn.commit()
            return cursor.rowcount > 0
