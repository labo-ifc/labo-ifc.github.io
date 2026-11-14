# Labo IFC

Outils interactifs pour comprendre les mathématiques, la chimie, la physique et la biologie en les manipulant.
Site : https://labo-ifc.github.io (l'ancien site https://labo-maths.github.io redirige vers les nouvelles adresses).

Un dossier par matière (`maths/`, `chimie/`, `physique/`, `biologie/`), un sous-dossier par outil.

### Mathématiques

| Outil | Dossier |
|---|---|
| Fonctions sinusoïdales : `y = A·sin(ωx − φ) + D`, curseurs, saisie libre, ajustement automatique, cercle trigonométrique animé | [`maths/sinusoides/`](maths/sinusoides/) |
| Exponentielles et logarithmes : fonctions réciproques, `aˣ`, logarithmes, équations exponentielles et logarithmiques (avec exposants, troisième degré, changement de base), le nombre e et les dérivées, graphiques semi-log, problèmes de croissance et d'intérêts, pense-bête imprimable, générateur d'exercices avec indices, résolution pas à pas et calculatrice | [`maths/exp-log/`](maths/exp-log/) |

### Chimie

| Outil | Dossier |
|---|---|
| Hydrocarbures : pétrole, colonne de distillation interactive, carburants (indice d'octane, craquage), combustions complètes et incomplètes (équilibrage), énergie par les énergies de liaison et pouvoir calorifique, alcènes (liaisons σ et π, additions), polymères et plastiques, pense-bête imprimable, générateur d'exercices avec indices, résolution pas à pas et calculatrice | [`chimie/hydrocarbures/`](chimie/hydrocarbures/) |

### Physique

| Outil | Dossier |
|---|---|
| Énergie et thermodynamique : formes et conversions d'énergie, énergies cinétique et potentielle (chute animée), énergie interne et température, chaleur (Q = mcΔT, modes de transfert), travail d'une force inclinée, premier principe (ΔU = Q + W, cycles), deuxième principe, pense-bête imprimable, générateur d'exercices (calculs avec unités et QCM « Notions ») avec indices, résolution pas à pas et calculatrice | [`physique/thermodynamique/`](physique/thermodynamique/) |

### Biologie

| Outil | Dossier |
|---|---|
| Génétique : cellule, ADN, mitose et méiose, lois de Mendel, monohybridisme (échiquier de Punnett interactif, simulateur de F2), codominance, gènes létaux, groupes sanguins, dihybridisme et polyhybridisme, linkage, arbres généalogiques (lecteur d'arbres qui teste chaque mode de transmission), maladies chromosomiques (risque de trisomie 21 selon l'âge de la mère), exercices du cours corrigés, pense-bête imprimable, générateur d'exercices (probabilités, génotypes, gamètes, arbres dessinés, QCM) avec indices et résolution pas à pas | [`biologie/genetique/`](biologie/genetique/) |

### Outils

| Outil | Dossier |
|---|---|
| Diapos (bêta) : éditeur de diapositives 16:9 dans le navigateur ; textes avec formules `$…$` et puces, formules KaTeX (chimie avec `\ce{…}`), images (bouton, coller, glisser), formes (rectangle, ellipse, ligne, flèche) ; déplacer, redimensionner, tourner, aimantation ; quatre thèmes (clair, papier, sombre, tableau noir) et couleur d'accent ; liste des diapos réordonnable ; annuler/rétablir ; sauvegarde automatique dans le navigateur, enregistrer/ouvrir un fichier `.json` ; mode présentation plein écran | [`diapos/`](diapos/) |

## Services

| Service | Rôle |
|---|---|
| [GitHub](https://github.com/labo-ifc/labo-ifc.github.io) | Dépôt du code et hébergement (GitHub Pages, mise à jour à chaque push sur `main`) ; dépôt `labo-maths/labo-maths.github.io` gardé pour rediriger l'ancien site |
| [cdnjs](https://cdnjs.com) (Cloudflare) | KaTeX (formules, extension mhchem pour la chimie) et math.js (calcul) |
| [jsDelivr](https://www.jsdelivr.com) | Plotly (graphiques) |
| [GoatCounter](https://www.goatcounter.com) | Statistiques de visites, privées et sans cookie (compte partagé avec le portfolio) |

Visites comptées avec GoatCounter (sans cookie, donc sans bannière de consentement) : script dans le `<head>` de chaque page,
chemins préfixés par le domaine (`labo-ifc.github.io/…`, avant la migration `labo-maths.github.io/…`) pour les distinguer du portfolio sur https://exokayn.goatcounter.com (rien n'est affiché sur le site).

### Connexions entre les services

| Lien | Où c'est réglé | Détails |
|---|---|---|
| GitHub → GitHub Pages | Repo → **Settings** → **Pages** | Publication de la branche `main` à chaque push, sans build (`.nojekyll` désactive Jekyll). |
| Pages → cdnjs (Cloudflare) | balises `<script>` / `<link>` des pages | KaTeX `0.16.11` (`katex.min.js`, `katex.min.css`, `contrib/mhchem.min.js` pour la chimie) et math.js `13.2.0`, versions figées dans l'URL. Aucun compte. Si cdnjs est inaccessible, formules et calculs ne s'affichent pas. |
| Pages → jsDelivr | balise `<script>` des pages | Plotly `plotly.js-dist-min@2.35.2`. Aucun compte. |
| Pages → GoatCounter | `<head>` de chaque page (`gc.zgo.at/count.js`, envoi vers `exokayn.goatcounter.com/count`) | Compte GoatCounter `exokayn`, partagé avec le portfolio. |

| Ancien site → nouveau | dépôt `labo-maths/labo-maths.github.io` | Pages de redirection (`/`, `/sinusoides/`, `/exp-log/`, ancre `#chapitre` conservée) vers `labo-ifc.github.io/maths/…`. |

Changer de version d'une bibliothèque = modifier l'URL dans chaque page qui la charge.

## Lancer en local

Fichiers statiques, sans installation (math.js, KaTeX et Plotly viennent d'un CDN).
Les modules ES exigent un serveur local, pas `file://` :

```sh
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Chaque `git push` sur `main` met le site à jour (GitHub Pages, racine du dépôt).

## Tests

La logique (maths et chimie) n'a aucune dépendance et se teste avec Node ≥ 20 :

```sh
node --test
```

Pour les exercices de `exp-log/`, `tests/exp-log.steps.test.js` vérifie numériquement chaque étape de
2000 corrigés par type (chaque égalité aux solutions, Δ, Horner, ensemble final, aucune racine oubliée)
ainsi que les trois indices, qui ne doivent jamais donner la réponse.
Pour `chimie/hydrocarbures/`, `tests/hydrocarbures.test.js` vérifie chaque type d'exercice (réponse acceptée,
indices, formules bien formées), la conservation des atomes des combustions et les enthalpies recalculées.
Pour `physique/thermodynamique/`, `tests/thermodynamique.test.js` vérifie chaque type d'exercice sur 300 tirages
(réponse acceptée, avec ou sans unité, QCM, indices sans la réponse) et les formules de `physics.js`.
Pour `biologie/genetique/`, `tests/genetique.test.js` vérifie chaque type d'exercice sur 300 tirages (réponse acceptée,
indices sans la réponse), les croisements, les rapports et la lecture des arbres (génotypes possibles, modes compatibles).

Pour `diapos/`, `tests/diapos.test.js` vérifie la géométrie (redimensionnement d'un bloc tourné, rotation, aimantation),
les thèmes, la lecture d'un fichier (valeurs nettoyées, images en `data:` seulement) et l'historique.

L'interface de `exp-log/` se vérifie dans le navigateur : avec le serveur local lancé,
ouvrir http://localhost:8000/tests/exp-log.browser.html (toutes les lignes doivent être vertes) ; de même pour `diapos/` avec http://localhost:8000/tests/diapos.browser.html
(efface la présentation enregistrée dans le navigateur pour `localhost`).

## Structure

```
index.html          page d'accueil : les outils groupés par matière (une section par matière, ancre #maths, #chimie, #physique, #biologie), puis #outils
shared/
  theme.css         couleurs (variables CSS), thèmes clair/sombre, composants communs (boutons, champs, curseurs)
  theme-boot.js     thème appliqué avant le premier affichage (script bloquant dans <head>)
  theme.js          bouton de thème, suit le réglage du système tant qu'aucun choix n'est enregistré
  ticks.js          graduations en multiples de π
  parser.js         saisie utilisateur → fonction de x (math.js, liste blanche, pas d'eval)
  numeric.js        linspace
  fraction.js       fractions exactes (calcul et affichage TeX)
  tex.js            rendu KaTeX (formules statiques, texte mêlé de $…$)
  plot.js           couleurs du thème et mise en page Plotly communes
  calc.js           calculatrice : saisie → arbre → valeur (variable x, sin/cos/tan, angles en degrés avec °), TeX et erreurs en français (sans DOM, pas d'eval)
  calculator.js/.css  widget calculatrice (écran de taille fixe, aperçu TeX, clavier, historique, Rép ; touches de fonction au choix, PHYSICS_KEYS)
  answer.js         lecture d'un nombre tapé par l'élève (virgule, fraction, puissance de 10)
  course.css        mise en page des cours : barre de chapitres, méthodes, exemples résolus, exercices, barre collante, pense-bête, impression
  course.js         un chapitre par « page » (hash de l'URL), précédent/suivant, boutons « S'entraîner »
  trainer.js        carte d'exercice commune (indices, étapes, vérification, score, barre collante, QCM) ; chaque cours fournit son générateur et ses messages
  examples.js       exemples résolus des cartes de méthode, dans un panneau pleine largeur sous la rangée de la carte
diapos/
  index.html, style.css
  model.js          présentation (sans DOM) : thèmes et couleurs, mises en page, redimensionnement avec rotation,
                    aimantation, lecture sûre d'un fichier .json, historique d'annulation
  render.js         dessin d'une diapo en HTML (éditeur, miniatures, présentation)
  app.js            éditeur : scène, poignées, liste des diapos, panneau de propriétés, fichiers, présentation, raccourcis
maths/
  sinusoides/
    index.html, style.css, app.js
    model.js          évaluation et ajustement d'une sinusoïde, point du cercle trigonométrique (θ = ωx − φ)
  exp-log/
    index.html, style.css, app.js
    lessons.js        laboratoires interactifs du cours (réciproques, échiquier, aˣ, logarithmes, tangente de aˣ, semi-log,
                      quiz de lecture semi-log) et exemples résolus
                      (panneau pleine largeur sous la rangée de la méthode, un seul ouvert à la fois)
    exercises.js      générateur d'exercices (sans DOM) : énoncé, indices, étapes, solutions, lecture et correction
                      des réponses (valeurs, expressions avec ln/e, dérivées vérifiées numériquement)
    trainer.js        messages propres à exp-log pour la carte d'exercice commune (shared/trainer.js)
chimie/
  hydrocarbures/
    index.html, style.css, app.js
    chem.js           chimie du cours (sans DOM) : formules, masses molaires, distillation, combustions équilibrées,
                      énergies de liaison, chaînes carbonées (σ, π), additions, monomères
    lessons.js        laboratoires du cours (colonne, indice d'octane, craquage, combustions, ΔH, chaîne σ/π,
                      additions, polymères) et exemples résolus
    exercises.js      générateur d'exercices (sans DOM), lecture et correction des réponses (nombres séparés par « ; »)
    trainer.js        messages propres au cours pour la carte d'exercice commune
physique/
  thermodynamique/
    index.html, style.css, app.js
    physics.js        physique du cours (sans DOM) : Ec, Ep, chute libre, Q = mcΔT, kelvins, travail, ΔU = Q + W,
                      situations des QCM (formes, conversions, modes de transfert, affirmations)
    lessons.js        laboratoires du cours (chute, travail d'une force inclinée, chauffage, signes de ΔU) et exemples résolus
    exercises.js      générateur d'exercices (sans DOM) : calculs avec unités (kJ, km/h, g, °C…) et QCM
    trainer.js        messages propres au cours (erreurs de signe, de facteur 1000, de km/h)
biologie/
  genetique/
    index.html, style.css, app.js
    genetics.js       génétique du cours (sans DOM) : gènes (dominance, codominance, létal, ABO, lié à X), gamètes,
                      croisements, distributions, rapports, probabilités exactes, risque de trisomie 21
    pedigree.js       arbres généalogiques (sans DOM) : modes de transmission, génotypes possibles, familles en conflit,
                      arbres aléatoires du générateur
    pedigree-svg.js   dessin SVG d'un arbre (symboles, génotypes, personnes cliquables, familles en conflit)
    families.js       arbres des exercices du cours, redessinés
    lessons.js        laboratoires (échiquier de Punnett, F2, lecteur d'arbres, trisomie 21), arbres des exercices et exemples résolus
    exercises.js      générateur d'exercices (sans DOM) : probabilités, génotypes, gamètes, nombres, QCM, arbres
    trainer.js        messages propres au cours et dessin de l'arbre de l'exercice
tests/
  *.test.js         tests Node
  tex-eval.js       évaluateur numérique du TeX des corrigés (utilisé par exp-log.steps.test.js)
  exp-log.browser.html  vérification de l'interface dans le navigateur
```

## Ajouter un outil

1. Créer un dossier `<matière>/<outil>/` avec son `index.html`, en reprenant l'en-tête de `maths/sinusoides/index.html`
   (fil d'Ariane « Labo IFC / <Matière> », `data-subject="<matière>"` sur `<body>`, bouton de thème, `shared/theme-boot.js` dans `<head>`).
2. Importer ce qui sert depuis `../../shared/` ; mettre dans `shared/` tout ce qu'un deuxième outil réutiliserait.
3. Ajouter une carte dans la section de la matière de `index.html` et une ligne dans le tableau ci-dessus.
4. Mettre la logique (calculs, générateur d'exercices) dans un module sans DOM et la tester dans `tests/`.

## Ajouter une matière

1. Créer le dossier `<matière>/` et une `<section class="subject" id="<matière>" data-subject="<matière>">` dans `index.html`.
2. Donner sa couleur d'accent à la matière dans `shared/theme.css` (règles `[data-subject="<matière>"]`, thèmes clair et sombre).
3. Ajouter un tableau d'outils pour la matière dans ce README.
