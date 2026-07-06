#!/usr/bin/env bash
# 원클릭 재배포: git pull → 프론트 빌드 → 권한 → 백엔드 재시작
# 사용법: sudo bash /var/www/bukdoo/deploy/update.sh
set -e
APP=/var/www/bukdoo

echo "== [1/4] git pull =="
cd "$APP"
git pull

echo "== [2/4] 프론트 빌드 =="
cd "$APP/frontend"
npm run build

echo "== [3/4] 권한 정리 =="
chown -R www-data:www-data "$APP"

echo "== [4/4] 백엔드 재시작 =="
systemctl restart bukdoo-backend
sleep 2
systemctl --no-pager status bukdoo-backend | head -5
echo "----- health -----"
curl -s http://127.0.0.1:8100/api/health; echo
echo "== 완료 =="
