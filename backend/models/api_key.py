import hashlib
import secrets

from utils.db import get_cursor

KEY_PREFIX = 'bdc_live_'


def _hash(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()


class ApiKeyModel:
    """외부 연동 API 키 — 키 하나 = 계정 하나. 원본키는 SHA-256 해시만 저장."""

    @staticmethod
    def create(user_id: int, label: str = None):
        """새 키 발급. 원본키는 반환만 하고 저장하지 않는다.

        반환: {'id', 'raw_key', 'key_prefix'} — raw_key 는 이 시점에만 확인 가능.
        """
        raw_key = KEY_PREFIX + secrets.token_hex(32)
        key_hash = _hash(raw_key)
        # 식별용 접두: bdc_live_ + 앞 8자
        prefix = raw_key[:len(KEY_PREFIX) + 8]
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "INSERT INTO api_keys (user_id, key_hash, key_prefix, label) "
                "VALUES (%s, %s, %s, %s)",
                (user_id, key_hash, prefix, label or None)
            )
            conn.commit()
            key_id = cursor.lastrowid
        return {'id': key_id, 'raw_key': raw_key, 'key_prefix': prefix}

    @staticmethod
    def find_owner_by_raw(raw_key: str):
        """원본키로 소유자 조회. active=1 일 때만 소유자 dict 반환, 아니면 None."""
        if not raw_key:
            return None
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT k.id AS key_id, u.id, u.username, u.role "
                "FROM api_keys k JOIN users u ON u.id = k.user_id "
                "WHERE k.key_hash = %s AND k.active = 1",
                (_hash(raw_key),)
            )
            row = cursor.fetchone()
        if not row:
            return None
        return {'key_id': row['key_id'], 'id': row['id'],
                'username': row['username'], 'role': row['role']}

    @staticmethod
    def list_for_user(user_id: int):
        """계정의 키 목록 (원본키/해시는 반환하지 않음)."""
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT id, key_prefix, label, active, last_used_at, created_at "
                "FROM api_keys WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,)
            )
            rows = cursor.fetchall()
        for r in rows:
            for key in ('last_used_at', 'created_at'):
                if r.get(key):
                    r[key] = str(r[key])
        return rows

    @staticmethod
    def revoke(key_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute("UPDATE api_keys SET active = 0 WHERE id = %s", (key_id,))
            conn.commit()
            return cursor.rowcount

    @staticmethod
    def touch_last_used(key_id: int):
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = %s",
                (key_id,)
            )
            conn.commit()
