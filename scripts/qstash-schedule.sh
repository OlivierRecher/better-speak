#!/usr/bin/env bash
# Planification QStash qui réveille /api/send toutes les 5 minutes — idempotente.
#
#   QSTASH_TOKEN=... ./scripts/qstash-schedule.sh --list                    # lecture seule
#   QSTASH_TOKEN=... ./scripts/qstash-schedule.sh https://ton-app.vercel.app            # crée si absente
#   QSTASH_TOKEN=... ./scripts/qstash-schedule.sh --replace https://ton-app.vercel.app  # remet UNE seule planification
#
# Il ne doit exister qu'UNE planification vers /api/send : chaque copie (script relancé,
# ancienne URL, déploiement de preview) appelle /api/send en même temps que les autres et
# consomme le quota gratuit de QStash (288 appels/jour par planification).
# La planification porte l'identifiant fixe « clair-send » : la recréer la met à jour.
set -euo pipefail

MODE=create
case "${1:-}" in
  --list) MODE=list; shift ;;
  --replace) MODE=replace; shift ;;
esac
: "${QSTASH_TOKEN:?définis QSTASH_TOKEN (console Upstash › QStash)}"
QSTASH_URL="${QSTASH_URL:-https://qstash.upstash.io}"
SCHEDULE_ID="clair-send"
CRON="*/5 * * * *"

api() { curl -sS --fail-with-body -H "Authorization: Bearer $QSTASH_TOKEN" "$@"; }

# planifications existantes qui visent un /api/send (toutes URL confondues)
list_send() {
  api "$QSTASH_URL/v2/schedules" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      const all = JSON.parse(s || "[]");
      for (const x of all.filter(x => /\/api\/send\/?$/.test(x.destination || "")))
        console.log([x.scheduleId, x.destination, x.cron, x.isPaused ? "en-pause" : "active", x.retries ?? "?",
          new Date(x.createdAt).toISOString()].join("\t"));
    });'
}

EXISTING="$(list_send)"
COUNT=$(printf '%s' "$EXISTING" | grep -c . || true)
echo "Planifications vers /api/send : $COUNT"
if [ "$COUNT" -gt 0 ]; then printf 'id\tdestination\tcron\tétat\tessais\tcréée le\n'; printf '%s\n' "$EXISTING"; fi
[ "$MODE" = list ] && exit 0

APP_URL="${1:?URL de l’app déployée (production), ex. https://clair.vercel.app}"
APP_URL="${APP_URL%/}"
DEST="$APP_URL/api/send"

GOOD=$(printf '%s\n' "$EXISTING" | awk -F'\t' -v d="$DEST" -v c="$CRON" '$2==d && $3==c && $4=="active"' | grep -c . || true)
OTHERS=$(printf '%s\n' "$EXISTING" | awk -F'\t' -v d="$DEST" -v c="$CRON" 'NF && !($2==d && $3==c && $4=="active")' | grep -c . || true)

if [ "$MODE" = create ]; then
  if [ "$GOOD" -eq 1 ] && [ "$OTHERS" -eq 0 ]; then
    echo "Déjà en place : une seule planification vers $DEST. Rien à faire."
    exit 0
  fi
  if [ "$COUNT" -gt 0 ]; then
    echo "Refusé : il existe déjà des planifications vers /api/send (doublons, autre URL ou en pause)." >&2
    echo "Relance avec --replace pour n'en garder qu'une seule vers $DEST." >&2
    exit 1
  fi
fi

# crée ou met à jour la planification « clair-send » (Upstash-Schedule-Id : pas de copie)
api -X POST "$QSTASH_URL/v2/schedules/$DEST" \
  -H "Upstash-Schedule-Id: $SCHEDULE_ID" \
  -H "Upstash-Cron: $CRON" \
  -H "Upstash-Retries: 1" \
  -H "Content-Type: application/json" \
  -d '{}' >/dev/null
echo "Planification « $SCHEDULE_ID » en place : $DEST toutes les 5 minutes."

if [ "$MODE" = replace ]; then
  printf '%s\n' "$EXISTING" | awk -F'\t' -v id="$SCHEDULE_ID" 'NF && $1!=id {print $1}' | while read -r sid; do
    api -X DELETE "$QSTASH_URL/v2/schedules/$sid" >/dev/null
    echo "Supprimée : $sid"
  done
fi
echo
list_send
