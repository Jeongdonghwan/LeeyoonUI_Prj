from utils.db import get_cursor


FIELD_LABELS = {
    'status': '상태',
    'keyword_main': '메인키워드',
    'keyword_compare': '5위내 키워드',
    'product_url': '상품URL',
    'product_id': '상품번호',
    'product_name': '상품명',
    'compare_url': '가격비교URL',
    'single_mid': 'MID',
    'compare_mid': '가격비교MID',
    'start_date': '시작일',
    'end_date': '종료일',
    'quantity': '수량',
    'slot_type': '슬롯타입',
    'memo': '메모',
}


class SlotChangeDetailModel:

    @staticmethod
    def create_batch(log_id: int, slot_id: int, changes: list):
        if not changes:
            return 0

        with get_cursor() as (cursor, conn):
            values = [
                (log_id, slot_id, c['field_name'],
                 str(c['old_value']) if c['old_value'] is not None else None,
                 str(c['new_value']) if c['new_value'] is not None else None)
                for c in changes
            ]
            cursor.executemany(
                "INSERT INTO slot_change_details (log_id, slot_id, field_name, old_value, new_value) "
                "VALUES (%s, %s, %s, %s, %s)",
                values
            )
            conn.commit()
            return cursor.rowcount

    @staticmethod
    def get_by_log_id(log_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT * FROM slot_change_details WHERE log_id = %s ORDER BY id ASC",
                (log_id,)
            )
            details = cursor.fetchall()

        for d in details:
            d['field_label'] = FIELD_LABELS.get(d['field_name'], d['field_name'])

        return details
