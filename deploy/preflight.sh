#!/usr/bin/env bash
# 배포 전 서버 점검 — 충돌/여유 확인. 실행: sudo bash deploy/preflight.sh
echo "===== 북두칠성 배포 전 점검 ====="

echo "[포트 8100]"
if ss -tlnp 2>/dev/null | grep -q ':8100 '; then
  echo "  ✗ 8100 이미 사용중 → gunicorn.conf.py / nginx / systemd 포트를 다른 값으로 변경 필요"
else
  echo "  ✓ 8100 비어있음 (사용 가능)"
fi

echo "[MariaDB]"
systemctl is-active --quiet mariadb && echo "  ✓ mariadb 실행중" || echo "  ✗ mariadb 미실행"

echo "[reward_db 존재여부]"
if mysql -N -e "SHOW DATABASES LIKE 'reward_db';" 2>/dev/null | grep -q reward_db; then
  echo "  ⚠ reward_db 이미 존재 — 기존 데이터 확인 후 진행"
else
  echo "  ✓ reward_db 없음 (신규 생성 예정)"
fi

echo "[런타임]"
echo "  node   $(node -v 2>/dev/null || echo '없음')"
echo "  python $(python3 --version 2>/dev/null || echo '없음')"
echo "  nginx  $(nginx -v 2>&1 | head -1)"

echo "[여유 자원]"
free -h | awk '/Mem:/{print "  RAM available: "$7}'
df -h / | awk 'NR==2{print "  Disk avail: "$4" (사용 "$5")"}'

echo "[/var/www/bukdoo 존재여부]"
[ -d /var/www/bukdoo ] && echo "  ⚠ 이미 존재" || echo "  ✓ 없음 (신규)"
echo "===== 점검 끝 ====="
