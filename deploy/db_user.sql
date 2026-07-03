-- root(관리자)로 실행: sudo mariadb < deploy/db_user.sql
-- reward_db 스키마는 backend/init.sql 로 먼저 생성한다.
-- 공용 서버라 root 대신 전용 계정을 만든다.

CREATE USER IF NOT EXISTS 'bukdoo'@'localhost' IDENTIFIED BY 'CHANGE_ME_강력한_비밀번호';
GRANT ALL PRIVILEGES ON reward_db.* TO 'bukdoo'@'localhost';
FLUSH PRIVILEGES;
