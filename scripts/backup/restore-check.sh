#!/usr/bin/env bash
# Próbne odtworzenie kopii zapasowej. Uruchamiać NA KOMPUTERZE właściciela (potrzebny tylko Docker), nie na serwerze.
#   scripts/backup/restore-check.sh <…-db.sql.gz.age> <…-files.tar.gz.age> <plik-z-kluczem.key>
# Bazę wczytuje do osobnego, chwilowego kontenera MySQL (bazy z `npm run db` nie dotyka), wypisuje tabele z liczbą
# wierszy i liczbę plików w archiwum, potem usuwa kontener. Klucza nie wypisuje.
set -euo pipefail
export MSYS_NO_PATHCONV=1
DB_FILE="$1"; FILES_FILE="$2"; KEY_FILE="$3"
for f in "$DB_FILE" "$FILES_FILE" "$KEY_FILE"; do [ -s "$f" ] || { echo "Brak pliku: $f" >&2; exit 2; }; done

NAME="restore-check-$$"
PASS="$(od -An -tx1 -N16 /dev/urandom | tr -d ' \n')"
trap 'docker rm -f "$NAME" > /dev/null 2>&1 || true' EXIT
docker run -d --name "$NAME" -e MYSQL_ROOT_PASSWORD="$PASS" -e MYSQL_DATABASE=restore mysql:8.4 \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_polish_ci > /dev/null

# Odszyfrowanie w chwilowym kontenerze z age; klucz trafia do niego przez zmienną, nie przez polecenie.
AGE_KEY="$(cat "$KEY_FILE")"; export AGE_KEY
decrypt() {
  docker run --rm -i -e AGE_KEY alpine:3 sh -c \
    'apk add -q age > /dev/null && printf "%s\n" "$AGE_KEY" > /tmp/k && age -d -i /tmp/k && rm /tmp/k'
}

echo "Czekam na chwilową bazę…"
for _ in $(seq 1 60); do
  # Połączenie przez sieć: serwer startowy obrazu MySQL słucha tylko na gnieździe, więc ping przejdzie dopiero na właściwym.
  docker exec "$NAME" sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin -uroot -h127.0.0.1 ping' > /dev/null 2>&1 && break
  sleep 2
done

in_db() { docker exec -i "$NAME" sh -c "MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot -N restore $1"; }
decrypt < "$DB_FILE" | gzip -dc | in_db ''
echo "Tabela / wiersze:"
for t in $(in_db "-e 'SHOW TABLES'"); do
  printf '  %-30s %s\n' "$t" "$(in_db "-e 'SELECT COUNT(*) FROM \`$t\`'")"
done
echo "Pliki w archiwum: $(decrypt < "$FILES_FILE" | tar -tzf - | grep -vc '/$' || true)"
echo "OK: kopia daje się odszyfrować i wczytać."
