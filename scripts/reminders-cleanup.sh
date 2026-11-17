#!/usr/bin/env bash
# Nettoyage ponctuel des rappels en production. À lancer soi-même, avec ses clés.
#
#   QSTASH_TOKEN=... UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... \
#     ./scripts/reminders-cleanup.sh https://ton-app.vercel.app            # montre ce qui serait fait
#   ... ./scripts/reminders-cleanup.sh --apply https://ton-app.vercel.app  # le fait
#
# Ce qu'il fait avec --apply, et rien d'autre :
#  1. QStash : garde UNE seule planification vers <URL>/api/send (id « clair-send », toutes les
#     5 min) et supprime les autres planifications vers un /api/send (doublons, previews, en pause).
#  2. Redis : supprime les anciens abonnements indexés par endpoint quand un abonnement
#     d'appareil a le même endpoint (même téléphone enregistré deux fois).
# Les abonnements, verrous du jour et réglages des utilisateurs ne sont pas touchés autrement.
set -euo pipefail
APPLY=0
[ "${1:-}" = "--apply" ] && { APPLY=1; shift; }
APP_URL="${1:?URL de production, ex. https://clair.vercel.app}"
: "${QSTASH_TOKEN:?définis QSTASH_TOKEN}"
: "${UPSTASH_REDIS_REST_URL:?définis UPSTASH_REDIS_REST_URL}"
: "${UPSTASH_REDIS_REST_TOKEN:?définis UPSTASH_REDIS_REST_TOKEN}"
cd "$(dirname "$0")/.."

echo "=== État actuel (lecture seule)"
node scripts/reminders-diagnose.mjs

if [ "$APPLY" -ne 1 ]; then
  echo
  echo "Rien n'a été modifié. Pour nettoyer : relancer avec --apply $APP_URL"
  exit 0
fi

echo
echo "=== 1. QStash : une seule planification"
./scripts/qstash-schedule.sh --replace "$APP_URL"
echo
echo "=== 2. Redis : abonnements en double"
node scripts/reminders-diagnose.mjs --fix-duplicates >/dev/null
echo "fait."
echo
echo "=== État après nettoyage"
node scripts/reminders-diagnose.mjs
