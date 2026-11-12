#!/usr/bin/env bash
# Crée la planification QStash qui réveille /api/send toutes les 5 minutes.
# Usage : QSTASH_TOKEN=... ./scripts/qstash-schedule.sh https://ton-app.vercel.app
set -euo pipefail
APP_URL="${1:?URL de l'app déployée, ex. https://clair.vercel.app}"
: "${QSTASH_TOKEN:?définis QSTASH_TOKEN (console Upstash › QStash)}"
QSTASH_URL="${QSTASH_URL:-https://qstash.upstash.io}"

curl -sS -X POST "$QSTASH_URL/v2/schedules/$APP_URL/api/send" \
  -H "Authorization: Bearer $QSTASH_TOKEN" \
  -H "Upstash-Cron: */5 * * * *" \
  -H "Upstash-Retries: 1" \
  -H "Content-Type: application/json" \
  -d '{}'
echo
echo "Planification créée : $APP_URL/api/send toutes les 5 minutes."
