#!/usr/bin/env bash
# 앱 설치 (백엔드 venv + .env + 프론트 빌드 + systemd). DB 제외.
# 사용법: sudo bash /var/www/bukdoo/deploy/setup_app.sh <DB비밀번호>
set -e
DBPW="${1:?사용법: sudo bash deploy/setup_app.sh <DB비밀번호>}"
APP=/var/www/bukdoo

echo "== [1/5] 백엔드 venv + 패키지 =="
cd "$APP/backend"
python3 -m venv venv
./venv/bin/pip install -q --upgrade pip
./venv/bin/pip install -q -r requirements.txt
cp "$APP/deploy/gunicorn.conf.py" ./gunicorn.conf.py

echo "== [2/5] .env 생성 (JWT 자동) =="
JWT=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
cat > .env <<ENVEOF
FLASK_ENV=production
FLASK_DEBUG=False
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=bukdoo
DB_PASSWORD=$DBPW
DB_NAME=reward_db
JWT_SECRET_KEY=$JWT
CORS_ORIGINS=https://thundersui.com,https://www.thundersui.com
ENVEOF

echo "== [3/5] 프론트 빌드 =="
cd "$APP/frontend"
npm ci
npm run build

echo "== [4/5] 권한 + systemd =="
chown -R www-data:www-data "$APP"
cp "$APP/deploy/bukdoo-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now bukdoo-backend

echo "== [5/5] 상태 / 헬스체크 =="
sleep 2
systemctl --no-pager status bukdoo-backend | head -8
echo "----- health -----"
curl -s http://127.0.0.1:8100/api/health; echo
