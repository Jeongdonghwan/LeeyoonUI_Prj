#!/usr/bin/env bash
# DB 스키마 + 전용계정(bukdoo) 생성.
# root 소켓접속이 되면 그대로, 안되면 -u root -p 로 재시도(비밀번호 입력).
# 사용법:
#   sudo bash /var/www/bukdoo/deploy/setup_db.sh <DB비밀번호>
# root 비번을 알고 소켓이 막혀있으면 자동으로 비번을 물어봅니다.
set -e
DBPW="${1:?사용법: sudo bash deploy/setup_db.sh <DB비밀번호>}"
APP=/var/www/bukdoo

# root 접속 방식 자동 판별
if mariadb -e "SELECT 1" >/dev/null 2>&1; then
  ROOT="mariadb"
  echo "[정보] MariaDB root 소켓접속 OK"
else
  echo "[정보] root 소켓접속 불가 → MariaDB root 비밀번호로 접속합니다 (아래에 입력)"
  ROOT="mariadb -u root -p"
fi

echo "== [1/2] 스키마 + admin 시드 =="
$ROOT --default-character-set=utf8mb4 < "$APP/backend/init.sql"

echo "== [2/2] 전용계정 생성 =="
$ROOT <<SQL
CREATE USER IF NOT EXISTS 'bukdoo'@'localhost' IDENTIFIED BY '$DBPW';
GRANT ALL PRIVILEGES ON reward_db.* TO 'bukdoo'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "== 접속 테스트 (bukdoo) =="
mysql -u bukdoo -p"$DBPW" reward_db -e "SHOW TABLES;"
echo "완료."
