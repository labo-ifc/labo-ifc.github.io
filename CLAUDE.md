# Labo IFC : consignes pour Claude

Site statique d'outils interactifs de maths et de chimie (cours de secondaire, en français), un dossier par matière (`maths/`, `chimie/`).
Ancien nom « Labo maths » : le dépôt `labo-maths/labo-maths.github.io` ne contient plus que des redirections vers ce site. Voir `README.md` pour la structure et le lancement.

## Conventions

- Tout le texte visible est en **français** ; le code, les noms et les commentaires sont en anglais, commentaires rares et courts.
- Pas de build ni de dépendance npm : modules ES, bibliothèques (math.js, KaTeX, Plotly) depuis un CDN.
- Couleur d'accent par matière : `data-subject` sur `<body>` (règles dans `shared/theme.css`). Couleurs et composants communs (`.ghost`, `.primary`, `.chips`…) viennent de `shared/theme.css` : utiliser ses variables (`--accent`, `--accent-soft`, `--bg`, `--panel`, `--border`, `--muted`…), jamais de couleur en dur. Vérifier les thèmes clair et sombre.
- Formules : `data-tex="…"` (+ `data-display`) dans le HTML, `renderTex` / `renderMixed` (`shared/tex.js`) en JS ; texte mêlé de maths avec `$…$`.
- Logique (maths, chimie) dans des modules sans DOM (`exercises.js`, `calc.js`, `model.js`…), testée dans `tests/`.
- Mise en page responsive : une colonne sous 900px ; respecter `prefers-reduced-motion` pour les animations.
- Statistiques GoatCounter : les deux `<script>` (réglage `window.goatcounter` + `count.js` de `exokayn.goatcounter.com`) doivent figurer dans le `<head>` de toute nouvelle page ; chiffres privés, pas de compteur visible.
- La rose en braille en commentaire au début de `index.html` est la signature de l'auteur : la conserver telle quelle.

## maths/exp-log

- Thème clair adouci (tons papier, écran seulement) : variables redéfinies en tête de `maths/exp-log/style.css`, pas dans `shared/theme.css`.
- Un chapitre par « page » (`section.chapter`, affichée selon le hash de l'URL), barre de chapitres et liens précédent/suivant générés dans `app.js`.
- Méthodes : cartes `.method` dans une grille `.methods`, avec un `.method-actions` (« Voir un exemple » `data-example="<type>"`, « S'entraîner » `data-train="<choix>"`).
- Exemples résolus : générés par `TYPES[type].gen(seeded(11))` (même exemple à chaque fois), affichés dans un **panneau pleine largeur** sous la rangée de la carte (`initExamples` dans `lessons.js`), étapes en grille calcul à gauche / commentaire à droite. Préférer ce type de présentation aux menus `<details>` dans des colonnes étroites, jugés trop chargés.
- Exercices : barre collante `#ex-dock` (rappel de l'énoncé, réponse, Indice / Étape suivante / Tout afficher), affichée quand les boutons de la carte sortent de l'écran par le haut ; sous la barre des chapitres sur ordinateur, en bas de l'écran sur téléphone. Elle reflète la carte via `updateButtons` / `feedback` dans `trainer.js` : tout nouveau bouton d'aide doit y être ajouté aussi.
- Chapitre 3 : le tableau `#exp-table` suit directement le bloc curseur + graphique (graphique réduit à 320px) pour voir les valeurs en déplaçant le curseur.
- Tableaux de valeurs pilotés par un curseur : classe `.fixed-table` (colonnes égales, hauteur fixe) pour que seules les valeurs changent, jamais la taille des cases.
- Nouveau type d'exercice : l'ajouter à `TYPES` dans `exercises.js` (énoncé, indices, étapes `{ tex, note }`, solutions, `residual`) ; les tests Node le vérifient automatiquement.
  - **Exactement 3 indices**, aucun ne donne la réponse (ni `S = `, ni `$x = <solution>$`).
  - `tests/exp-log.steps.test.js` doit passer : chaque égalité d'étape est évaluée aux solutions par `tests/tex-eval.js` (`=` exact, `\approx` à l'arrondi affiché). Jamais de valeur arrondie après un `=` (écrire la fraction exacte) ; une notation TeX nouvelle doit être ajoutée à l'évaluateur.
  - `kind: "expr"` (dérivées) : la réponse est une expression en x, comparée numériquement à `derivative` sur `points` ; toute forme équivalente est acceptée.
  - `text` : énoncé en mots (problèmes) affiché à la place de l'équation ; `digits` : arrondi demandé (2 par défaut).
  - Réponses lues par `parseAnswer` via `shared/calc.js` : valeur exacte (`ln(5)/2`, `e^3`…) ou arrondie, tolérance 0,6·10^-digits.
- Niveaux du générateur : 1–4 historiques, 5 « Troisième degré », 6 « Dérivées », 7 « Problèmes ».
- Chapitres : … 6 Équations log, 7 e et dérivées, 8 Semi-log, 9 Problèmes, 10 Pense-bête, 11 Exercices (contenu tiré du cours PDF, gardé en local, jamais versionné).

## maths/sinusoides

- Cercle trigonométrique (case « Cercle trigonométrique », décochée au chargement) : rayon 1, centre (0 ; 0), superposé au graphique ; quand il est visible, le cadrage s'adapte (`circleView`) : y couvre le cercle et la courbe (min(−1 ; D−A) à max(1 ; D+A) + marge), x en découle à unités égales (`scaleanchor`) pour qu'il reste rond, recalculé au redimensionnement ; le curseur Position x et la lecture restent dans cette fenêtre. Couleur : variable `--circle`.
- Point du cercle à l'angle θ = ωx − φ (`circlePoint` dans `model.js`) pour la position `state.x0` (flottant, le pas du curseur bloquerait l'animation) ; lecture ▶ : θ avance de π/2 par seconde, désactivée si `prefers-reduced-motion`.
- En saisie libre, le cercle utilise l'ajustement (mis en cache par expression) et `#circle-note` explique pourquoi il manque (pas d'expression, expression invalide, ajustement impossible ou R² < 0,99).

## Vérification

- `node --test` (Node ≥ 20) doit passer.
- Interface : `python3 -m http.server 8000` puis `http://localhost:8000/tests/exp-log.browser.html` ; mettre ce test à jour quand l'interface change.
- Sans réseau (Plotly en CDN indisponible), le test navigateur échoue en masse : ce n'est pas une régression.
