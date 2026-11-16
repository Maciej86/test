#!/usr/bin/env bash
# =============================================================================
#  KOPIA ZAPASOWA na serwerze: baza i pliki od użytkowników, zaszyfrowane, wysłane do OVH Object Storage z blokadą
#  usunięcia. Uruchamia timer systemd app-backup.timer (godziny: BACKUP_SLOTS). Ręcznie:
#      sudo systemctl start app-backup.service
#  Kolejno: flock → zrzut bazy | gzip | age i pliki | age (strumieniem: odszyfrowana treść nie leży na dysku) →
#  kontrola kompletności → wysyłka do OVH z blokadą COMPLIANCE → porządki → wiersz w backup_runs.
#  Zmienne: BACKUP_ENV_FILE (domyślnie ~/backup.env), DRY_RUN=1 (bez wysyłki), FAKE_DUMP_FAIL=1 (test awarii),
#  BACKUP_WAIT=1 (czekaj na trwający przebieg; używa tego scripts/deploy.sh).
# =============================================================================
set -uo pipefail
export MSYS_NO_PATHCONV=1

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$APP_DIR"
ENV_FILE="${BACKUP_ENV_FILE:-$HOME/backup.env}"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
: "${BACKUP_LOCAL_DIR:?}" "${BACKUP_AGE_PUBLIC_KEY:?}" "${BACKUP_S3_ENDPOINT:?}" "${BACKUP_S3_REGION:?}" "${BACKUP_S3_BUCKET:?}"
mkdir -p "$BACKUP_LOCAL_DIR"; chmod 700 "$BACKUP_LOCAL_DIR"
LOG="$BACKUP_LOCAL_DIR/backup.log"
COMPOSE=(docker compose -f docker-compose.prod.yml)
PROJECT="${COMPOSE_PROJECT_NAME:-$(basename "$APP_DIR" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')}"
AWS=(docker run --rm -i --env-file "$ENV_FILE" -v "$BACKUP_LOCAL_DIR:/b:ro" amazon/aws-cli
  --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION")

log() { echo "$(date -u '+%F %T') $*" >> "$LOG"; }
# Tylko nasze kody + oczyszczona pierwsza linia błędu: bez cudzysłowów, średników i nowych linii (INSERT niżej).
sanitize_error() { head -n1 | tr -cd '[:alnum:] ._:/()=-' | cut -c1-400; }
# Hasło do bazy zostaje w kontenerze MySQL (jego własna zmienna): nie ma go w poleceniu ani w `ps` serwera.
in_mysql() { "${COMPOSE[@]}" exec -T mysql sh -c "MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" exec $1"; }

WORK="$(mktemp -d)"; chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT

# Rodzaj kopii, nazwy plików i termin ochrony: backend/src/backups/schedule.ts (jedno źródło, z testami).
if ! PLAN="$(docker run --rm -v "$APP_DIR/backend:/b:ro" node:24-alpine node /b/src/backups/schedule.ts plan 2> "$WORK/plan.err")"; then
  log "FAILED plan: $(sanitize_error < "$WORK/plan.err")"; exit 1
fi
eval "$PLAN"   # KIND, DB_KEY, FILES_KEY, RETAIN_UNTIL, STARTED_AT

record() { # status dump_ok upload_ok size error
  local err="NULL"; [ -n "$5" ] && err="'$5'"
  local size="${4:-NULL}"; [ -z "$size" ] && size="NULL"
  if ! printf "INSERT INTO backup_runs (started_at, finished_at, kind, status, dump_ok, upload_ok, size_bytes, object_key, retain_until, error)
      VALUES ('%s', UTC_TIMESTAMP(), '%s', '%s', %s, %s, %s, '%s', STR_TO_DATE('%s', '%%Y-%%m-%%dT%%H:%%i:%%sZ'), %s);\n" \
      "${STARTED_AT/_/ }" "$KIND" "$1" "$2" "$3" "$size" "$DB_KEY" "$RETAIN_UNTIL" "$err" \
    | in_mysql 'mysql -uroot "$MYSQL_DATABASE"' 2>> "$LOG"; then
    log "RECORD_FAILED status=$1 kind=$KIND key=$DB_KEY error=$5"
  fi
}

exec 9> "$BACKUP_LOCAL_DIR/.lock"
# BACKUP_WAIT=1 (kopia przed wdrożeniem): czekaj na trwający przebieg zamiast go pomijać. Pominięty przebieg kończy się
# kodem 0, więc wdrożenie uznałoby go za zrobioną kopię.
if [ "${BACKUP_WAIT:-}" = "1" ]; then
  flock -w 900 9 || { log "FAILED lock_timeout"; record failed NULL NULL "" "lock_timeout"; exit 1; }
elif ! flock -n 9; then log "skipped: poprzedni przebieg trwa"; record skipped NULL NULL "" "lock_busy"; exit 0; fi
log "start kind=$KIND key=$DB_KEY"

DB_OUT="$BACKUP_LOCAL_DIR/$(basename "$DB_KEY")"
FILES_OUT="$BACKUP_LOCAL_DIR/$(basename "$FILES_KEY")"
fail_dump() { rm -f "$DB_OUT" "$FILES_OUT"; log "FAILED $1"; record failed 0 NULL "" "$1"; exit 1; }

# 1. Baza → gzip → tee: (a) age do pliku, (b) kontrola z łącza nazwanego (FIFO nie trzyma danych na dysku):
#    gzip -dc sprawdza integralność, tail bierze ostatnią linię. Na dysk trafia tylko wynik kontroli, nigdy linia
#    zrzutu: przy uciętym zrzucie byłby nią fragment INSERT-a z danymi klientów.
DUMP='mysqldump -uroot --single-transaction --routines --triggers --events --no-tablespaces "$MYSQL_DATABASE"'
[ "${FAKE_DUMP_FAIL:-}" = "1" ] && DUMP='sh -c "echo -- częściowy zrzut; exit 2"'
mkfifo -m 600 "$WORK/db.fifo"
( gzip -dc < "$WORK/db.fifo" | tail -n 1 | grep -q '^-- Dump completed'
  s=("${PIPESTATUS[@]}"); [ "${s[0]}" = "0" ] && [ "${s[2]}" = "0" ] ) &
CHECK=$!
in_mysql "$DUMP" 2> "$WORK/dump.err" | gzip -c | tee "$WORK/db.fifo" | age -r "$BACKUP_AGE_PUBLIC_KEY" -o "$DB_OUT" 2>> "$WORK/dump.err"
codes=("${PIPESTATUS[@]}")
wait "$CHECK"; check=$?
if [ "${codes[0]}" != "0" ] || [ "${codes[3]}" != "0" ] || [ "$check" != "0" ] || [ ! -s "$DB_OUT" ]; then
  fail_dump "dump_incomplete: $(sanitize_error < "$WORK/dump.err")"
fi

# 2. Pliki od użytkowników prosto z wolumenu Dockera (działa także, gdy backend leży albo się przebudowuje).
VOLUME="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT" --filter "label=com.docker.compose.volume=uploads_data")"
[ -n "$VOLUME" ] || fail_dump "uploads_volume_missing: $PROJECT"
mkfifo -m 600 "$WORK/files.fifo"
( gzip -t < "$WORK/files.fifo" ) &
CHECK=$!
docker run --rm -v "$VOLUME:/u:ro" alpine:3 tar -czf - -C /u . 2> "$WORK/files.err" \
  | tee "$WORK/files.fifo" | age -r "$BACKUP_AGE_PUBLIC_KEY" -o "$FILES_OUT" 2>> "$WORK/files.err"
codes=("${PIPESTATUS[@]}")
wait "$CHECK"; check=$?
if [ "${codes[0]}" != "0" ] || [ "${codes[2]}" != "0" ] || [ "$check" != "0" ] || [ ! -s "$FILES_OUT" ]; then
  fail_dump "files_incomplete: $(sanitize_error < "$WORK/files.err")"
fi
SIZE=$(( $(stat -c %s "$DB_OUT") + $(stat -c %s "$FILES_OUT") ))

# 3. Wysyłka z blokadą COMPLIANCE: nikt, także administrator konta OVH, nie usunie wersji przed RETAIN_UNTIL.
#    Przebieg próbny to `skipped` z `dry_run`, nie `success`: success znaczy „kopia jest poza serwerem”, a próba
#    liczona jako sukces uciszyłaby alarm, choć poza serwerem nic nie ma.
if [ "${DRY_RUN:-}" = "1" ]; then
  log "DRY_RUN: bez wysyłki, $DB_OUT $FILES_OUT ($SIZE B)"; record skipped 1 NULL "$SIZE" "dry_run"; exit 0
fi
for pair in "$DB_KEY:$DB_OUT" "$FILES_KEY:$FILES_OUT"; do
  key="${pair%%:*}"; file="${pair#*:}"
  if ! "${AWS[@]}" s3api put-object --bucket "$BACKUP_S3_BUCKET" --key "$key" --body "/b/$(basename "$file")" \
       --object-lock-mode COMPLIANCE --object-lock-retain-until-date "$RETAIN_UNTIL" \
       > /dev/null 2> "$WORK/upload.err"; then
    err="upload_failed: $(sanitize_error < "$WORK/upload.err")"
    log "FAILED $err (pliki zostają lokalnie: $DB_OUT $FILES_OUT)"; record failed 1 0 "$SIZE" "$err"; exit 1
  fi
done

# 4. Porządki. Błąd tu NIE psuje przebiegu (kopia jest już bezpieczna w OVH), trafia tylko do logu.
find "$BACKUP_LOCAL_DIR" -maxdepth 1 -name '*.age' -mmin +2880 -delete
"${AWS[@]}" s3api list-object-versions --bucket "$BACKUP_S3_BUCKET" --output json 2>> "$LOG" \
  | docker run --rm -i -v "$APP_DIR/backend:/b:ro" node:24-alpine node /b/src/backups/schedule.ts expired 2>> "$LOG" \
  | while IFS=$'\t' read -r key version; do
      "${AWS[@]}" s3api delete-object --bucket "$BACKUP_S3_BUCKET" --key "$key" --version-id "$version" \
        > /dev/null 2>> "$LOG" && log "usunięto po terminie: $key" || log "nie usunięto: $key"
    done

log "OK $DB_KEY $FILES_KEY ($SIZE B)"
record success 1 1 "$SIZE" ""
exit 0
