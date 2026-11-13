#!/usr/bin/env bash
# Kopia zapasowa na serwerze: baza i pliki od użytkowników. Uruchamiana codziennie przez cron, zostawia 7 ostatnich kopii
# każdego rodzaju (db-*.sql.gz i files-*.tar.gz).
set -euo pipefail
cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP="${KEEP:-7}"
mkdir -p "$BACKUP_DIR"
set -a; source .env; set +a
STAMP="$(date +%Y-%m-%d_%H%M)"
COMPOSE="docker compose -f docker-compose.prod.yml"

FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
$COMPOSE exec -T mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines "$DB_NAME" | gzip > "$FILE"
echo "Kopia bazy: $FILE"

FILES="$BACKUP_DIR/files-$STAMP.tar.gz"
$COMPOSE exec -T backend sh -c 'mkdir -p /app/uploads && tar -czf - -C /app uploads' > "$FILES"
echo "Kopia plików: $FILES"

for kind in db files; do
  ls -1t "$BACKUP_DIR"/$kind-* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --
done
