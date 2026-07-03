# 북두칠성 백엔드 gunicorn 설정
# 실행: gunicorn -c gunicorn.conf.py "app:create_app()"
bind = "127.0.0.1:8100"   # ★ 서버에서 5001은 이미 사용중 → 8100 사용
workers = 3               # 6코어 공용 서버 기준 3워커면 충분
timeout = 120             # 엑셀 업로드/다운로드 여유
accesslog = "/var/www/bukdoo/logs/access.log"
errorlog = "/var/www/bukdoo/logs/error.log"
loglevel = "info"
