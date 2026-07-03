from utils.db import get_cursor


class CampaignDayModel:
    """포맷 B(북두칠성2) 일자별 작업량 D-1 ~ D-N"""

    @staticmethod
    def replace_for_campaign(campaign_id: int, days: list):
        """days = [{'day_no': 1, 'ta': 100}, ...] — 기존 값 전체 교체"""
        with get_cursor() as (cursor, conn):
            cursor.execute("DELETE FROM campaign_days WHERE campaign_id = %s", (campaign_id,))
            if days:
                values = [(campaign_id, int(d['day_no']), int(d.get('ta') or 0)) for d in days]
                cursor.executemany(
                    "INSERT INTO campaign_days (campaign_id, day_no, ta) VALUES (%s, %s, %s)",
                    values
                )
            conn.commit()
            return len(days)

    @staticmethod
    def get_by_campaign(campaign_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT id, campaign_id, day_no, ta FROM campaign_days "
                "WHERE campaign_id = %s ORDER BY day_no ASC",
                (campaign_id,)
            )
            return cursor.fetchall()
