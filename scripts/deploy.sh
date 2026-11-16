#!/usr/bin/env bash
# =============================================================================
#  WDROŻENIE: nowa wersja z gałęzi main na GitHubie trafia na ten serwer. Uruchamiane NA SERWERZE, w ~/app:
#    - przez Claude'a: ssh … app@<IP> '~/app/scripts/deploy.sh' (wariant „z komputera”),
#    - przez GitHub Actions: przycisk Actions → Wdróż (wariant „z GitHuba”, .github/workflows/deploy.yml).
#  Testy (npm run check, npm audit) idą wcześniej: na komputerze albo w GitHub Actions.
#  Kolejno: kopia przed wdrożeniem → git pull (tylko fast-forward) → front → kontenery → migracje → test dymny.
#  Nieudany test dymny: bez nowych migracji powrót do poprzedniej wersji (kod 1); z nowymi migracjami stop (kod 2),
#  bo cofania bazy nie robimy automatycznie: kopia sprzed wdrożenia jest gotowa do odtworzenia.
#  Zmienne: SKIP_BACKUP=1 (tylko gdy kopie nie są jeszcze ustawione), SMOKE_TRIES (domyślnie 30, co 2 s).
# =============================================================================
set -uo pipefail
export MSYS_NO_PATHCONV=1

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"
COMPOSE=(docker compose -f docker-compose.prod.yml)
LOG="$HOME/deploy.log"
SMOKE_TRIES="${SMOKE_TRIES:-30}"
DOMAIN="$(grep -E '^DOMAIN=' .env | head -n1 | cut -d= -f2-)"

say() { echo "$*"; echo "$(date -u '+%F %T') $*" >> "$LOG"; }
die() { say "BŁĄD: $1"; exit "${2:-1}"; }

exec 8> "$HOME/.deploy.lock"
flock -n 8 || die "inne wdrożenie właśnie trwa"
[ -n "$DOMAIN" ] || die "brak DOMAIN w .env"

build_and_start() {
  docker run --rm -v "$APP_DIR":/app -w /app node:24-alpine sh -c "npm ci && npm run build" > "$HOME/deploy-build.log" 2>&1 \
    || { say "budowa frontu nie powiodła się (szczegóły: ~/deploy-build.log)"; return 1; }
  "${COMPOSE[@]}" up -d --build >> "$HOME/deploy-build.log" 2>&1 || { say "start kontenerów nie powiódł się"; return 1; }
}

smoke() {
  for _ in $(seq 1 "$SMOKE_TRIES"); do
    if curl -fsS --max-time 5 "https://$DOMAIN/api/health" > /dev/null 2>&1 \
      && curl -fsS --max-time 5 "https://$DOMAIN/api/health/db" > /dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

PREV="$(git rev-parse HEAD)"
git fetch -q origin main || die "nie udało się pobrać zmian z GitHuba"
NEXT="$(git rev-parse origin/main)"
if [ "$PREV" = "$NEXT" ]; then say "Na serwerze jest już najnowsza wersja ($(git log -1 --format='%h %s'))."; exit 0; fi
git diff --quiet HEAD && git merge-base --is-ancestor HEAD "$NEXT" \
  || die "kod na serwerze różni się od GitHuba (ktoś zmieniał pliki na serwerze); nic nie zmieniłem"
NEW_MIGRATIONS="$(git diff --name-only "$PREV" "$NEXT" -- backend/migrations/)"
say "Wdrażam $(git log -1 --format='%h %s' "$NEXT") (poprzednio ${PREV:0:7})."

# 1. Kopia przed wdrożeniem: bez niej migracja, która zepsuje dane, nie ma się do czego cofnąć.
if [ "${SKIP_BACKUP:-}" = "1" ]; then
  say "UWAGA: wdrożenie bez kopii (SKIP_BACKUP=1)."
elif [ ! -f "$HOME/backup.env" ]; then
  die "kopie zapasowe nie są ustawione (~/backup.env); wdrożenie bez kopii tylko z SKIP_BACKUP=1"
else
  BACKUP_WAIT=1 "$APP_DIR/scripts/backup/backup.sh" || die "kopia przed wdrożeniem nie powiodła się (~/backups/backup.log); nic nie zmieniłem"
  BACKUP_DIR="$(grep -E '^BACKUP_LOCAL_DIR=' "$HOME/backup.env" | cut -d= -f2-)"
  say "Kopia przed wdrożeniem: $(grep ' OK ' "${BACKUP_DIR:-$HOME/backups}/backup.log" | tail -n1 | cut -d' ' -f4)"
fi

# 2. Kod, front, kontenery, migracje.
git merge -q --ff-only "$NEXT" || die "nie udało się przejść na nową wersję kodu; nic nie zmieniłem"
FAILED=""
build_and_start || FAILED="build"
if [ -z "$FAILED" ]; then
  "${COMPOSE[@]}" exec -T backend npm run migrate -w @app/backend >> "$LOG" 2>&1 || FAILED="migrate"
fi
if [ -z "$FAILED" ]; then smoke || FAILED="smoke"; fi
if [ -z "$FAILED" ]; then say "OK: nowa wersja działa na https://$DOMAIN"; exit 0; fi

# 3. Coś poszło nie tak.
if [ -n "$NEW_MIGRATIONS" ]; then
  say "STOP ($FAILED): ta wersja zmienia bazę, więc nie cofam jej automatycznie. Kopia sprzed wdrożenia jest w OVH."
  say "Nowe migracje: $(echo "$NEW_MIGRATIONS" | tr '\n' ' ')"
  exit 2
fi
say "Nie udało się ($FAILED). Wracam do poprzedniej wersji ${PREV:0:7}."
git reset -q --hard "$PREV"
if build_and_start && smoke; then
  say "Przywrócona poprzednia wersja działa. Nowej trzeba poprawić i wgrać ponownie."
else
  say "Poprzednia wersja też nie wstała: potrzebna pomoc (logi: docker compose -f docker-compose.prod.yml logs backend)."
fi
exit 1
