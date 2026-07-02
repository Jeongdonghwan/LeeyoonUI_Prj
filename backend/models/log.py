from utils.db import get_cursor


class LogModel:
    @staticmethod
    def _build_where(user_id=None, search_user_ids=None, start_date=None, end_date=None, current_user=None):
        where = "WHERE 1=1"
        params = []

        if current_user and current_user['role'] == 'distributor':
            where += " AND sl.user_id IN (SELECT id FROM users WHERE parent_id = %s)"
            params.append(current_user['id'])

        if user_id:
            where += " AND sl.user_id = %s"
            params.append(user_id)

        if search_user_ids:
            placeholders = ','.join(['%s'] * len(search_user_ids))
            where += f" AND sl.user_id IN ({placeholders})"
            params.extend(search_user_ids)

        if start_date:
            where += " AND DATE(sl.created_at) >= %s"
            params.append(start_date)

        if end_date:
            where += " AND DATE(sl.created_at) <= %s"
            params.append(end_date)

        return where, params

    @staticmethod
    def get_list(page=1, per_page=20, user_id=None, search_user_ids=None,
                 start_date=None, end_date=None, current_user=None):
        with get_cursor() as (cursor, conn):
            where, params = LogModel._build_where(
                user_id=user_id, search_user_ids=search_user_ids,
                start_date=start_date, end_date=end_date, current_user=current_user
            )

            cursor.execute(
                f"SELECT COUNT(*) as cnt FROM slot_logs sl {where}", params
            )
            total = cursor.fetchone()['cnt']

            offset = (page - 1) * per_page
            cursor.execute(
                f"SELECT sl.*, u.username, m.username as modified_by_username "
                f"FROM slot_logs sl "
                f"LEFT JOIN users u ON sl.user_id = u.id "
                f"LEFT JOIN users m ON sl.modified_by = m.id "
                f"{where} "
                f"ORDER BY sl.created_at DESC "
                f"LIMIT %s OFFSET %s",
                params + [per_page, offset]
            )
            logs = cursor.fetchall()

        for log in logs:
            if log.get('created_at'):
                log['created_at'] = str(log['created_at'])
            if log.get('job_start_date'):
                log['job_start_date'] = str(log['job_start_date'])

        return logs, total

    @staticmethod
    def get_all_for_export(user_id=None, search_user_ids=None,
                           start_date=None, end_date=None, current_user=None):
        with get_cursor() as (cursor, conn):
            where, params = LogModel._build_where(
                user_id=user_id, search_user_ids=search_user_ids,
                start_date=start_date, end_date=end_date, current_user=current_user
            )

            cursor.execute(
                f"SELECT sl.*, u.username, m.username as modified_by_username "
                f"FROM slot_logs sl "
                f"LEFT JOIN users u ON sl.user_id = u.id "
                f"LEFT JOIN users m ON sl.modified_by = m.id "
                f"{where} "
                f"ORDER BY sl.created_at DESC",
                params
            )
            logs = cursor.fetchall()

        for log in logs:
            if log.get('created_at'):
                log['created_at'] = str(log['created_at'])
            if log.get('job_start_date'):
                log['job_start_date'] = str(log['job_start_date'])

        return logs

    @staticmethod
    def get_stats(user_id=None, search_user_ids=None,
                  start_date=None, end_date=None, current_user=None):
        with get_cursor() as (cursor, conn):
            where, params = LogModel._build_where(
                user_id=user_id, search_user_ids=search_user_ids,
                start_date=start_date, end_date=end_date, current_user=current_user
            )

            cursor.execute(
                f"SELECT COUNT(*) as total_count, "
                f"COALESCE(SUM(sl.quantity), 0) as total_quantity, "
                f"COALESCE(SUM(sl.quantity * COALESCE(sl.slot_type, 100)), 0) as total_ta "
                f"FROM slot_logs sl {where}",
                params
            )
            stats = cursor.fetchone()

        return {
            'total_count': stats['total_count'],
            'total_quantity': int(stats['total_quantity']),
            'total_ta': int(stats['total_ta']),
        }

    @staticmethod
    def find_by_id(log_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT sl.*, u.username, m.username as modified_by_username "
                "FROM slot_logs sl "
                "LEFT JOIN users u ON sl.user_id = u.id "
                "LEFT JOIN users m ON sl.modified_by = m.id "
                "WHERE sl.id = %s",
                (log_id,)
            )
            log = cursor.fetchone()
        if log:
            if log.get('created_at'):
                log['created_at'] = str(log['created_at'])
            if log.get('job_start_date'):
                log['job_start_date'] = str(log['job_start_date'])
        return log
