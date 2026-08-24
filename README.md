# Clair — coach d'élocution

Outil web **mobile first** pour travailler l'élocution, la diction, la prononciation et la prise
de parole. Tout tourne **dans le navigateur** : aucun serveur, aucun compte, aucune API payante,
aucune dépendance à installer. La voix n'est jamais transmise ailleurs que sur l'appareil.

---

## Lancer l'outil

```bash
cd speaking-tool
python3 -m http.server 8765
# puis ouvrir http://localhost:8765
```

> Le micro exige un **contexte sécurisé** : `http://localhost` fonctionne, mais
> `http://192.168.x.x` **non**. Pour l'utiliser sur téléphone, il faut du HTTPS (voir plus bas).

### L'installer sur le téléphone (gratuit)

Déposer le dossier sur n'importe quel hébergeur statique gratuit — GitHub Pages, Netlify Drop,
Cloudflare Pages, Vercel — puis ouvrir l'URL HTTPS sur le téléphone et faire
**« Ajouter à l'écran d'accueil »**. L'application est une PWA : elle s'installe, se lance en
plein écran et **fonctionne ensuite hors ligne** (service worker).

---

## Ce que l'outil mesure vraiment

Chaque prise est analysée en local, à partir de deux sources :

| Source | Mesures obtenues |
| --- | --- |
| Signal audio (Web Audio) | volume moyen et stabilité, silences et pauses, hauteur de la voix (autocorrélation normalisée avec correction d'octave), attaques de syllabes |
| Transcription (Web Speech) | précision mot à mot face au texte de référence, débit en mots/minute, tics de langage |

Repères utilisés pour la notation :

| Indicateur | Zone visée | Pourquoi |
| --- | --- | --- |
| Débit | 140 – 165 mots/min | sous 120 l'attention décroche, au-delà de 180 la compréhension chute |
| Silence | 10 – 22 % du temps | un discours sans silence est illisible ; au-delà de 30 %, ce sont des hésitations |
| Mélodie (écart-type F0) | 1,8 – 4,2 demi-tons | sous 1,2 la voix est perçue comme monocorde |
| Amplitude F0 par phrase | 6 – 12 demi-tons | excursion d'une phrase vivante |
| Souffle (« aaa » tenu) | 20 s et plus | 15 s correct, 25 s+ excellent |
| Tics de langage | moins de 2 / min | au-delà de 4/min l'auditoire les remarque |
| Attaques au métronome | moins de 60 ms d'écart | précision rythmique de l'articulation |

Les cinq compétences (**Articulation, Débit, Prosodie, Fluidité, Projection**) évoluent en
moyenne courante puis en moyenne glissante : une mauvaise séance ne les effondre pas, une bonne
ne les fait pas bondir. Comptez une dizaine de séances pour un profil fiable.

---

## Les 16 exercices

**Préparation** (sans notation des compétences) — échauffement express 2 min, échauffement
complet 5 min, protocole anti-trac 3 min.

**Articulation & prononciation** — virelangues en 3 passages (précision puis vitesse, 26 textes),
gammes de syllabes au métronome avec mesure de la précision rythmique, travail des consonnes
finales, paires minimales (10 séries : u/ou, eu/o, ch/j, s/z, nasales, b/v, r/l, p/b, f/v, é/è)
jugées par la reconnaissance vocale.

**Débit & lecture** — lecture analysée mot à mot (7 textes, classiques et professionnels),
contrôle du débit avec jauge temps réel et cible réglable, lecture expressive notée sur le relief.

**Voix & souffle** — test de phonation maximale, projection dans une zone de volume cible,
intonation sur 5 intentions avec courbe de hauteur en direct.

**Prise de parole** — improvisation 90 s ou 3 min sur 60 sujets tirés au hasard, téléprompteur
pour son propre discours avec analyse complète.

---

## Programme et progression

- **12 semaines × 3 séances** (36 séances), thème par semaine : diagnostic, netteté des consonnes,
  débit, souffle, pauses, chasse aux tics, prononciation fine, mélodie, projection,
  improvisation, structure, prestation finale.
- Chaque séance enchaîne automatiquement 1 à 2 exercices, soit 8 à 15 minutes.
- XP, niveaux et titres, série de jours consécutifs, 20 badges, records personnels,
  radar des 5 compétences, historique et courbe d'évolution.
- 8 fiches méthode (débit, pauses, tics, souffle, articulation, monotonie, trac, structure).

---

## Compatibilité

| Fonction | Chrome / Edge (Android, ordinateur) | Safari (iOS, macOS) | Firefox |
| --- | --- | --- | --- |
| Micro, souffle, volume, intonation, rythme, échauffements | oui | oui | oui |
| Transcription (précision des mots, tics, débit) | oui | non | non |
| Synthèse vocale (« écouter le modèle ») | oui | oui | oui |
| Réécoute de la prise | oui | oui | oui |

Sans transcription, l'application **reste utilisable** : les scores sont alors calculés sur les
seules mesures acoustiques, l'écran de résultat indique « analyse partielle » et **la note est
plafonnée** proportionnellement à la part de critères réellement évaluables — un « Excellent »
ne peut pas être décerné sur une analyse incomplète. Les exercices de souffle, projection,
intonation, rythme et échauffement sont notés à 100 % de leurs critères sur tous les navigateurs.

---

## Données

Tout est stocké dans le `localStorage` de l'appareil. Aucun envoi réseau. L'enregistrement
proposé en réécoute vit en mémoire le temps de l'écran de résultat, puis disparaît.
Les réglages permettent d'exporter et de réimporter la progression en JSON, et de tout effacer.

---

## Structure du code

```
index.html            coquille de l'application
css/styles.css        design system (jetons, thème sombre/clair, mobile first)
js/content.js         corpus pédagogique, catalogue des exercices, programme, badges, fiches
js/store.js           état persistant, XP, niveaux, séries, compétences, records
js/audio.js           micro (niveau, hauteur, silences, attaques), reconnaissance, synthèse, métronome
js/analysis.js        alignement de texte, tics, mesures acoustiques, barèmes, conseils
js/ui.js              helpers DOM, icônes, anneaux, radar, courbes, visualiseur canvas
js/exercise.js        moteur d'exercices : déroulé, manches, mesures, notation, résultats
js/app.js             routeur et vues (accueil, entraînement, progrès, repères, réglages)
sw.js                 service worker (réseau d'abord, cache en secours)
```

Aucun build, aucun `node_modules` : ce sont des modules ES servis tels quels.

---

## Limites à connaître

- Les mesures dépendent du micro et du bruit ambiant. Comparez vos résultats **dans les mêmes
  conditions** : même pièce, même appareil, même distance.
- La reconnaissance vocale normalise ce qu'elle entend : elle filtre une partie des « euh »
  et corrige certaines erreurs. Le comptage des tics est donc un **minorant**.
- Ce sont des indicateurs de progression, pas un diagnostic. En cas de gêne vocale persistante
  (enrouement, douleur, extinction de voix), consultez un ORL ou un orthophoniste.
# better-speak
