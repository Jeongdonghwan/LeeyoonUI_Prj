from typing import Optional

import bcrypt
from utils.db import get_cursor


class UserModel:

    @staticmethod
    def find_by_username(username: str) -> Optional[dict]:
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT id, username, password_hash, role, parent_id, company, memo, created_at "
                "FROM users WHERE username = %s",
                (username,)
            )
            return cursor.fetchone()

    @staticmethod
    def find_by_id(user_id: int) -> Optional[dict]:
        with get_cursor() as (cursor, conn):
            cursor.execute(
                "SELECT id, username, role, parent_id, company, memo, created_at "
                "FROM users WHERE id = %s",
                (user_id,)
            )
            return cursor.fetchone()

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )

    @staticmethod
    def hash_password(plain_password: str) -> str:
        return bcrypt.hashpw(
            plain_password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
