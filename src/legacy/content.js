/* ==========================================================================
   content.js — corpus pédagogique + catalogue d'exercices + programme
   ========================================================================== */

export const SKILLS = {
  articulation: { name: 'Articulation', emoji: '👄', desc: "Netteté des consonnes, précision des syllabes" },
  debit:        { name: 'Débit',        emoji: '⏱️', desc: "Vitesse maîtrisée, ni précipitée ni traînante" },
  prosodie:     { name: 'Prosodie',     emoji: '🎵', desc: "Mélodie, accentuation, relief de la voix" },
  fluidite:     { name: 'Fluidité',     emoji: '🌊', desc: "Absence de tics, pauses au bon endroit" },
  projection:   { name: 'Projection',   emoji: '📣', desc: "Souffle, puissance et stabilité du volume" },
};

/* ---------------------------- Virelangues ---------------------------- */
export const TWISTERS = [
  { t: "Un chasseur sachant chasser doit savoir chasser sans son chien.", d: 1, f: "ch / s" },
  { t: "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ?", d: 2, f: "ch / s" },
  { t: "Didon dîna, dit-on, du dos d'un dodu dindon.", d: 1, f: "d" },
  { t: "Trois très gros rats gris rongèrent trois très gros grains d'orge.", d: 2, f: "r / gr" },
  { t: "Si six scies scient six cyprès, six cent six scies scient six cent six cyprès.", d: 3, f: "s / si" },
  { t: "Ces cerises sont si sûres qu'on ne sait pas si c'en sont.", d: 2, f: "s / z" },
  { t: "Un dragon gradé dégrade un gradé dragon.", d: 2, f: "gr / dr" },
  { t: "Tas de riz, tas de rats. Tas de riz tentant, tas de rats tentés.", d: 2, f: "t / r" },
  { t: "Poisson sans boisson, c'est poison.", d: 1, f: "s / z" },
  { t: "Natacha n'attacha pas son chat Pacha qui s'échappa.", d: 2, f: "ch / t" },
  { t: "Seize jacinthes sèchent dans seize sachets secs.", d: 2, f: "s / z / ch" },
  { t: "Que lit Lili sous ces lilas-là ? Lili lit L'Iliade.", d: 2, f: "l" },
  { t: "Douze douches douces.", d: 1, f: "d / ch" },
  { t: "Ton thé t'a-t-il ôté ta toux ?", d: 1, f: "t" },
  { t: "Je veux et j'exige d'exquises excuses.", d: 2, f: "x / ks" },
  { t: "Un généreux déjeuner régénérerait des généraux dégénérés.", d: 3, f: "j / g" },
  { t: "Cinq gros rats grillent dans la grosse graisse grasse.", d: 3, f: "gr" },
  { t: "Bonjour madame Sans-Souci, combien sont ces six saucissons-ci ?", d: 2, f: "s" },
  { t: "La cavale aux Valaques avala l'eau du lac et l'eau du lac lava la cavale.", d: 3, f: "l / v" },
  { t: "Chat vit rôt, rôt tenta chat, chat mit patte à rôt, rôt brûla patte à chat.", d: 3, f: "ch / r / t" },
  { t: "Le fisc fixe exprès chaque taxe fixe excessive exclusivement au luxe.", d: 3, f: "ks / f" },
  { t: "Pruneau cuit, pruneau cru, pruneau cuit, pruneau cru.", d: 2, f: "pr / cr" },
  { t: "Dis-moi gros gras grand grain d'orge, quand te dégrogragrangraindorgeras-tu ?", d: 3, f: "gr" },
  { t: "L'assassin sur son sein suçait son sang sans cesse.", d: 2, f: "s" },
  { t: "Cette taxe fixe excessive est fixée exprès à Aix par le fisc.", d: 3, f: "ks" },
  { t: "Sachez, mon cher, que ces chers chats chassent chaque chose cachée.", d: 2, f: "ch / s" },
];

/* ---------------------------- Textes de lecture ---------------------------- */
export const TEXTS = [
  { id: 'corbeau', title: "Le Corbeau et le Renard", src: "La Fontaine (1668)", tags: ['classique','expressif'],
    t: `Maître Corbeau, sur un arbre perché, tenait en son bec un fromage. Maître Renard, par l'odeur alléché, lui tint à peu près ce langage : « Hé ! bonjour, Monsieur du Corbeau. Que vous êtes joli ! que vous me semblez beau ! » À ces mots, le Corbeau ne se sent pas de joie ; et pour montrer sa belle voix, il ouvre un large bec, laisse tomber sa proie. Le Renard s'en saisit, et dit : « Mon bon Monsieur, apprenez que tout flatteur vit aux dépens de celui qui l'écoute. »` },
  { id: 'aube', title: "Demain, dès l'aube", src: "Victor Hugo (1856)", tags: ['classique','émotion'],
    t: `Demain, dès l'aube, à l'heure où blanchit la campagne, je partirai. Vois-tu, je sais que tu m'attends. J'irai par la forêt, j'irai par la montagne. Je ne puis demeurer loin de toi plus longtemps. Je marcherai les yeux fixés sur mes pensées, sans rien voir au dehors, sans entendre aucun bruit, seul, inconnu, le dos courbé, les mains croisées, triste, et le jour pour moi sera comme la nuit.` },
  { id: 'clair', title: "Clair de lune", src: "Paul Verlaine (1869)", tags: ['classique','musicalité'],
    t: `Votre âme est un paysage choisi que vont charmant masques et bergamasques, jouant du luth et dansant, et quasi tristes sous leurs déguisements fantasques. Tout en chantant sur le mode mineur l'amour vainqueur et la vie opportune, ils n'ont pas l'air de croire à leur bonheur et leur chanson se mêle au clair de lune.` },
  { id: 'pitch', title: "Pitch produit", src: "Texte d'entraînement", tags: ['pro','pitch'],
    t: `Bonjour à tous. En trois minutes, je vais vous montrer comment nous divisons par deux le temps de traitement d'un dossier. Aujourd'hui, une équipe passe quarante pour cent de sa semaine à ressaisir des informations qui existent déjà. Notre solution se branche sur vos outils, extrait les données une seule fois, et les redistribue partout. Résultat : moins d'erreurs, des délais tenus, et des équipes qui retrouvent du temps pour ce qui compte vraiment.` },
  { id: 'reunion', title: "Prise de parole en réunion", src: "Texte d'entraînement", tags: ['pro','assertivité'],
    t: `Je voudrais revenir sur le point précédent, car je pense qu'il mérite une décision claire aujourd'hui. Nous avons deux options. La première nous fait gagner du temps, mais nous expose à une dette technique que nous paierons au printemps. La seconde demande deux semaines de plus, et nous laisse une base saine. Ma recommandation est la seconde option. Je vous propose d'en décider maintenant, puis de passer au sujet suivant.` },
  { id: 'story', title: "Récit personnel", src: "Texte d'entraînement", tags: ['storytelling'],
    t: `La première fois que j'ai parlé devant une salle, j'avais vingt-deux ans et cent trente personnes en face de moi. Ma voix est partie dans les aigus dès la deuxième phrase. J'ai vu le premier rang sourire, et j'ai compris quelque chose ce jour-là : personne n'attendait la perfection. On attendait simplement que je regarde la salle, que je respire, et que je raconte quelque chose de vrai. Depuis, avant chaque prise de parole, je m'arrête, j'inspire, et je choisis ma première phrase.` },
  { id: 'annonce', title: "Annonce d'équipe", src: "Texte d'entraînement", tags: ['pro','clarté'],
    t: `Merci d'être là. J'ai une annonce importante et je vais être direct. À partir du mois prochain, nous changeons notre façon de planifier. Trois choses vont changer concrètement. D'abord, nous passerons à des cycles de deux semaines. Ensuite, chacun aura un objectif unique et mesurable. Enfin, nous nous verrons chaque vendredi pendant trente minutes, pas plus. Je sais que le changement demande un effort. Je compte sur vous, et je réponds à toutes vos questions maintenant.` },
];

/* ---------------------------- Paires minimales ---------------------------- */
export const PAIRS = [
  { id: 'u-ou', name: "/y/ vs /u/", hint: "« u » lèvres serrées et langue en avant · « ou » langue en arrière",
    items: [['vu','vous'],['tu','tout'],['nu','nous'],['su','sous'],['bu','boue'],['lu','loup'],['rue','roue'],['bulle','boule']] },
  { id: 'eu-o', name: "/ø/ vs /o/", hint: "« eu » lèvres arrondies et langue avancée",
    items: [['peu','pot'],['ceux','seau'],['deux','dos'],['feu','faux'],['nœud','nos'],['veut','vos']] },
  { id: 'ch-j', name: "/ʃ/ vs /ʒ/", hint: "« ch » sourd, aucun son de gorge · « j » sonore, les cordes vibrent",
    items: [['chou','joue'],['choix','joie'],['cache','cage'],['bouche','bouge'],['hache','âge'],['chèque','jette']] },
  { id: 's-z', name: "/s/ vs /z/", hint: "« s » souffle seul · « z » souffle + vibration",
    items: [['poisson','poison'],['coussin','cousin'],['dessert','désert'],['casse','case'],['russe','ruse'],['baisser','baiser']] },
  { id: 'nasales', name: "Nasales /ɛ̃/ /ɑ̃/ /ɔ̃/", hint: "Trois positions distinctes : in, an, on",
    items: [['pain','pan'],['vin','vent'],['teint','temps'],['lin','long'],['bain','bon'],['main','mon']] },
  { id: 'b-v', name: "/b/ vs /v/", hint: "« b » lèvres qui explosent · « v » lèvre sur les dents",
    items: [['bain','vain'],['boire','voir'],['bol','vol'],['banc','vent'],['bu','vu'],['abbé','avait']] },
  { id: 'r-l', name: "/ʁ/ vs /l/", hint: "« r » à l'arrière de la gorge · « l » pointe de langue derrière les dents",
    items: [['rire','lire'],['riz','lit'],['rond','long'],['pire','pile'],['mare','mal'],['rot','lot']] },
  { id: 'p-b', name: "/p/ vs /b/", hint: "« p » sans vibration · « b » avec vibration",
    items: [['pain','bain'],['pot','beau'],['pull','bulle'],['pas','bas'],['père','bercer']] },
  { id: 'f-v', name: "/f/ vs /v/", hint: "Même position, seule la vibration change",
    items: [['fer','vert'],['fou','vous'],['faire','verre'],['fin','vin'],['folle','vole']] },
  { id: 'e-ai', name: "/e/ vs /ɛ/", hint: "« é » bouche fermée et tendue · « è » bouche plus ouverte",
    items: [['thé','taie'],['dé','dais'],['pré','presse'],['épée','épais']] },
];

/* ---------------------------- Séries d'articulation ---------------------------- */
export const DRILLS = [
  { id:'pataka', name:"Pa-Ta-Ka", desc:"Le classique des orthophonistes : trois points d'appui, avant / milieu / arrière.", seq:"PA TA KA" },
  { id:'badaga', name:"Ba-Da-Ga", desc:"Version sonore : les cordes vocales vibrent sans forcer.", seq:"BA DA GA" },
  { id:'voyelles', name:"Voyelles ouvertes", desc:"Ouvre grand, exagère la forme de la bouche.", seq:"A É I O U" },
  { id:'clusters', name:"Groupes consonantiques", desc:"Là où la bouche se ferme en général. Ne saute aucune consonne.", seq:"TRA PLI CRO BLU STRI" },
  { id:'labiales', name:"Labiales", desc:"Travaille l'énergie des lèvres.", seq:"PA PE PI PO PU / BA BE BI BO BU" },
  { id:'sifflantes', name:"Sifflantes", desc:"Contrôle la fuite d'air : le son doit rester net.", seq:"SA CHA ZA JA" },
  { id:'finales', name:"Consonnes finales", desc:"Le défaut n°1 en français : les fins de mots avalées.", seq:"ACTE · EXACTE · STRICT · ABRUPT · MIXTE" },
];

/* ---------------------------- Sujets d'improvisation ---------------------------- */
export const TOPICS = [
  "Un objet du quotidien que vous trouvez génial","Le meilleur conseil qu'on vous ait donné",
  "Pourquoi il faudrait apprendre à s'ennuyer","Une chose que vous avez changé d'avis dessus",
  "La ville idéale en trois règles","Défendez le fait de se lever tôt",
  "Convainquez-moi d'essayer votre plat préféré","Un échec qui vous a servi",
  "Faut-il tout dire à ses collègues ?","Expliquez internet à quelqu'un de 1850",
  "Le talent est-il surestimé ?","Racontez votre journée d'hier comme une épopée",
  "Trois raisons de lire moins de livres","Ce que vous feriez avec une heure de plus par jour",
  "Le silence est-il un luxe ?","Présentez-vous en trente secondes, sans dire votre métier",
  "Pourquoi les réunions échouent","Une tradition à inventer",
  "Défendez la lenteur","Ce qui vous met en colère et qui ne devrait pas",
  "Le meilleur endroit où vous avez dormi","Convainquez un enfant de manger des légumes",
  "L'ennui est-il utile au travail ?","Un métier qui devrait exister",
  "Que garderiez-vous de votre adolescence ?","Improvisez un discours de remerciement",
  "Vendez-moi un objet cassé","Le progrès nous rend-il plus libres ?",
  "Expliquez une règle de jeu compliquée","Ce que la musique vous a appris",
  "Faut-il dire la vérité aux gens qu'on aime ?","Le voyage change-t-il vraiment ?",
  "Une décision difficile que vous avez bien prise","Improvisez une annonce de mauvaise nouvelle",
  "Pourquoi l'écriture manuscrite compte encore","Trois choses à ne jamais déléguer",
  "Le plus beau compliment reçu","Défendez une opinion impopulaire",
  "Comment reconnaître quelqu'un de fiable","Racontez une rencontre marquante",
  "Un souvenir d'odeur","Ce qu'on apprend en cuisinant",
  "Est-on obligé d'avoir de l'ambition ?","Improvisez un discours de mariage",
  "La chance, ça se travaille ?","Le meilleur usage d'un dimanche",
  "Une chose que vous savez faire et que vous pourriez enseigner","Défendez le droit à l'erreur",
  "Faut-il séparer vie pro et vie perso ?","Ce qui vous rend curieux",
  "Improvisez un pitch d'investissement pour votre ville","Une habitude qui a changé votre vie",
  "Pourquoi on se souvient mieux des histoires","Le courage au quotidien",
  "Ce qu'on perd en allant trop vite","Présentez un projet en une seule phrase, puis développez",
  "Un désaccord bien géré","La politesse est-elle démodée ?",
  "Ce que vous diriez à vous-même à vingt ans","Comment annoncer un retard sans se justifier",
];

/* ---------------------------- Échauffements guidés ---------------------------- */
export const WARMUPS = [
  { id: 'warm-express', title: "Échauffement express", dur: 120, mic: false,
    steps: [
      { s: 20, t: "Respiration basse", d: "Une main sur le ventre. Inspire 4 s par le nez en gonflant le ventre, expire 6 s par la bouche. Épaules relâchées." },
      { s: 20, t: "Détente du visage", d: "Mâchouille exagérément, bouche fermée. Puis bâille grand, deux fois, sans retenir le son." },
      { s: 20, t: "Vibration des lèvres", d: "Lèvres relâchées, souffle : « brrrrr ». Cherche une vibration régulière, sans forcer." },
      { s: 25, t: "Sirène sur « mmm »", d: "Bouche fermée, monte et descends lentement en glissando, comme une sirène. Sens la vibration dans le nez et les lèvres." },
      { s: 20, t: "Voyelles projetées", d: "« A — É — I — O — U », chacune tenue 2 s, en visant le mur d'en face. Volume moyen, pas de cri." },
      { s: 15, t: "Première phrase", d: "Dis à voix haute : « Je suis prêt, je prends mon temps, je regarde devant moi. » Deux fois, de plus en plus posé." },
    ]},
  { id: 'warm-full', title: "Échauffement complet", dur: 300, mic: true,
    steps: [
      { s: 40, t: "Ancrage & posture", d: "Debout, pieds largeur du bassin. Déroule la colonne vers le bas, puis remonte vertèbre par vertèbre. Nuque longue, sternum ouvert." },
      { s: 40, t: "Respiration 4-6", d: "Inspire 4 s, expire 6 s, huit cycles. L'expiration doit être régulière, sans à-coup : c'est elle qui porte la voix." },
      { s: 35, t: "Souffle sur « s »", d: "Inspire, puis expire sur un « ssss » le plus régulier possible. Le son ne doit pas faiblir avant la fin." },
      { s: 35, t: "Mâchoire & langue", d: "Mastication exagérée. Puis langue : pointe vers le nez, le menton, chaque joue. Enfin « la-la-la » rapide et net." },
      { s: 40, t: "Vibration lèvres + son", d: "« Brrr » puis ajoute la voix. Fais varier la hauteur. La gorge doit rester libre." },
      { s: 40, t: "Sirènes amples", d: "Sur « mmm » puis « ng », descends jusqu'au plus grave confortable, remonte jusqu'au plus aigu confortable. Aucun forçage." },
      { s: 35, t: "Résonance « ma-mé-mi »", d: "« Ma — mé — mi — mo — mu » en cherchant les vibrations dans le masque du visage. Volume moyen, timbre riche." },
      { s: 35, t: "Projection", d: "Comme si tu appelais quelqu'un à vingt mètres : « Ho ! » puis « Bonjour à tous ! ». Depuis le ventre, pas depuis la gorge." },
      { s: 30, t: "Articulation à froid", d: "« PA-TA-KA » huit fois, lentement puis vite, en exagérant chaque appui." },
      { s: 30, t: "Mise en voix", d: "Lis une phrase de ton choix trois fois : neutre, puis souriante, puis grave. Écoute la différence." },
    ]},
  { id: 'calm', title: "Calmer le trac (3 min)", dur: 180, mic: false,
    steps: [
      { s: 45, t: "Respiration en carré", d: "Inspire 4 s · retiens 4 s · expire 4 s · retiens 4 s. Trois cycles. Le rythme lent fait baisser le cœur." },
      { s: 30, t: "Relâcher les épaules", d: "Monte les épaules aux oreilles, serre 5 s, relâche d'un coup en soufflant. Trois fois." },
      { s: 30, t: "Ancrer le regard", d: "Choisis trois points dans la pièce. Regarde chacun 5 s en respirant. Tu t'entraînes à balayer une salle." },
      { s: 35, t: "Expiration longue", d: "Expire deux fois plus longtemps que tu n'inspires : 4 s / 8 s. Cinq cycles." },
      { s: 40, t: "Première phrase, à voix basse", d: "Prononce ta première phrase trois fois, très doucement, en articulant. Puis une fois à voix normale." },
    ]},
];

/* ---------------------------- Catalogue d'exercices ---------------------------- */
/* kind: read | twister | pairs | impro | pace | volume | pitch | phonation | drill | guided | prompter */
export const CATALOG = [
  { id:'ex-warm-express', kind:'guided', title:"Échauffement express", sub:"2 min · sans micro",
    skills:{}, ico:'flame', data:{ warmup:'warm-express' },
    brief:"Six étapes courtes pour dégripper le souffle, le visage et la voix. À faire avant chaque séance." },
  { id:'ex-warm-full', kind:'guided', title:"Échauffement complet", sub:"5 min · voix + souffle",
    skills:{}, ico:'flame', data:{ warmup:'warm-full' },
    brief:"Le rituel complet du comédien : posture, souffle, résonance, projection, articulation." },
  { id:'ex-calm', kind:'guided', title:"Calmer le trac", sub:"3 min · respiration",
    skills:{}, ico:'heart', data:{ warmup:'calm' },
    brief:"Protocole respiratoire à faire juste avant de prendre la parole." },

  { id:'ex-twister', kind:'twister', title:"Virelangues", sub:"Précision puis vitesse",
    skills:{articulation:.85,debit:.15}, ico:'zap', data:{ reps:3 },
    brief:"Trois passages sur la même phrase. Objectif : zéro erreur d'abord, vitesse ensuite. On ne gagne pas de points en écrasant les syllabes." },
  { id:'ex-drill', kind:'drill', title:"Gammes d'articulation", sub:"Métronome · syllabes",
    skills:{articulation:1}, ico:'grid',
    brief:"Séries de syllabes au métronome, tempo progressif. Exagère les mouvements : c'est en amplifiant qu'on gagne en netteté." },
  { id:'ex-finales', kind:'read', title:"Consonnes finales", sub:"Ne plus avaler les fins de mots",
    skills:{articulation:.8,debit:.2}, ico:'scissors',
    data:{ textId:'custom-finales', custom:"Le concept exact de ce contrat strict reste abrupt. Un texte compact, un rythme distinct, un acte correct. Cette liste mixte contient quatorze objets intacts. Il insiste, persiste et résiste, puis il existe." },
    brief:"Chaque mot se termine par un groupe de consonnes. Prononce-les toutes, jusqu'à la dernière." },

  { id:'ex-pairs', kind:'pairs', title:"Paires minimales", sub:"Discrimination fine",
    skills:{articulation:1}, ico:'target',
    brief:"Deux mots qui ne diffèrent que par un son. La reconnaissance vocale te dit lequel elle a entendu : c'est un juge impitoyable et très utile." },

  { id:'ex-read', kind:'read', title:"Lecture analysée", sub:"Débit · pauses · précision",
    skills:{debit:.4,articulation:.3,fluidite:.3}, ico:'book',
    brief:"Lis le texte à voix haute, à ton rythme naturel. On mesure ensuite ta vitesse, tes pauses et ta précision mot à mot." },
  { id:'ex-pace', kind:'pace', title:"Contrôle du débit", sub:"Viser une zone cible",
    skills:{debit:.8,fluidite:.2}, ico:'gauge', data:{ target:150, tol:15 },
    brief:"Une jauge en direct t'indique si tu es trop lent ou trop rapide. Cible par défaut : 150 mots/min, le rythme d'un bon orateur." },
  { id:'ex-expressive', kind:'read', title:"Lecture expressive", sub:"Relief et intention",
    skills:{prosodie:.7,fluidite:.3}, ico:'music', data:{ prosodyFirst:true },
    brief:"Même exercice, autre objectif : faire vivre le texte. On mesure la variation de hauteur, les silences et les accents." },

  { id:'ex-pitch', kind:'pitch', title:"Intonation", sub:"Sortir du ton monocorde",
    skills:{prosodie:1}, ico:'wave',
    brief:"Prononce la même phrase avec différentes intentions. La courbe de hauteur s'affiche en direct : tu vois ta mélodie." },
  { id:'ex-volume', kind:'volume', title:"Projection stable", sub:"Tenir le volume cible",
    skills:{projection:1}, ico:'mic',
    brief:"Garde ta voix dans la zone verte le plus longtemps possible, sans crier. On mesure la stabilité, pas la puissance brute." },
  { id:'ex-phonation', kind:'phonation', title:"Souffle : /a/ tenu", sub:"Test de capacité",
    skills:{projection:1}, ico:'lungs',
    brief:"Inspire profondément, puis tiens un « aaa » stable le plus longtemps possible. Repère de référence : 15 s correct, 20 s bon, 25 s+ excellent." },

  { id:'ex-impro', kind:'impro', title:"Improvisation", sub:"Sujet tiré au hasard",
    skills:{fluidite:.5,debit:.25,prosodie:.25}, ico:'dice', data:{ dur:90, prep:15 },
    brief:"Un sujet, quelques secondes de préparation, puis tu parles sans t'arrêter. On compte les tics de langage, les pauses et la vitesse." },
  { id:'ex-impro-long', kind:'impro', title:"Prise de parole longue", sub:"3 minutes d'affilée",
    skills:{fluidite:.4,debit:.3,prosodie:.3}, ico:'clock', data:{ dur:180, prep:30 },
    brief:"L'endurance change tout : c'est après une minute que les tics et la fatigue apparaissent." },
  { id:'ex-prompter', kind:'prompter', title:"Mon discours", sub:"Téléprompteur + analyse",
    skills:{debit:.35,prosodie:.3,fluidite:.35}, ico:'file',
    brief:"Colle ton propre texte : présentation, pitch, discours. Il défile à la vitesse que tu choisis, et tu obtiens une analyse complète." },
];

export const byId = id => CATALOG.find(e => e.id === id);

/* ---------------------------- Programme 12 semaines ---------------------------- */
const WEEK_THEMES = [
  { n:1,  t:"Diagnostic & bases",       f:"Poser sa voix, mesurer son point de départ" },
  { n:2,  t:"Netteté des consonnes",    f:"Ne plus avaler les fins de mots" },
  { n:3,  t:"Maîtrise du débit",        f:"Ralentir sans traîner" },
  { n:4,  t:"Le souffle",               f:"Tenir une phrase longue sans manquer d'air" },
  { n:5,  t:"Pauses & ponctuation",     f:"Le silence comme outil" },
  { n:6,  t:"Chasse aux tics",          f:"Éliminer les « euh », « du coup », « en fait »" },
  { n:7,  t:"Prononciation fine",       f:"Les sons qui trahissent" },
  { n:8,  t:"Mélodie de la voix",       f:"Sortir définitivement du monocorde" },
  { n:9,  t:"Projection",               f:"Se faire entendre sans forcer" },
  { n:10, t:"Improvisation",            f:"Penser et parler en même temps" },
  { n:11, t:"Structurer à l'oral",      f:"Une idée, un exemple, une conclusion" },
  { n:12, t:"Prestation",               f:"Assembler tout : le discours final" },
];
const WEEK_PLAN = [
  [['ex-warm-express'],['ex-read','ex-phonation'],['ex-impro','ex-twister']],
  [['ex-warm-express','ex-drill'],['ex-finales','ex-twister'],['ex-read','ex-drill']],
  [['ex-warm-express'],['ex-pace','ex-read'],['ex-pace','ex-twister']],
  [['ex-warm-full'],['ex-phonation','ex-volume'],['ex-read','ex-phonation']],
  [['ex-warm-express'],['ex-expressive','ex-read'],['ex-impro','ex-expressive']],
  [['ex-warm-express'],['ex-impro','ex-impro'],['ex-impro-long']],
  [['ex-warm-express','ex-pairs'],['ex-pairs','ex-twister'],['ex-pairs','ex-finales']],
  [['ex-warm-full'],['ex-pitch','ex-expressive'],['ex-pitch','ex-impro']],
  [['ex-warm-full'],['ex-volume','ex-phonation'],['ex-volume','ex-read']],
  [['ex-warm-express'],['ex-impro','ex-impro'],['ex-impro-long','ex-pitch']],
  [['ex-warm-express'],['ex-prompter','ex-pace'],['ex-impro-long','ex-expressive']],
  [['ex-warm-full'],['ex-prompter','ex-pitch'],['ex-prompter','ex-impro-long']],
];
export const PROGRAM = WEEK_THEMES.map((w, i) => ({
  ...w,
  sessions: WEEK_PLAN[i].map((ex, j) => ({
    id: `w${w.n}s${j + 1}`, n: j + 1, exercises: ex,
    label: j === 0 ? "Mise en route" : j === 1 ? "Cœur de séance" : "Consolidation",
  })),
}));

/* ---------------------------- Badges ---------------------------- */
export const BADGES = [
  { id:'first',      e:'🌱', n:"Premier pas",       test:s => s.sessions.length >= 1 },
  { id:'s10',        e:'📚', n:"10 séances",        test:s => s.sessions.length >= 10 },
  { id:'s50',        e:'🏛️', n:"50 séances",        test:s => s.sessions.length >= 50 },
  { id:'s150',       e:'💎', n:"150 séances",       test:s => s.sessions.length >= 150 },
  { id:'streak3',    e:'🔥', n:"3 jours d'affilée", test:s => s.streak.best >= 3 },
  { id:'streak7',    e:'⚡', n:"7 jours d'affilée", test:s => s.streak.best >= 7 },
  { id:'streak30',   e:'🌋', n:"30 jours d'affilée",test:s => s.streak.best >= 30 },
  { id:'breath20',   e:'🫁', n:"20 s de souffle",   test:s => (s.records.phonation||0) >= 20 },
  { id:'breath30',   e:'🐋', n:"30 s de souffle",   test:s => (s.records.phonation||0) >= 30 },
  { id:'artic85',    e:'👄', n:"Articulation 85",   test:s => s.skills.articulation >= 85 },
  { id:'pace85',     e:'⏱️', n:"Débit 85",          test:s => s.skills.debit >= 85 },
  { id:'proso85',    e:'🎵', n:"Prosodie 85",       test:s => s.skills.prosodie >= 85 },
  { id:'fluid85',    e:'🌊', n:"Fluidité 85",       test:s => s.skills.fluidite >= 85 },
  { id:'proj85',     e:'📣', n:"Projection 85",     test:s => s.skills.projection >= 85 },
  { id:'perfect',    e:'🎯', n:"Un 95",             test:s => s.sessions.some(x => x.score >= 95) },
  { id:'nofiller',   e:'🤐', n:"Impro sans tic",    test:s => s.sessions.some(x => x.kind==='impro' && (x.metrics?.fillers===0) && (x.metrics?.words>80)) },
  { id:'w4',         e:'🗺️', n:"4 semaines faites", test:s => PROGRAM.slice(0,4).every(w => w.sessions.every(x => s.program.done[x.id])) },
  { id:'w12',        e:'👑', n:"Programme achevé",  test:s => PROGRAM.every(w => w.sessions.every(x => s.program.done[x.id])) },
  { id:'lvl10',      e:'⭐', n:"Niveau 10",         test:s => s.level >= 10 },
  { id:'long3',      e:'🎤', n:"3 min d'affilée",   test:s => s.sessions.some(x => x.kind==='impro' && x.duration >= 170) },
];

/* ---------------------------- Fiches conseils ---------------------------- */
export const GUIDES = [
  { id:'g-debit', t:"Le bon débit", e:'⏱️', body:[
    "Un orateur clair parle entre **140 et 165 mots par minute**. En dessous de 120, l'auditoire décroche ; au-dessus de 180, il perd le fil.",
    "Ralentir ne veut pas dire étirer les mots. On ralentit en **ajoutant des silences**, pas en traînant sur les syllabes.",
    "Repère : une phrase de 12 mots doit durer environ 5 secondes, silence de fin compris.",
    "Exercice ciblé : *Contrôle du débit*, puis *Lecture analysée* pour vérifier sans jauge." ]},
  { id:'g-pause', t:"La pause, votre meilleur outil", e:'⏸️', body:[
    "Trois durées à connaître : **0,3 s** entre deux groupes de sens, **0,7 s** entre deux phrases, **1,5 s** avant une idée importante.",
    "Une pause avant un mot clé le met en relief mieux que n'importe quelle emphase vocale.",
    "La pause est aussi le remède aux « euh » : le cerveau comble le vide par un son parasite. Autorise-toi le silence et le tic disparaît.",
    "Viser 12 à 18 % de silence sur un temps de parole est un bon équilibre." ]},
  { id:'g-tics', t:"Éliminer les tics de langage", e:'🤐', body:[
    "Les tics ne se corrigent pas par la volonté pendant qu'on parle : ils se corrigent par **la prise de conscience après**.",
    "Méthode en trois temps : 1) enregistre-toi, 2) compte les occurrences, 3) refais la même prise en visant une occurrence de moins.",
    "Les plus fréquents en français : *euh*, *du coup*, *en fait*, *voilà*, *genre*, *je pense que*, *un peu*.",
    "Remplace le tic par une respiration. Une inspiration audible passe très bien à l'oral ; un « euh » non." ]},
  { id:'g-souffle', t:"Le souffle qui porte la voix", e:'🫁', body:[
    "La voix vit sur l'expiration. Une respiration **abdominale** (le ventre se gonfle, pas les épaules) double la durée utile.",
    "Test de référence : tenir un « aaa » stable. Moins de 12 s indique un appui à travailler, 20 s est bon, 25 s+ est excellent.",
    "Avant de parler : inspire par le nez en 3 temps, laisse partir la première syllabe sur l'expiration, sans blocage de gorge.",
    "Ne jamais parler « en réserve » : reprends de l'air aux ponctuations, pas quand tu n'en as plus." ]},
  { id:'g-artic', t:"Articuler sans exagérer", e:'👄', body:[
    "Le défaut dominant du français parlé : les **consonnes finales** et les groupes consonantiques (*strict*, *exact*, *abrupt*).",
    "S'entraîner en amplifiant (bouchon de liège entre les dents, mouvements exagérés) puis revenir au naturel : la netteté reste.",
    "Les virelangues se travaillent **lentement d'abord**. Répéter une erreur à grande vitesse ne fait que la graver.",
    "Trois séries de *Pa-Ta-Ka* par jour suffisent à sentir une différence en deux semaines." ]},
  { id:'g-proso', t:"Sortir du monocorde", e:'🎵', body:[
    "La monotonie vient rarement de la voix : elle vient d'un **manque d'intention**. On varie la mélodie quand on veut vraiment dire quelque chose.",
    "Trois leviers : la hauteur (grave/aigu), le volume, le débit. Changer l'un des trois toutes les deux ou trois phrases suffit.",
    "En français, la phrase déclarative **descend** en fin de phrase. Monter systématiquement donne un ton hésitant.",
    "Repère mesuré ici : un écart-type de hauteur inférieur à 1,2 demi-ton est perçu comme plat ; 2 à 4 demi-tons, c'est vivant. Sur une phrase entière, viser 6 à 12 demi-tons entre le plus grave et le plus aigu." ]},
  { id:'g-trac', t:"Gérer le trac", e:'💓', body:[
    "Le trac est une montée d'adrénaline : elle est **physiologique, pas psychologique**. On agit donc sur le corps.",
    "Expiration longue (4 s / 8 s) pendant deux minutes : le rythme cardiaque baisse mesurablement.",
    "Prépare et apprends **seulement ta première phrase**. Les trente premières secondes passées, le corps se calme.",
    "Regarde trois points fixes dans la salle en alternance : cela stabilise la voix et le regard." ]},
  { id:'g-struct', t:"Structurer à l'oral", e:'🧱', body:[
    "À l'oral, l'auditoire ne peut pas relire. La structure doit être **annoncée** : « trois points », puis « premier point… ».",
    "Le format le plus robuste : **Message – Preuve – Conséquence**. Une idée, un exemple concret, ce qu'on en fait.",
    "Une idée par phrase. Deux propositions maximum. Les subordonnées imbriquées sont un piège de l'écrit.",
    "Termine par ce que tu veux qu'on retienne, formulé en une phrase courte. C'est la dernière chose entendue qui reste." ]},
];
