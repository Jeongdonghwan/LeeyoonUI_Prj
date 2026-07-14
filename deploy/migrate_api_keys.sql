-- 외부 연동 API 키 테이블 추가 (키 하나 = 계정 하나)
-- 실행: mariadb -u root -p1234 -h 127.0.0.1 bukdoo_db < /var/www/bukdoo/deploy/migrate_api_keys.sql
CREATE TABLE IF NOT EXISTS api_keys (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  key_hash     CHAR(64) NOT NULL UNIQUE,
  key_prefix   VARCHAR(20) NOT NULL,
  label        VARCHAR(100) NULL,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  last_used_at DATETIME NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
