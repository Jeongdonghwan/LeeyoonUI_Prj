-- 북두칠성 길찾기(bdcnav) 상품 추가: product_type ENUM 확장
-- 실행: mariadb -u root -p1234 -h 127.0.0.1 bukdoo_db < /var/www/bukdoo/deploy/migrate_add_bdcnav.sql
ALTER TABLE campaigns     MODIFY product_type ENUM('bdc1','bdc2','bdc3','bdcnav') NOT NULL DEFAULT 'bdc1';
ALTER TABLE campaign_logs MODIFY product_type ENUM('bdc1','bdc2','bdc3','bdcnav') NULL;
