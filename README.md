# Clair — 1 minute de parole par jour

PWA d'entraînement à l'expression orale, conçue pour qu'on **ait envie d'y revenir chaque jour** :
un défi d'une minute prêt à lancer, zéro jugement, des erreurs jetables et une progression
mesurée sur le long terme (cycle de 66 jours).

Maquette de référence : Figma « speak », pages *Refonte v2 — Clair* (sombre) et *Thème clair*.

---

## Principes

1. **Action d'abord** : l'accueil propose un défi d'1 min sur un sujet concret, racontable sans
   réfléchir, ou « J'ai mon sujet » qui lance directement l'enregistrement.
2. **Effort > résultat** : la journée est validée dès le premier défi. Mode doux par défaut :
   les notes chiffrées sont masquées (les mesures restent consultables, repliées).
3. **Erreurs jetables** : la prise vit en mémoire et s'autodétruit, sauf « Garder ce souvenir »
   (stocké localement dans IndexedDB). On ne réécoute que 30 s et on nomme UNE chose.
4. **Se comparer à soi** : progrès = toi contre toi il y a 30 jours. Chaîne avec joker :
   jamais 2 jours manqués (1 jour off toléré par semaine).
5. **Outils conservés** : les 16 exercices et le programme 12 semaines de la v1 sont dans
   l'Atelier, avec un résultat « 1 victoire + 1 piste ».

## La boucle

`Défi 1 min` → `Débrief 30 s` (marmonné/accéléré · perdu la structure · rien) → `Replay ciblé`
→ `Récompense` (confettis, chaîne, myélinisation) → `Dans l'élan` (mini-exos de 20 à 45 s,
puis relance d'un nouveau sujet).

---

## Développer

```bash
npm install
npm run dev        # http://localhost:5173 (le micro exige localhost ou HTTPS)
npm run build      # vérification TypeScript + build + service worker
npm run icons      # régénère les icônes PNG depuis public/icons/icon.svg
```

## Stack

| Partie | Choix |
| --- | --- |
| App | Vite + React + TypeScript |
| État | store local existant (`src/legacy/store.js`, localStorage) exposé à React via `useSyncExternalStore` |
| Audio | moteur maison de la v1 (`src/legacy/audio.js`) : niveau, hauteur, silences, enregistrement audio/vidéo |
| PWA | `vite-plugin-pwa` (injectManifest) + service worker `src/sw.ts` (hors ligne + push) |
| Rappels | Web Push (`web-push`) depuis des fonctions Vercel, abonnements dans Upstash Redis, planification Upstash QStash |

```
src/
  main.tsx, App.tsx       amorçage, onglets, thème
  screens/                Aujourd'hui, Atelier, Progrès, Moi
  flow/                   boucle : Challenge, Debrief, Replay, Reward, Elan
  components/bits.tsx     anneau, onde, chaîne, jauge 66 j, calendrier
  lib/                    état typé, sujets, mini-exos, push, souvenirs, messages
  legacy/                 moteur v1 (exercices, analyse, contenu), re-stylé par les jetons v2
  styles/                 tokens.css (thèmes clair/sombre), app.css
  sw.ts                   service worker
api/                      fonctions serverless : subscribe, unsubscribe, active, send
```

---

## Mettre en ligne les rappels quotidiens

L'app fonctionne entièrement sans serveur. Seuls les rappels push en ont besoin, parce qu'un
navigateur ne sait pas programmer une notification quand l'app est fermée.

1. **Clés VAPID** : `npm run vapid`, puis renseigner `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT` dans les variables d'environnement Vercel.
2. **Upstash Redis** : créer une base (offre gratuite) via Vercel › Storage › Upstash, ou à la
   main avec `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. **Upstash QStash** : copier les clés de signature dans `QSTASH_CURRENT_SIGNING_KEY` et
   `QSTASH_NEXT_SIGNING_KEY`, définir `CRON_SECRET` (une longue chaîne aléatoire, pour le
   diagnostic), redéployer, puis créer la planification **une seule fois**, vers l'URL de production :
   ```bash
   QSTASH_TOKEN=... ./scripts/qstash-schedule.sh --list                    # ce qui existe déjà
   QSTASH_TOKEN=... ./scripts/qstash-schedule.sh https://ton-app.vercel.app
   ```
   Le script est idempotent : relancé, il ne crée pas de copie (identifiant fixe `clair-send`). S'il
   trouve des planifications en double, vers une autre URL (preview) ou en pause, il refuse ;
   `--replace` n'en garde alors qu'une seule. QStash appelle `/api/send` toutes les 5 minutes
   (288 appels/jour, sous la limite gratuite). Chaque appel est signé ; un appel non signé est refusé.
   Ne pas ajouter de cron Vercel en plus.

### Comment partent les rappels

- **Un seul rappel par appareil et par jour**, à l'heure locale choisie dans Moi, dans le fuseau de
  l'appareil. Rien ce jour-là si la journée est déjà pratiquée.
- Deux verrous Redis (`clair:sent:<appareil>:<jour>` et `clair:sent:e:<endpoint>:<jour>`) rendent
  l'envoi idempotent : appels simultanés, nouveaux essais QStash, doublons d'abonnement, changement
  d'heure ou désactivation/réactivation ne renvoient rien le même jour.
- Si un passage est manqué, le rappel part au passage suivant, jusqu'à 60 min après l'heure choisie.
- Abonnement révoqué par le service push (404/410, fréquent sur iPhone) : il est retiré, et l'app en
  recrée un toute seule à sa prochaine ouverture. Si la permission a été retirée, l'interrupteur
  repasse sur « off ».

### Diagnostiquer

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://ton-app.vercel.app/api/status
```
montre chaque abonné (heure, fuseau, dernier envoi, ce que `/api/send` ferait maintenant), les derniers
passages du planificateur (plusieurs passages dans la même tranche de 5 min = planifications en double)
et la configuration. En local, `scripts/reminders-diagnose.mjs` lit Redis et QStash en lecture seule
(`--fix-duplicates` retire les anciens abonnements en double). Pour remettre la production d'aplomb
une fois (une seule planification, plus de doublons d'abonnement) :
```bash
QSTASH_TOKEN=... UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... \
  ./scripts/reminders-cleanup.sh https://ton-app.vercel.app           # montre ce qui serait fait
  ./scripts/reminders-cleanup.sh --apply https://ton-app.vercel.app   # le fait
``` `npm test` simule plusieurs jours
d'appels à `/api/send`.

Voir `.env.example`. Coût : 0 € sur les offres gratuites de Vercel et Upstash.

**À savoir** : sur iPhone, les notifications ne fonctionnent que si l'app est ajoutée à l'écran
d'accueil (iOS 16.4+). Les vibrations ne sont pas disponibles sur iOS.

---

## Données et vie privée

Tout est stocké sur l'appareil (localStorage + IndexedDB pour les souvenirs gardés). Le serveur
ne reçoit que l'abonnement push, l'heure du rappel, le fuseau, l'habitude d'ancrage, la série
et la date du dernier jour pratiqué. Aucune voix ni vidéo ne quitte l'appareil.
La progression de la v1 est reprise automatiquement (séances → jours actifs).

## Limites

- La transcription (Web Speech) n'est complète que sur Chrome/Edge. Ailleurs, le replay propose
  de redire sa première phrase au lieu de l'afficher, et l'Atelier signale une analyse partielle.
- Les mesures dépendent du micro et du bruit ambiant : ce sont des repères de progression,
  pas un diagnostic.
