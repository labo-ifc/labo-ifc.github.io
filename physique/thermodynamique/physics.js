// Physics of the energy course (PHY2, unit 1). Pure: no DOM.

export const G = 9.81; // N/kg, in our regions
export const KELVIN = 273.15;

/** Specific heat capacities c in J/(kg·°C). Water comes from the course, the others are usual values. */
export const MATERIALS = [
  { id: "eau", name: "eau", c: 4185 },
  { id: "huile", name: "huile", c: 2000 },
  { id: "aluminium", name: "aluminium", c: 897 },
  { id: "verre", name: "verre", c: 840 },
  { id: "fer", name: "fer", c: 450 },
  { id: "cuivre", name: "cuivre", c: 385 },
];

export const kinetic = (m, v) => 0.5 * m * v * v;
export const potential = (m, h, g = G) => m * g * h;
/** Speed after a fall of height h without friction: Ep → Ec. */
export const fallSpeed = (h, g = G) => Math.sqrt(2 * g * h);
/** Height reached when thrown upwards at speed v: Ec → Ep. */
export const riseHeight = (v, g = G) => (v * v) / (2 * g);

/** Free fall from h0, t seconds after release (stops at the ground). */
export function fallState(m, h0, t, g = G) {
  const tGround = Math.sqrt((2 * h0) / g);
  const tt = Math.min(Math.max(t, 0), tGround);
  const h = tt >= tGround ? 0 : h0 - 0.5 * g * tt * tt, v = g * tt;
  return { h, v, ep: potential(m, h, g), ec: kinetic(m, v), em: potential(m, h0, g), tGround, landed: tt >= tGround };
}

export const heat = (m, c, t1, t2) => m * c * (t2 - t1);
export const toKelvin = (celsius) => celsius + KELVIN;
export const toCelsius = (kelvin) => kelvin - KELVIN;

const rad = (deg) => (deg * Math.PI) / 180;
/** cos of an angle in degrees, exact for the usual angles (cos 90° = 0, not 6e-17). */
export function cosDeg(deg) {
  const exact = { 0: 1, 60: 0.5, 90: 0, 120: -0.5, 180: -1 }[deg];
  return exact ?? Math.cos(rad(deg));
}
export const sinDeg = (deg) => ({ 0: 0, 30: 0.5, 90: 1, 150: 0.5, 180: 0 }[deg] ?? Math.sin(rad(deg)));

/** Work of a force F (N) inclined by θ (degrees) on a displacement d (m). */
export const work = (F, d, theta = 0) => F * d * cosDeg(theta);

/** First law: ΔU = Q + W (received > 0, given < 0). */
export const internalEnergyChange = (Q, W) => Q + W;

/** Sign convention, in words, for one exchange. */
export function exchangeWord(value) {
  return value > 0 ? "reçu" : value < 0 ? "cédé" : "nul";
}

// ---------- notions ----------

export const FORMS = {
  cinetique: "mécanique cinétique",
  potentielle: "mécanique potentielle",
  thermique: "thermique",
  rayonnante: "rayonnante",
  chimique: "chimique",
  nucleaire: "nucléaire",
};

/** Situations for "which form of energy?": what carries the energy and why. */
export const FORM_SITUATIONS = [
  { what: "le vent qui fait tourner une éolienne", carrier: "air en mouvement", why: "Ce qui compte, c'est le mouvement de l'air : plus il va vite, plus il porte d'énergie.", form: "cinetique" },
  { what: "un cours d'eau qui fait tourner un moulin", carrier: "eau en mouvement", why: "L'eau qui coule est en mouvement.", form: "cinetique" },
  { what: "l'eau retenue derrière un barrage", carrier: "eau immobile en hauteur", why: "L'eau ne bouge pas encore, mais elle est haute : l'énergie est stockée.", form: "potentielle" },
  { what: "une balle tenue en l'air, immobile", carrier: "balle immobile en hauteur", why: "Rien ne bouge, mais la balle peut tomber : l'énergie est stockée par sa hauteur.", form: "potentielle" },
  { what: "la chaleur du sous-sol utilisée en géothermie", carrier: "agitation des particules", why: "Un ensemble au repos dont les particules s'agitent : c'est l'énergie thermique.", form: "thermique" },
  { what: "la vapeur chaude d'une machine à vapeur", carrier: "agitation des molécules d'eau", why: "La vapeur est chaude : ses molécules sont très agitées.", form: "thermique" },
  { what: "la lumière du Soleil captée par un panneau photovoltaïque", carrier: "ondes électromagnétiques", why: "La lumière voyage sans support matériel, sous forme d'ondes.", form: "rayonnante" },
  { what: "les micro-ondes qui réchauffent un plat", carrier: "ondes électromagnétiques", why: "Les micro-ondes sont des ondes électromagnétiques, comme la lumière.", form: "rayonnante" },
  { what: "le gaz naturel brûlé dans une chaudière", carrier: "liaisons entre atomes", why: "La combustion brise les liaisons des molécules et libère leur énergie.", form: "chimique" },
  { what: "le bois brûlé dans un poêle (biomasse)", carrier: "liaisons entre atomes", why: "Comme le pétrole ou le charbon, le bois libère son énergie en brûlant.", form: "chimique" },
  { what: "la fission de l'uranium dans une centrale", carrier: "liaisons du noyau", why: "L'énergie vient des liaisons entre protons et neutrons du noyau.", form: "nucleaire" },
  { what: "la fusion de l'hydrogène au cœur du Soleil", carrier: "liaisons du noyau", why: "Des noyaux fusionnent : c'est une réaction nucléaire.", form: "nucleaire" },
];

/** Conversion chains of the course (and two more), in order. */
export const CONVERSIONS = [
  { what: "le corps humain", chain: ["chimique", "thermique"], why: "Les aliments (énergie chimique) entretiennent la chaleur du corps." },
  { what: "un objet qui tombe", chain: ["potentielle", "cinétique"], why: "En perdant de la hauteur, l'objet gagne de la vitesse." },
  { what: "un lance-pierre tiré vers le haut", chain: ["potentielle", "cinétique", "potentielle"], why: "L'élastique tendu stocke l'énergie, la balle part vite puis ralentit en montant." },
  { what: "un barrage hydroélectrique", chain: ["potentielle", "cinétique", "mécanique", "électrique"], why: "L'eau haute descend, prend de la vitesse, fait tourner la turbine reliée à un alternateur." },
  { what: "une centrale au charbon", chain: ["chimique", "thermique", "mécanique", "électrique"], why: "Le charbon brûle, la chaleur produit de la vapeur qui fait tourner la turbine et l'alternateur." },
  { what: "un panneau photovoltaïque", chain: ["rayonnante", "électrique"], why: "La lumière met directement les électrons en mouvement." },
  { what: "une éolienne", chain: ["cinétique", "mécanique", "électrique"], why: "Le vent fait tourner les pales, reliées à un alternateur." },
  { what: "une centrale nucléaire", chain: ["nucléaire", "thermique", "mécanique", "électrique"], why: "La fission chauffe de l'eau, la vapeur fait tourner la turbine et l'alternateur." },
];

export const HEAT_MODES = {
  conduction: { name: "conduction", rule: "de proche en proche dans la matière, sans qu'elle se déplace" },
  convection: { name: "convection", rule: "par le mouvement d'un liquide ou d'un gaz : le chaud monte, le froid descend" },
  rayonnement: { name: "rayonnement", rule: "par des ondes électromagnétiques, même dans le vide" },
};

export const HEAT_SITUATIONS = [
  { what: "le manche d'une casserole posée sur le feu devient chaud", mode: "conduction", why: "La chaleur avance dans le métal du manche sans qu'il se déplace." },
  { what: "une cuillère en métal plongée dans la soupe chauffe jusqu'au bout", mode: "conduction", why: "La chaleur se propage de proche en proche dans la cuillère." },
  { what: "on a froid aux pieds sur un carrelage", mode: "conduction", why: "Contact direct : le pied cède de la chaleur au carrelage, de proche en proche." },
  { what: "un radiateur chauffe l'air de toute la pièce", mode: "convection", why: "L'air chauffé monte, l'air froid descend vers le radiateur : l'air circule." },
  { what: "l'eau d'une casserole chauffe aussi en surface", mode: "convection", why: "L'eau chaude du fond monte et l'eau froide descend : des courants se forment." },
  { what: "une montgolfière s'élève grâce à l'air chauffé par le brûleur", mode: "convection", why: "L'air chaud monte : c'est un mouvement de matière." },
  { what: "le Soleil chauffe la Terre", mode: "rayonnement", why: "Entre le Soleil et la Terre, il y a le vide : seules les ondes passent." },
  { what: "on sent la chaleur d'un feu de camp sur le visage, à distance", mode: "rayonnement", why: "Le feu émet des infrarouges qui atteignent la peau sans chauffer l'air entre les deux." },
  { what: "une lampe infrarouge réchauffe un poussin", mode: "rayonnement", why: "Les infrarouges sont des ondes électromagnétiques." },
];

/** Statements for "which one is correct?": a few true ones, many classic mistakes. */
export const STATEMENTS = {
  true: [
    { text: "La chaleur va toujours spontanément du corps chaud vers le corps froid.", why: "C'est le deuxième principe : les échanges ne se font que dans ce sens." },
    { text: "Une variation de 1 °C est égale à une variation de 1 K.", why: "Les deux échelles sont simplement décalées de 273,15." },
    { text: "Un objet ne « contient » pas de chaleur : la chaleur est un transfert d'énergie.", why: "Ce qu'un objet possède, c'est une énergie interne U." },
    { text: "L'énergie électrique est un vecteur d'énergie entre deux systèmes.", why: "Elle transporte l'énergie par un mouvement d'électrons." },
    { text: "Si la vitesse double, l'énergie cinétique est multipliée par 4.", why: "Ec dépend de v² : 2² = 4." },
    { text: "Une force perpendiculaire au déplacement ne travaille pas.", why: "cos 90° = 0, donc W = 0." },
    { text: "Sur un cycle complet d'une machine thermique, ΔU = 0.", why: "Le système revient à son état de départ." },
    { text: "La température mesure l'énergie cinétique moyenne des particules.", why: "C'est une grandeur macroscopique liée à l'agitation." },
  ],
  false: [
    { text: "La chaleur se mesure en degrés Celsius.", why: "La chaleur est une énergie : elle se mesure en joules." },
    { text: "Un objet chaud contient beaucoup de chaleur.", why: "Il a une grande énergie interne ; la chaleur n'existe que pendant un transfert." },
    { text: "Si la vitesse double, l'énergie cinétique double.", why: "Ec dépend de v² : elle est multipliée par 4." },
    { text: "0 °C correspond au zéro absolu.", why: "Le zéro absolu est 0 K, soit −273,15 °C." },
    { text: "L'énergie électrique est une forme d'énergie comme les autres.", why: "C'est un vecteur, pas une forme d'énergie." },
    { text: "Pousser un mur qui ne bouge pas, c'est lui fournir un travail.", why: "Sans déplacement, W = 0." },
    { text: "La chaleur peut passer spontanément d'un corps froid à un corps chaud.", why: "Spontanément, elle va toujours du chaud vers le froid." },
    { text: "Une bonne machine thermique transforme toute la chaleur reçue en travail.", why: "Jamais : une partie est toujours cédée à la source froide (rendement)." },
    { text: "La conduction peut se faire dans le vide.", why: "La conduction a besoin de matière ; seul le rayonnement traverse le vide." },
    { text: "Une goutte et une casserole d'eau à 100 °C transfèrent la même chaleur à la peau.", why: "Même température, mais la casserole a bien plus de masse, donc d'énergie à transférer." },
    { text: "Quand un gaz fournit un travail, W est positif.", why: "Le gaz cède de l'énergie : W < 0." },
    { text: "Dans un système isolé, l'entropie peut diminuer spontanément.", why: "Elle augmente ou reste constante, jamais elle ne diminue spontanément." },
  ],
};
