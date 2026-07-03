# 북두칠성 배포 가이드 (Ubuntu 22.04 · 다중 사이트 공용 서버)

이 서버는 이미 여러 사이트(ilioom·kidc·rank1·marketing_jungseok 등)가 gunicorn+nginx로 돌고 있다.
아래 값은 **충돌 안 나게** 확인된 것들이다.

| 항목 | 값 | 이유 |
|------|----|------|
| 백엔드 포트 | **8100** | 5000·5001·8001·8080·8091 이미 사용중 → 8100 비어있음 |
| 설치 경로 | `/var/www/bukdoo` | 기존 `/var/www/*` 패턴과 동일 |
| DB | 기존 MariaDB에 `reward_db` + 전용계정 `bukdoo` | 재설치 불필요 |
| 웹 | 기존 nginx에 **server_name 으로 구분된 server 블록 추가** | 80/443 공유, 도메인으로 분리 |
| 실행유저 | `www-data` | kidc·rank1과 동일(최소권한) |

> **먼저 `sudo bash deploy/preflight.sh` 실행**해서 8100 비어있음/reward_db 없음/여유자원을 확인할 것.

도메인: **thundersui.com** (www 포함). DNS A레코드로 `thundersui.com` 과 `www.thundersui.com` 을 이 서버 IP에 연결해 둘 것.

---

## 1) 코드 배치
```bash
sudo mkdir -p /var/www/bukdoo /var/www/bukdoo/logs
sudo git clone https://github.com/Jeongdonghwan/LeeyoonUI_Prj.git /var/www/bukdoo
#   (private 저장소면 deploy key 또는 token 사용. 또는 로컬에서 rsync 업로드)
```

## 2) 백엔드 (venv + gunicorn)
```bash
cd /var/www/bukdoo/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt      # gunicorn 포함됨
cp /var/www/bukdoo/deploy/gunicorn.conf.py ./gunicorn.conf.py
```

## 3) 환경변수 (.env)
```bash
cp /var/www/bukdoo/deploy/env.production.example /var/www/bukdoo/backend/.env
# JWT 시크릿 생성해서 .env 에 붙여넣기
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
nano /var/www/bukdoo/backend/.env       # DB_PASSWORD, JWT_SECRET_KEY, CORS_ORIGINS(도메인) 채우기
```

## 4) DB 생성 (기존 MariaDB 재사용)
```bash
# 스키마+admin 시드 (root로)  ※ init.sql 은 한글 ENUM 있으니 utf8mb4
sudo mariadb --default-character-set=utf8mb4 < /var/www/bukdoo/backend/init.sql
# 전용 계정 (db_user.sql 안의 비밀번호를 .env DB_PASSWORD 와 동일하게 먼저 수정)
nano /var/www/bukdoo/deploy/db_user.sql
sudo mariadb < /var/www/bukdoo/deploy/db_user.sql
# 접속 확인
mysql -u bukdoo -p reward_db -e "SHOW TABLES;"
```
기본 관리자: **admin / admin1234** (배포 후 즉시 비밀번호 변경 권장).

## 5) 프론트 빌드 (정적 파일 생성)
```bash
cd /var/www/bukdoo/frontend
npm ci
npm run build        # → dist/ 생성 (node가 잠깐 ~1GB, swap 있어 안전)
```
> 서버 부하가 신경쓰이면: **로컬 PC에서 `npm run build` 후 `dist/` 만 서버 `/var/www/bukdoo/frontend/dist/` 로 업로드**해도 됨.

## 6) 권한 정리
```bash
sudo chown -R www-data:www-data /var/www/bukdoo
```

## 7) 백엔드 서비스 등록 (systemd)
```bash
sudo cp /var/www/bukdoo/deploy/bukdoo-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bukdoo-backend
sudo systemctl status bukdoo-backend --no-pager
# 헬스체크 (localhost)
curl -s http://127.0.0.1:8100/api/health
```
`{"success":true,...healthy...}` 나오면 OK.

## 8) nginx (server 블록 추가) — thundersui.com
```bash
sudo cp /var/www/bukdoo/deploy/nginx-bukdoo.conf /etc/nginx/sites-available/thundersui
sudo ln -s /etc/nginx/sites-available/thundersui /etc/nginx/sites-enabled/

# SSL 발급 (certbot). 없으면: sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d thundersui.com -d www.thundersui.com   # 인증서 경로 자동 설정

sudo nginx -t && sudo systemctl reload nginx
```
> ⚠ certbot 실행 전에 DNS(A레코드)가 이미 서버 IP로 전파돼 있어야 발급됩니다.
> certbot 없이 http로만 먼저 띄우려면: nginx-bukdoo.conf 의 443/ssl 블록 대신 80에서 바로 서빙하고,
> `.env` 의 `FLASK_ENV` 를 production 이 **아닌** 값으로 두어야 함(안 그러면 Secure 쿠키라 http에서 로그인 유지 안 됨). **운영은 HTTPS 권장.**

## 9) 최종 확인
- 브라우저 `https://thundersui.com` → 별자리 로그인 화면
- admin / admin1234 로그인 → 캠페인/계정/공지 정상
- 엑셀 업로드/다운로드 정상 (nginx `client_max_body_size 20M` 반영됨)

---

## 재배포(업데이트) 절차
```bash
cd /var/www/bukdoo && sudo git pull
# 백엔드 의존성 변경 시
sudo -u www-data ./backend/venv/bin/pip install -r backend/requirements.txt
# 프론트 변경 시
cd frontend && sudo -u www-data npm ci && sudo -u www-data npm run build
# DB 스키마 변경 시 (init.sql 은 CREATE TABLE IF NOT EXISTS 라 안전)
sudo mariadb --default-character-set=utf8mb4 < /var/www/bukdoo/backend/init.sql
# 백엔드 재시작
sudo systemctl restart bukdoo-backend
```

## 로그 / 트러블슈팅
```bash
sudo journalctl -u bukdoo-backend -n 50 --no-pager   # 서비스 로그
tail -f /var/www/bukdoo/logs/error.log               # gunicorn 에러
sudo tail -f /var/log/nginx/error.log                # nginx 에러
```
- 500 + DB 연결 오류 → `.env` 의 DB_USER/PASSWORD/NAME 확인, `mysql -u bukdoo -p` 접속 테스트
- 로그인은 되는데 새로고침 시 풀림 → HTTPS 아님 + FLASK_ENV=production(Secure 쿠키). HTTPS 적용 또는 FLASK_ENV 조정
- 404 on refresh(딥링크) → nginx `try_files ... /index.html` 누락 확인
