CREATE DATABASE IF NOT EXISTS reward_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reward_db;

-- ============================================================
-- 사용자 (관리자 / 총판 / 대행사 / 광고주)
-- agency(대행사)는 이름만 대행사이고 권한은 user(광고주)와 동일한 리프 노드
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'distributor', 'agency', 'user') NOT NULL DEFAULT 'user',
  parent_id     INT NULL,
  company       VARCHAR(100) NULL,
  memo          TEXT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 캠페인 (기존 슬롯 대체) — 북두칠성1/2/3 상품
--   bdc1, bdc3 = 접수형(일타수 × 구동일수)
--   bdc2       = 일자별형(D-1~D-7 합산, campaign_days 참조)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  created_by    INT NOT NULL,
  product_type  ENUM('bdc1', 'bdc2', 'bdc3', 'bdcnav') NOT NULL DEFAULT 'bdc1',
  status        ENUM('pending', 'active', 'error', 'expired') NOT NULL DEFAULT 'pending',
  place_name    VARCHAR(255) NULL,       -- 플레이스 업체명 / 업체명
  keyword_main  VARCHAR(255) NULL,       -- 메인키워드
  place_url     TEXT NULL,               -- url(모바일) / 플레이스 링크
  intake_date   DATE NULL,               -- 접수일 (B형)
  start_date    DATE NULL,               -- 구동시작일 / 시작일
  end_date      DATE NULL,               -- 만료일
  daily_ta      INT NULL,                -- 일타수 (A형)
  run_days      INT NULL,                -- 구동일수 (A형)
  total_ta      INT NULL DEFAULT 0,      -- 총타수 / 총작업량 (자동계산)
  memo          TEXT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 포맷 B(북두칠성2) 일자별 작업량 D-1 ~ D-N
CREATE TABLE IF NOT EXISTS campaign_days (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id  INT NOT NULL,
  day_no       INT NOT NULL,            -- 1 = D-1
  ta           INT NOT NULL DEFAULT 0,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================
-- 캠페인 로그 (등록/수정/삭제)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_logs (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  type           ENUM('등록', '수정', '삭제') NOT NULL,
  user_id        INT NOT NULL,           -- 캠페인 소유자
  campaign_id    INT NULL,
  modified_by    INT NULL,               -- 작업 수행자
  product_type   ENUM('bdc1', 'bdc2', 'bdc3', 'bdcnav') NULL,
  total_ta       INT NOT NULL DEFAULT 0, -- 총타수
  period_days    INT NOT NULL DEFAULT 0, -- 구동일수
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  job_start_date DATE NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 수정 로그의 필드별 변경 상세
CREATE TABLE IF NOT EXISTS campaign_change_details (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  log_id      INT NOT NULL,
  campaign_id INT NOT NULL,
  field_name  VARCHAR(50) NOT NULL,
  old_value   TEXT NULL,
  new_value   TEXT NULL,
  FOREIGN KEY (log_id) REFERENCES campaign_logs(id) ON DELETE CASCADE
);

-- ============================================================
-- 공지사항
-- ============================================================
CREATE TABLE IF NOT EXISTS notices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  content     TEXT NULL,
  pinned      TINYINT(1) NOT NULL DEFAULT 0,
  created_by  INT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 광고주(개인)별 상품 단가 — 계정마다 상품별 단가 설정
-- ============================================================
CREATE TABLE IF NOT EXISTS user_prices (
  user_id      INT NOT NULL,
  product_type ENUM('bdc1', 'bdc2', 'bdc3', 'bdcnav') NOT NULL,
  price        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, product_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 기본 admin 계정 (비밀번호: admin1234)
INSERT IGNORE INTO users (username, password_hash, role) VALUES
('admin', '$2b$12$K7zzp9KQOOVgSqW6rmvNfePmAAE3AJCetnFtZmb0VVGbx0hn7Bf0G', 'admin');
