-- 광고주(개인)별 상품 단가 테이블 추가
-- 실행: mariadb -u root -p1234 -h 127.0.0.1 bukdoo_db < /var/www/bukdoo/deploy/migrate_user_prices.sql
CREATE TABLE IF NOT EXISTS user_prices (
  user_id      INT NOT NULL,
  product_type ENUM('bdc1','bdc2','bdc3','bdcnav') NOT NULL,
  price        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, product_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
