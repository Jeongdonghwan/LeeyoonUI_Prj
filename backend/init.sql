CREATE DATABASE IF NOT EXISTS reward_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reward_db;

CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin', 'distributor', 'user') NOT NULL DEFAULT 'user',
  parent_id    INT NULL,
  company      VARCHAR(100) NULL,
  memo         TEXT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS slots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  status          ENUM('active', 'expired', 'pending') NOT NULL DEFAULT 'pending',
  created_by      INT NOT NULL,
  keyword_main    VARCHAR(255) NOT NULL,
  keyword_compare VARCHAR(255) NULL,
  product_url     TEXT NULL,
  product_id      VARCHAR(100) NULL,
  product_name    VARCHAR(255) NULL,
  compare_url     TEXT NULL,
  single_mid      VARCHAR(100) NULL,
  compare_mid     VARCHAR(100) NULL,
  start_date      DATE NULL,
  end_date        DATE NULL,
  quantity        INT NOT NULL DEFAULT 1,
  slot_type       INT NULL DEFAULT 100,
  memo            TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS slot_logs (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  type           ENUM('등록', '수정', '삭제') NOT NULL,
  user_id        INT NOT NULL,
  slot_id        INT NULL,
  modified_by    INT NULL,
  quantity       INT NOT NULL,
  slot_type      INT NULL,
  period_days    INT NOT NULL DEFAULT 0,
  daily_total    INT NOT NULL DEFAULT 0,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  job_start_date DATE NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS slot_change_details (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  log_id      INT NOT NULL,
  slot_id     INT NOT NULL,
  field_name  VARCHAR(50) NOT NULL,
  old_value   TEXT NULL,
  new_value   TEXT NULL,
  FOREIGN KEY (log_id) REFERENCES slot_logs(id) ON DELETE CASCADE
);

-- 기본 admin 계정 (비밀번호: admin1234)
INSERT IGNORE INTO users (username, password_hash, role) VALUES
('admin', '$2b$12$K7zzp9KQOOVgSqW6rmvNfePmAAE3AJCetnFtZmb0VVGbx0hn7Bf0G', 'admin');
