from utils.db import get_cursor


FIELD_LABELS = {
    'status': '상태',
    'product_type': '상품유형',
    'place_name': '업체명',
    'keyword_main': '메인키워드',
    'place_url': '플레이스 URL',
    'intake_date': '접수일',
    'start_date': '시작일',
    'end_date': '만료일',
    'daily_ta': '일타수',
    'run_days': '구동일수',
    'total_ta': '총타수',
    'memo': '메모',
}


class CampaignChangeDetailModel:

    @staticmethod
    def create_batch(log_id: int, campaign_id: int, changes: list):
        if not changes:
            return 0
        with get_cursor() as (cursor, conn):
            values = [
                (log_id, campaign_id, c['field_name'],
                 str(c['old_value']) if c['old_value'] is not None else None,
                 str(c['new_value']) if c['new_value'] is not None else None)
                for c in changes
            ]
            cursor.executemany(
                "INSERT INTO campaign_change_details "
                "(log_id, campaign_id, field_name, old_value, new_value) "
                "VALUES (%s, %s, %s, %s, %s)",
                values
            )
            conn.commit()
            return cursor.rowcount

    @staticmethod
    def get_by_log_id(log_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT * FROM campaign_change_details WHERE log_id = %s ORDER BY id ASC",
                (log_id,)
            )
            details = cursor.fetchall()
        for d in details:
            d['field_label'] = FIELD_LABELS.get(d['field_name'], d['field_name'])
        return details
