from utils.db import get_cursor


class NoticeModel:

    @staticmethod
    def get_list(search=None):
        where, params = "WHERE 1=1", []
        if search:
            where += " AND n.title LIKE %s"
            params.append(f'%{search}%')
        with get_cursor() as (cursor, conn):
            cursor.execute(
                f"SELECT n.*, u.username AS author FROM notices n "
                f"LEFT JOIN users u ON n.created_by = u.id "
                f"{where} ORDER BY n.pinned DESC, n.created_at DESC",
                params
            )
            rows = cursor.fetchall()
        for r in rows:
            for k in ('created_at', 'updated_at'):
                if r.get(k):
                    r[k] = str(r[k])
        return rows

    @staticmethod
    def find_by_id(notice_id):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT n.*, u.username AS author FROM notices n "
                "LEFT JOIN users u ON n.created_by = u.id WHERE n.id = %s",
                (notice_id,)
            )
            r = cursor.fetchone()
        if r:
            for k in ('created_at', 'updated_at'):
                if r.get(k):
                    r[k] = str(r[k])
        return r

    @staticmethod
    def create(title, content, pinned, created_by):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO notices (title, content, pinned, created_by) VALUES (%s, %s, %s, %s)",
                (title, content, 1 if pinned else 0, created_by)
            )
            conn.commit()
            return cursor.lastrowid

    @staticmethod
    def update(notice_id, title, content, pinned):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "UPDATE notices SET title = %s, content = %s, pinned = %s WHERE id = %s",
                (title, content, 1 if pinned else 0, notice_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete(notice_id):
        with get_cursor() as (cursor, conn):
            cursor.execute("DELETE FROM notices WHERE id = %s", (notice_id,))
            conn.commit()
            return cursor.rowcount > 0
