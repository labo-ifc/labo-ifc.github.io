// Exercise generator of the energy course. Pure: no DOM.
//
// An exercise is { type, prompt, text ($…$ mixed), answers: [one number], unit,
// rel | tol, hints (exactly 3), steps [{ tex, note }] }, or a multiple choice
// question with `choices` (texts) and answers: [index of the right one].

import {
  G, MATERIALS, kinetic, potential, fallSpeed, riseHeight, heat, toKelvin, toCelsius, cosDeg, work,
  FORMS, FORM_SITUATIONS, CONVERSIONS, HEAT_MODES, HEAT_SITUATIONS, STATEMENTS,
} from "./physics.js";
import { numTex } from "../../shared/tex.js";
import { readNumber } from "../../shared/answer.js";

const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
/** a, a + step, …, b */
const stepped = (rng, a, b, step) => Math.round((a + step * randInt(rng, 0, Math.round((b - a) / step))) * 1e6) / 1e6;
function shuffle(rng, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** French number for TeX, thousands separated by a thin space: 12345.6 → "12\,345{,}6". */
function num(v, d = 2) {
  const s = numTex(v, d);
  return s.replace(/^(-?)(\d+)/, (_, sign, int) => sign + (int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, "\\,") : int));
}
const UNIT_TEX = {
  "°C": "{}^\\circ\\text{C}",
  c: "\\text{J/(kg}\\cdot{}^\\circ\\text{C)}",
  "N/kg": "\\text{N/kg}",
};
const unitTex = (u) => UNIT_TEX[u] ?? `\\text{${u}}`;
/** Value with its unit, in TeX: q(12.5, "J") → "12{,}5\ \text{J}". */
const q = (v, u, d = 2) => `${num(v, d)}\\ ${unitTex(u)}`;
/** Same, between $…$ for prose. */
const Q$ = (v, u, d = 2) => `$${q(v, u, d)}$`;
/** Signed value in a sum: + (−300) is written + (-300). */
const par = (v, d = 2) => (v < 0 ? `\\left(${num(v, d)}\\right)` : num(v, d));
/** Same, as plain text for notes: "12 345,6". */
const fr = (v, d = 2) => num(v, d).replace("{,}", ",").replace(/\\,/g, " ");
const gText = `($g = ${num(G)}\\ \\text{N/kg}$)`;

/** Multiple choice: the right text and the wrong ones, shuffled. */
function choice(rng, right, wrongs) {
  const choices = shuffle(rng, [right, ...wrongs]);
  return { choices, answers: [choices.indexOf(right)] };
}

// ---------- 1. notions (QCM) ----------

function energyFormGen(rng) {
  const s = pick(rng, FORM_SITUATIONS);
  const others = shuffle(rng, Object.keys(FORMS).filter((f) => f !== s.form)).slice(0, 3);
  return {
    type: "energyForm",
    prompt: "Choisis la bonne réponse",
    text: `Sous quelle forme est l'énergie dans cette situation : ${s.what} ?`,
    ...choice(rng, FORMS[s.form], others.map((f) => FORMS[f])),
    hints: [
      "Demande-toi d'abord ce qui porte l'énergie : un objet, des particules, des ondes, des liaisons ?",
      "Un objet qui bouge : énergie cinétique ; un objet immobile mais en hauteur : énergie potentielle.",
      "Agitation des particules : thermique ; ondes : rayonnante ; liaisons entre atomes : chimique ; noyau : nucléaire.",
    ],
    steps: [
      { tex: `\\text{${cap(s.what)}}`, note: "On repère ce qui porte l'énergie." },
      { tex: `\\text{${cap(s.carrier)}}`, note: s.why },
      { tex: `\\text{Énergie ${FORMS[s.form]}}`, note: "C'est la forme d'énergie de cette situation." },
    ],
  };
}

const chainText = (chain) => chain.join(" → ");
const chainTex = (chain) => chain.map((f) => `\\text{${f}}`).join(" \\to ");

function conversionGen(rng) {
  const c = pick(rng, CONVERSIONS);
  const right = chainText(c.chain);
  const pool = new Set(CONVERSIONS.map((o) => chainText(o.chain)).filter((t) => t !== right));
  const reversed = chainText([...c.chain].reverse());
  const wrongs = reversed !== right ? [reversed] : [];
  for (const t of shuffle(rng, [...pool])) if (wrongs.length < 3 && !wrongs.includes(t)) wrongs.push(t);
  return {
    type: "conversion",
    prompt: "Choisis la bonne chaîne de conversion",
    text: `Quelles conversions d'énergie se produisent dans ${c.what} ?`,
    ...choice(rng, right, wrongs),
    hints: [
      "Sous quelle forme est l'énergie au tout début ?",
      "Sous quelle forme est-elle à la fin, quand on l'utilise ?",
      "Les étapes intermédiaires suivent l'ordre réel du dispositif : ce qui se passe d'abord, puis ensuite.",
    ],
    steps: [
      { tex: `\\text{Au départ : énergie ${c.chain[0]}}`, note: "La forme d'énergie de départ." },
      { tex: `\\text{À la fin : énergie ${c.chain.at(-1)}}`, note: "La forme d'énergie obtenue." },
      { tex: chainTex(c.chain), note: c.why },
    ],
  };
}

function heatModeGen(rng) {
  const s = pick(rng, HEAT_SITUATIONS);
  const mode = HEAT_MODES[s.mode];
  return {
    type: "heatMode",
    prompt: "Choisis le mode de transmission de la chaleur",
    text: `${cap(s.what)}. Comment la chaleur se transmet-elle ?`,
    ...choice(rng, mode.name, Object.values(HEAT_MODES).filter((m) => m !== mode).map((m) => m.name)),
    hints: [
      "Y a-t-il de la matière entre le corps chaud et le corps froid ?",
      "Si un liquide ou un gaz se déplace en emportant la chaleur, c'est la convection.",
      "Sans matière, par des ondes électromagnétiques : rayonnement. Dans un solide, sans déplacement : conduction.",
    ],
    steps: [
      { tex: `\\text{${cap(s.what)}}`, note: "On regarde par où passe la chaleur." },
      { tex: `\\text{${cap(mode.name)}}`, note: s.why },
      { tex: `\\text{${cap(mode.name)} : ${mode.rule}}`, note: "La règle du mode de transmission." },
    ],
  };
}

function trueStatementGen(rng) {
  const right = pick(rng, STATEMENTS.true);
  const wrongs = shuffle(rng, STATEMENTS.false).slice(0, 3);
  const c = choice(rng, right.text, wrongs.map((w) => w.text));
  const byText = new Map([[right.text, right], ...wrongs.map((w) => [w.text, w])]);
  return {
    type: "trueStatement",
    prompt: "Choisis la seule affirmation correcte",
    text: "Une seule de ces affirmations est correcte. Laquelle ?",
    ...c,
    hints: [
      "Chaleur et température ne sont pas la même chose : l'une est un transfert d'énergie, l'autre un état.",
      "Pense aux formules : $E_c = \\frac{1}{2} m v^2$, $W = F \\cdot d \\cdot \\cos\\theta$, $\\Delta U = Q + W$.",
      "Méfie-toi des mots « toujours », « toute » et « contient » : vérifie chaque affirmation une par une.",
    ],
    steps: c.choices.map((t) => {
      const s = byText.get(t);
      return { tex: s === right ? "\\text{Vrai}" : "\\text{Faux}", note: `« ${t} » ${s.why}` };
    }),
  };
}

// ---------- 2. énergie mécanique ----------

const MOVING = [
  { name: "une voiture", m: [800, 1600, 50, "kg"], v: [30, 130, 10, "km/h"] },
  { name: "un camion", m: [8000, 20000, 1000, "kg"], v: [30, 90, 10, "km/h"] },
  { name: "un cycliste et son vélo", m: [60, 95, 5, "kg"], v: [15, 45, 5, "km/h"] },
  { name: "une balle de tennis", m: [56, 60, 2, "g"], v: [20, 60, 5, "m/s"] },
  { name: "un ballon de foot", m: [410, 450, 10, "g"], v: [10, 30, 2, "m/s"] },
  { name: "un coureur", m: [55, 85, 5, "kg"], v: [4, 10, 1, "m/s"] },
];

function massStep(m, unit) {
  return unit === "g"
    ? { mk: m / 1000, step: { tex: `m = ${q(m, "g")} = ${q(m / 1000, "kg", 3)}`, note: "La masse doit être en kilogrammes : on divise par 1000." } }
    : { mk: m, step: null };
}

function kineticGen(rng) {
  const o = pick(rng, MOVING);
  const m = stepped(rng, ...o.m.slice(0, 3)), v = stepped(rng, ...o.v.slice(0, 3));
  const { mk, step } = massStep(m, o.m[3]);
  const kmh = o.v[3] === "km/h";
  const vs = kmh ? v / 3.6 : v;
  const Ec = kinetic(mk, vs);
  if (rng() < 0.3 && !kmh) {
    // Speed from the kinetic energy.
    return {
      type: "kinetic",
      prompt: "Calcule la vitesse en m/s",
      text: `${cap(o.name)} de ${Q$(m, o.m[3])} a une énergie cinétique de ${Q$(Ec, "J", 1)}. À quelle vitesse se déplace-t-${/^une/.test(o.name) ? "elle" : "il"} ?`,
      answers: [vs], rel: 0.01, unit: "m/s",
      hints: [
        "Pars de $E_c = \\frac{1}{2} \\cdot m \\cdot v^2$ et isole $v^2$.",
        "$v^2 = \\frac{2 \\cdot E_c}{m}$, avec la masse en kilogrammes.",
        "Il reste à prendre la racine carrée.",
      ],
      steps: [
        ...(step ? [step] : []),
        { tex: "v^2 = \\frac{2 \\cdot E_c}{m}", note: "On isole $v^2$ dans $E_c = \\frac{1}{2} m v^2$." },
        { tex: `v^2 = \\frac{2 \\cdot ${num(Ec, 1)}}{${num(mk, 3)}} = ${num(vs * vs)}`, note: "On remplace (masse en kg)." },
        { tex: `v = \\sqrt{${num(vs * vs)}} = ${q(vs, "m/s")}`, note: `Soit ${fr(vs * 3.6, 1)} km/h (× 3,6).` },
      ],
    };
  }
  const vTex = kmh ? `\\left(\\frac{${v}}{3{,}6}\\right)` : num(v);
  return {
    type: "kinetic",
    prompt: "Calcule l'énergie cinétique en J",
    text: `${cap(o.name)} de ${Q$(m, o.m[3])} se déplace à ${Q$(v, o.v[3])}. Quelle est son énergie cinétique ?`,
    answers: [Ec], rel: 0.01, unit: "J",
    hints: [
      "Convertis d'abord : la masse en kilogrammes et la vitesse en mètres par seconde.",
      "$E_c = \\frac{1}{2} \\cdot m \\cdot v^2$ : seule la vitesse est au carré.",
      "Calcule $v^2$ avant de multiplier par la masse et par ½.",
    ],
    steps: [
      ...(step ? [step] : []),
      ...(kmh ? [{ tex: `v = ${q(v, "km/h")} = \\frac{${v}}{3{,}6}\\ \\text{m/s} \\approx ${q(vs, "m/s")}`, note: "De km/h en m/s : on divise par 3,6." }] : []),
      { tex: "E_c = \\frac{1}{2} \\cdot m \\cdot v^2", note: "Énergie cinétique." },
      { tex: `E_c = \\frac{1}{2} \\cdot ${num(mk, 3)} \\cdot ${vTex}^2`, note: kmh ? "On garde la fraction pour ne pas arrondir la vitesse." : "On remplace (unités SI)." },
      { tex: `E_c \\approx ${q(Ec, "J", 0)}`, note: Ec >= 1e4 ? `Soit environ ${fr(Ec / 1000, 1)} kJ.` : "Le résultat est en joules." },
    ],
  };
}

const HIGH = [
  { m: [1, 5, 0.5, "kg"], h: [3, 20, 1], fem: false, what: (m) => `Un pot de fleurs de ${m} est posé sur un balcon`, at: (h) => `, à ${h} du sol` },
  { m: [100, 250, 10, "g"], h: [2, 6, 0.5], fem: true, what: (m) => `Une pomme de ${m} est accrochée à une branche`, at: (h) => `, à ${h} du sol` },
  { m: [300, 900, 50, "g"], h: [1, 2, 0.1], fem: false, what: (m) => `Un livre de ${m} est posé sur une étagère`, at: (h) => `, à ${h} du sol` },
  { m: [60, 90, 5, "kg"], h: [1000, 4800, 100], fem: false, what: (m) => `Un alpiniste de ${m} gravit une montagne`, at: (h) => ` : il est à ${h} d'altitude (hauteur mesurée depuis le niveau de la mer)` },
  { m: [100, 900, 50, "L"], h: [20, 60, 5], fem: false, what: (m) => `Un château d'eau contient ${m} d'eau (1 L d'eau = 1 kg)`, at: (h) => `, à ${h} du sol` },
];

function potentialGen(rng) {
  const o = pick(rng, HIGH);
  const m = stepped(rng, ...o.m.slice(0, 3)), h = stepped(rng, ...o.h);
  const { mk, step } = massStep(m, o.m[3]);
  const Ep = potential(mk, h);
  const subject = o.what(Q$(m, o.m[3]));
  if (rng() < 0.3) {
    return {
      type: "potential",
      prompt: "Calcule la hauteur en m",
      text: `${subject}. Son énergie potentielle vaut ${Q$(Ep, "J", 2)}. À quelle hauteur se trouve-t-${o.fem ? "elle" : "il"} ? ${gText}`,
      answers: [h], rel: 0.01, unit: "m",
      hints: [
        "Pars de $E_p = m \\cdot g \\cdot h$ et isole $h$.",
        "$h = \\frac{E_p}{m \\cdot g}$, avec la masse en kilogrammes.",
        "Le résultat sort directement en mètres.",
      ],
      steps: [
        ...(step ? [step] : []),
        { tex: "h = \\frac{E_p}{m \\cdot g}", note: "On isole $h$ dans $E_p = m g h$." },
        { tex: `h = \\frac{${num(Ep, 2)}}{${num(mk, 3)} \\cdot ${num(G)}}`, note: "On remplace." },
        { tex: `h \\approx ${q(h, "m")}`, note: "La hauteur en mètres." },
      ],
    };
  }
  return {
    type: "potential",
    prompt: "Calcule l'énergie potentielle en J",
    text: `${subject}${o.at(Q$(h, "m"))}. Quelle est son énergie potentielle ? ${gText}`,
    answers: [Ep], rel: 0.01, unit: "J",
    hints: [
      "Vérifie les unités : la masse en kilogrammes, la hauteur en mètres.",
      "$E_p = m \\cdot g \\cdot h$ : l'énergie potentielle est proportionnelle à la masse et à la hauteur.",
      "Remplace chaque lettre par sa valeur et multiplie.",
    ],
    steps: [
      ...(step ? [step] : []),
      { tex: "E_p = m \\cdot g \\cdot h", note: "Énergie potentielle." },
      { tex: `E_p = ${num(mk, 3)} \\cdot ${num(G)} \\cdot ${num(h)}`, note: "On remplace (unités SI)." },
      { tex: `E_p \\approx ${q(Ep, "J", 1)}`, note: Ep >= 1e4 ? `Soit environ ${fr(Ep / 1000, 1)} kJ.` : "Le résultat est en joules." },
    ],
  };
}

function fallGen(rng) {
  if (rng() < 0.6) {
    const h = stepped(rng, 2, 50, 1);
    const what = pick(rng, ["Une bille", "Un pot de fleurs", "Une pomme", "Un caillou"]);
    const v = fallSpeed(h);
    return {
      type: "fall",
      prompt: "Calcule la vitesse en m/s",
      text: `${what} tombe d'une hauteur de ${Q$(h, "m")}, sans vitesse au départ. On néglige les frottements. À quelle vitesse touche-t-${/^Une/.test(what) ? "elle" : "il"} le sol ? ${gText}`,
      answers: [v], rel: 0.01, unit: "m/s",
      hints: [
        "L'énergie mécanique se conserve : l'énergie potentielle perdue devient de l'énergie cinétique.",
        "Écris $m \\cdot g \\cdot h = \\frac{1}{2} \\cdot m \\cdot v^2$ : la masse se simplifie.",
        "Isole $v$ : $v = \\sqrt{2 \\cdot g \\cdot h}$.",
      ],
      steps: [
        { tex: "E_p(\\text{en haut}) = E_c(\\text{en bas})", note: "Sans frottement, toute l'énergie potentielle devient cinétique." },
        { tex: "m \\cdot g \\cdot h = \\frac{1}{2} \\cdot m \\cdot v^2 \\quad\\Rightarrow\\quad v = \\sqrt{2 \\cdot g \\cdot h}", note: "La masse se simplifie : la vitesse ne dépend pas de la masse." },
        { tex: `v = \\sqrt{2 \\cdot ${num(G)} \\cdot ${num(h)}} \\approx ${q(v, "m/s")}`, note: `Soit environ ${fr(v * 3.6, 0)} km/h.` },
      ],
    };
  }
  const v = stepped(rng, 5, 25, 1);
  const h = riseHeight(v);
  return {
    type: "fall",
    prompt: "Calcule la hauteur en m",
    text: `On lance une balle verticalement vers le haut à ${Q$(v, "m/s")}. On néglige les frottements. Quelle hauteur gagne-t-elle avant de redescendre ? ${gText}`,
    answers: [h], rel: 0.01, unit: "m",
    hints: [
      "L'énergie mécanique se conserve : l'énergie cinétique du départ devient de l'énergie potentielle.",
      "Au point le plus haut, la balle est immobile un instant : $E_c = 0$.",
      "Écris $\\frac{1}{2} \\cdot m \\cdot v^2 = m \\cdot g \\cdot h$, simplifie par $m$, puis isole $h$.",
    ],
    steps: [
      { tex: "E_c(\\text{départ}) = E_p(\\text{en haut})", note: "Au sommet, la vitesse est nulle : toute l'énergie est potentielle." },
      { tex: "\\frac{1}{2} \\cdot m \\cdot v^2 = m \\cdot g \\cdot h \\quad\\Rightarrow\\quad h = \\frac{v^2}{2 \\cdot g}", note: "La masse se simplifie." },
      { tex: `h = \\frac{${v}^2}{2 \\cdot ${num(G)}} \\approx ${q(h, "m")}`, note: "La hauteur gagnée au-dessus du point de lancer." },
    ],
  };
}

// ---------- 3. chaleur et température ----------

const water = MATERIALS[0];
const cData = (mat) => `$c_\\text{${mat.name}} = ${q(mat.c, "c", 0)}$`;

function heatGen(rng) {
  const isWater = rng() < 0.6;
  const mat = isWater ? water : pick(rng, MATERIALS.slice(1));
  let t1, t2;
  if (rng() < 0.65) { t1 = randInt(rng, 5, 30); t2 = isWater ? randInt(rng, t1 + 10, 100) : randInt(rng, t1 + 20, 250); }
  else { t2 = randInt(rng, 15, 30); t1 = isWater ? randInt(rng, t2 + 10, 95) : randInt(rng, t2 + 30, 300); }
  let m, mk, massText, first;
  if (isWater) {
    const mL = stepped(rng, 100, 2000, 50);
    mk = mL / 1000;
    m = mL >= 1000 ? Q$(mL / 1000, "L") : Q$(mL, "mL");
    massText = `${m} d'eau`;
    first = { tex: `m = ${mL >= 1000 ? q(mL / 1000, "L") : q(mL, "mL")} = ${q(mk, "kg", 3)}`, note: "Pour l'eau, 1 L = 1 kg, donc 1 mL = 1 g." };
  } else {
    const g = stepped(rng, 100, 2000, 50);
    mk = g / 1000;
    massText = `un bloc de ${mat.name} de ${Q$(g, "g")}`;
    first = { tex: `m = ${q(g, "g")} = ${q(mk, "kg", 3)}`, note: "La masse doit être en kilogrammes." };
  }
  const Q = heat(mk, mat.c, t1, t2);
  const dT = t2 - t1;
  const verb = dT > 0 ? "est chauffé" : "refroidit";
  return {
    type: "heat",
    prompt: "Calcule Q en J, avec son signe",
    text: `${cap(massText)} ${isWater ? (dT > 0 ? "est chauffée" : "refroidit") : verb} de ${Q$(t1, "°C")} à ${Q$(t2, "°C")}. Quelle chaleur $Q$ échange-t-${isWater ? "elle" : "il"} ? (${cData(mat)})`,
    answers: [Q], rel: 0.01, unit: "J",
    hints: [
      isWater ? "La masse doit être en kilogrammes ; pour l'eau, 1 L = 1 kg." : "La masse doit être en kilogrammes.",
      "$\\Delta T = T_\\text{finale} - T_\\text{initiale}$ : ne l'inverse pas.",
      "$Q = m \\cdot c \\cdot \\Delta T$ ; si le corps se refroidit, $\\Delta T$ et donc $Q$ sont négatifs.",
    ],
    steps: [
      first,
      { tex: `\\Delta T = T_2 - T_1 = ${t2} - ${t1} = ${q(dT, "°C")}`, note: dT > 0 ? "La température monte : $\\Delta T > 0$." : "La température baisse : $\\Delta T < 0$." },
      { tex: `Q = m \\cdot c \\cdot \\Delta T = ${num(mk, 3)} \\cdot ${mat.c} \\cdot ${par(dT)}`, note: "On remplace." },
      { tex: `Q = ${q(Q, "J", 1)}`, note: Q > 0 ? "Positif : le corps reçoit de la chaleur." : "Négatif : le corps cède de la chaleur à l'extérieur." },
    ],
  };
}

function heatFindGen(rng) {
  if (rng() < 0.55) {
    const mat = rng() < 0.6 ? water : pick(rng, MATERIALS.slice(1));
    const mk = stepped(rng, 0.2, 3, 0.1);
    const t1 = randInt(rng, 5, 30), dT = randInt(rng, 5, (mat === water ? 95 : 150) - t1);
    const Q = heat(mk, mat.c, 0, dT), t2 = t1 + dT;
    const what = mat === water ? `${Q$(mk, "kg")} d'eau` : `un bloc de ${mat.name} de ${Q$(mk, "kg")}`;
    return {
      type: "heatFind",
      prompt: "Calcule la température finale en °C",
      text: `On fournit ${Q$(Q, "J", 1)} de chaleur à ${what}, au départ à ${Q$(t1, "°C")}. Quelle est sa température finale ? (${cData(mat)})`,
      answers: [t2], rel: 0.01, unit: "°C",
      hints: [
        "Isole $\\Delta T$ dans $Q = m \\cdot c \\cdot \\Delta T$.",
        "$\\Delta T = \\frac{Q}{m \\cdot c}$, avec la masse en kilogrammes.",
        "$\\Delta T$ est la variation : $T_2 = T_1 + \\Delta T$.",
      ],
      steps: [
        { tex: "\\Delta T = \\frac{Q}{m \\cdot c}", note: "On isole $\\Delta T$." },
        { tex: `\\Delta T = \\frac{${num(Q, 1)}}{${num(mk)} \\cdot ${mat.c}} = ${q(dT, "°C")}`, note: "On remplace." },
        { tex: `T_2 = T_1 + \\Delta T = ${t1} + ${dT} = ${q(t2, "°C")}`, note: "On ajoute la variation à la température de départ." },
      ],
    };
  }
  const t1 = randInt(rng, 5, 30), t2 = randInt(rng, t1 + 10, 100), dT = t2 - t1;
  const mk = stepped(rng, 0.2, 5, 0.1);
  const Q = heat(mk, water.c, t1, t2);
  return {
    type: "heatFind",
    prompt: "Calcule la masse d'eau en kg",
    text: `Pour chauffer de l'eau de ${Q$(t1, "°C")} à ${Q$(t2, "°C")}, il a fallu ${Q$(Q, "J", 1)}. Quelle masse d'eau a-t-on chauffée ? (${cData(water)})`,
    answers: [mk], rel: 0.01, unit: "kg",
    hints: [
      "Calcule d'abord la variation de température $\\Delta T$.",
      "Isole $m$ dans $Q = m \\cdot c \\cdot \\Delta T$.",
      "$m = \\frac{Q}{c \\cdot \\Delta T}$ ; le résultat est en kilogrammes.",
    ],
    steps: [
      { tex: `\\Delta T = ${t2} - ${t1} = ${q(dT, "°C")}`, note: "Variation de température." },
      { tex: "m = \\frac{Q}{c \\cdot \\Delta T}", note: "On isole $m$." },
      { tex: `m = \\frac{${num(Q, 1)}}{${water.c} \\cdot ${dT}} = ${q(mk, "kg")}`, note: `Soit ${fr(mk, 2)} L d'eau.` },
    ],
  };
}

function kelvinGen(rng) {
  const r = rng();
  const hints = [
    "Les deux échelles ont le même pas : seul leur zéro est différent (0 K est le zéro absolu).",
    "Des °C vers les K, on ajoute le décalage entre les deux zéros ; des K vers les °C, on le retire.",
    "Une variation de température a la même valeur en °C et en K.",
  ];
  if (r < 0.4) {
    let c = randInt(rng, -200, 300);
    if (c === 0) c = 37;
    const k = toKelvin(c);
    return {
      type: "kelvin", prompt: "Convertis en kelvins",
      text: `Exprime la température ${Q$(c, "°C")} en kelvins. (0 °C = 273,15 K)`,
      answers: [k], tol: 0.01, unit: "K", hints,
      steps: [
        { tex: "T(\\text{K}) = T({}^\\circ\\text{C}) + 273{,}15", note: "Formule de conversion." },
        { tex: `T = ${par(c)} + 273{,}15`, note: "On remplace." },
        { tex: `T = ${q(k, "K")}`, note: c < 0 ? "Une température en kelvins n'est jamais négative." : "Le kelvin est l'unité SI de température." },
      ],
    };
  }
  if (r < 0.75) {
    let k = randInt(rng, 50, 600);
    if (k === 273) k = 300;
    const c = toCelsius(k);
    return {
      type: "kelvin", prompt: "Convertis en degrés Celsius",
      text: `Exprime la température ${Q$(k, "K")} en degrés Celsius. (0 °C = 273,15 K)`,
      answers: [c], tol: 0.01, unit: "°C", hints,
      steps: [
        { tex: "T({}^\\circ\\text{C}) = T(\\text{K}) - 273{,}15", note: "On retire le décalage." },
        { tex: `T = ${k} - 273{,}15`, note: "On remplace." },
        { tex: `T = ${q(c, "°C")}`, note: c < 0 ? "Sous zéro : plus froid que la glace qui fond." : "Au-dessus de 0 °C." },
      ],
    };
  }
  const t1 = randInt(rng, -20, 40), t2 = randInt(rng, t1 + 5, 100);
  return {
    type: "kelvin", prompt: "Calcule la variation en kelvins",
    text: `La température d'un liquide passe de ${Q$(t1, "°C")} à ${Q$(t2, "°C")}. Quelle est la variation de température $\\Delta T$ en kelvins ?`,
    answers: [t2 - t1], tol: 0.01, unit: "K", hints,
    steps: [
      { tex: `\\Delta T = ${t2} - ${par(t1)} = ${q(t2 - t1, "°C")}`, note: "Variation en degrés Celsius." },
      { tex: `T_1 = ${q(toKelvin(t1), "K")} \\qquad T_2 = ${q(toKelvin(t2), "K")}`, note: "Les mêmes températures en kelvins." },
      { tex: `\\Delta T = ${num(toKelvin(t2))} - ${num(toKelvin(t1))} = ${q(t2 - t1, "K")}`, note: "Le décalage de 273,15 disparaît dans la soustraction : même valeur." },
    ],
  };
}

// ---------- 4. travail ----------

const WORK_HINTS = [
  "Repère l'angle $\\theta$ entre la force et le déplacement (0° si la force est dans le sens du mouvement).",
  "Seule la composante de la force parallèle au déplacement travaille : $W = F \\cdot d \\cdot \\cos\\theta$.",
  "S'il n'y a pas de déplacement, ou si la force est perpendiculaire au déplacement, le travail est nul.",
];

function workGen(rng) {
  const r = rng();
  if (r < 0.1) {
    const F = stepped(rng, 200, 800, 50);
    return {
      type: "work", prompt: "Calcule le travail en J",
      text: `Tu pousses un mur de toutes tes forces (${Q$(F, "N")}) pendant une minute. Le mur ne bouge pas. Quel travail ta force fournit-elle au mur ?`,
      answers: [0], tol: 0.5, unit: "J", hints: WORK_HINTS,
      steps: [
        { tex: "d = 0\\ \\text{m}", note: "Le mur ne bouge pas : il n'y a aucun déplacement." },
        { tex: `W = F \\cdot d = ${F} \\cdot 0`, note: "Le travail demande un déplacement." },
        { tex: "W = 0\\ \\text{J}", note: "On se fatigue, mais la force ne travaille pas." },
      ],
    };
  }
  if (r < 0.2) {
    const F = stepped(rng, 20, 120, 5), d = stepped(rng, 10, 200, 10);
    return {
      type: "work", prompt: "Calcule le travail en J",
      text: `Tu portes un sac de courses en le retenant avec une force verticale de ${Q$(F, "N")}, et tu marches ${Q$(d, "m")} sur un sol horizontal. Quel travail fait la force qui retient le sac ?`,
      answers: [0], tol: 0.5, unit: "J", hints: WORK_HINTS,
      steps: [
        { tex: "\\theta = 90^\\circ", note: "La force est verticale, le déplacement horizontal : ils sont perpendiculaires." },
        { tex: `W = ${F} \\cdot ${d} \\cdot \\cos 90^\\circ = ${F} \\cdot ${d} \\cdot 0`, note: "$\\cos 90^\\circ = 0$." },
        { tex: "W = 0\\ \\text{J}", note: "Une force perpendiculaire au déplacement ne travaille pas." },
      ],
    };
  }
  const F = stepped(rng, 20, 300, 5), d = stepped(rng, 2, 50, 1);
  const inclined = r < 0.75;
  const theta = inclined ? pick(rng, [20, 25, 30, 35, 40, 45, 50, 60]) : 0;
  const W = work(F, d, theta);
  const text = inclined
    ? pick(rng, [
      `Tu tires une luge avec une force de ${Q$(F, "N")} ; la corde fait un angle de $${theta}^\\circ$ avec le sol. La luge avance de ${Q$(d, "m")}. Quel travail fournit ta force ?`,
      `Tu tires une valise à roulettes sur ${Q$(d, "m")} avec une force de ${Q$(F, "N")}, inclinée de $${theta}^\\circ$ par rapport au sol. Quel travail fournit ta force ?`,
    ])
    : pick(rng, [
      `Tu pousses un chariot horizontalement avec une force de ${Q$(F, "N")} sur ${Q$(d, "m")}. Quel travail fournit ta force ?`,
      `Un treuil tire une caisse sur ${Q$(d, "m")} avec un câble parallèle au sol, d'une force de ${Q$(F, "N")}. Quel travail fournit le treuil ?`,
    ]);
  const steps = inclined
    ? [
      { tex: "W = F \\cdot d \\cdot \\cos\\theta", note: "La force est inclinée : seule sa composante parallèle au sol travaille." },
      { tex: `W = ${F} \\cdot ${d} \\cdot \\cos ${theta}^\\circ`, note: "On remplace." },
      { tex: `\\cos ${theta}^\\circ \\approx ${num(cosDeg(theta), 3)}`, note: `Calculatrice : cos(${theta}°).` },
      { tex: `W \\approx ${q(W, "J", 1)}`, note: `Moins que $F \\cdot d = ${F * d}$ J : une partie de la force ne sert pas à avancer.` },
    ]
    : [
      { tex: "\\theta = 0^\\circ \\quad\\Rightarrow\\quad W = F \\cdot d", note: "La force est parallèle au déplacement : $\\cos 0^\\circ = 1$." },
      { tex: `W = ${F} \\cdot ${d}`, note: "On remplace (N et m)." },
      { tex: `W = ${q(W, "J", 1)}`, note: "1 J = 1 N · 1 m." },
    ];
  return { type: "work", prompt: "Calcule le travail en J", text, answers: [W], rel: 0.01, unit: "J", hints: WORK_HINTS, steps };
}

function workFindGen(rng) {
  const theta = pick(rng, [0, 0, 20, 30, 45, 60]);
  const F = stepped(rng, 20, 300, 5), d = stepped(rng, 2, 50, 1);
  const W = work(F, d, theta);
  const angle = theta ? `, inclinée de $${theta}^\\circ$ par rapport au déplacement` : ", parallèle au déplacement";
  const cos = theta ? ` \\cdot \\cos ${theta}^\\circ` : "";
  const findF = rng() < 0.5;
  const hints = [
    "Pars de $W = F \\cdot d \\cdot \\cos\\theta$.",
    "Isole l'inconnue : divise le travail par les deux autres facteurs.",
    theta ? "N'oublie pas le $\\cos\\theta$ au dénominateur." : "La force est parallèle : $\\cos 0^\\circ = 1$.",
  ];
  if (findF) {
    return {
      type: "workFind", prompt: "Calcule la force en N",
      text: `Pour déplacer une caisse de ${Q$(d, "m")}, on la tire avec une force${angle}. Cette force fournit un travail de ${Q$(W, "J", 1)}. Quelle est l'intensité de la force ?`,
      answers: [F], rel: 0.01, unit: "N", hints,
      steps: [
        { tex: `F = \\frac{W}{d${cos}}`, note: "On isole $F$." },
        { tex: `F = \\frac{${num(W, 1)}}{${d}${cos}}`, note: "On remplace." },
        { tex: `F \\approx ${q(F, "N")}`, note: "La force en newtons." },
      ],
    };
  }
  return {
    type: "workFind", prompt: "Calcule la distance en m",
    text: `Une force de ${Q$(F, "N")}${angle}, fournit un travail de ${Q$(W, "J", 1)}. Sur quelle distance l'objet s'est-il déplacé ?`,
    answers: [d], rel: 0.01, unit: "m", hints,
    steps: [
      { tex: `d = \\frac{W}{F${cos}}`, note: "On isole $d$." },
      { tex: `d = \\frac{${num(W, 1)}}{${F}${cos}}`, note: "On remplace." },
      { tex: `d \\approx ${q(d, "m")}`, note: "La distance en mètres." },
    ],
  };
}

// ---------- 5. premier principe ----------

function heatPhrase(Q) {
  return Q > 0 ? `reçoit ${Q$(Q, "J")} de chaleur` : `cède ${Q$(-Q, "J")} de chaleur à l'extérieur`;
}
function workPhrase(W) {
  return W > 0 ? `on le comprime en lui fournissant un travail de ${Q$(W, "J")}` : `il se détend en fournissant un travail de ${Q$(-W, "J")}`;
}
function uPhrase(dU) {
  return dU > 0 ? `augmente de ${Q$(dU, "J")}` : dU < 0 ? `diminue de ${Q$(-dU, "J")}` : "ne change pas";
}
const signNote = (name, v) => (v > 0 ? `${name} reçu par le gaz : positif.` : `${name} cédé par le gaz : négatif.`);

function firstLawGen(rng) {
  const sign = () => (rng() < 0.5 ? -1 : 1);
  const Q = sign() * stepped(rng, 100, 2000, 50), W = sign() * stepped(rng, 50, 1500, 50);
  const dU = Q + W;
  const ask = pick(rng, ["dU", "dU", "Q", "W"]);
  const hints = [
    "Convention : ce que le système reçoit est positif, ce qu'il cède (ou fournit) est négatif.",
    "Traduis chaque phrase de l'énoncé en un nombre avec son signe.",
    ask === "dU" ? "Premier principe : $\\Delta U = Q + W$." : "Premier principe : $\\Delta U = Q + W$, puis isole l'inconnue.",
  ];
  const T = dU > 0 ? "U augmente : la température du gaz monte." : dU < 0 ? "U diminue : la température du gaz baisse." : "U ne change pas : la température reste la même.";
  if (ask === "dU") {
    return {
      type: "firstLaw", prompt: "Calcule ΔU en J, avec son signe",
      text: `Un gaz enfermé dans un cylindre ${heatPhrase(Q)}, et ${workPhrase(W)}. Quelle est la variation de son énergie interne $\\Delta U$ ?`,
      answers: [dU], tol: 0.5, unit: "J", hints,
      steps: [
        { tex: `Q = ${q(Q, "J")}`, note: signNote("Chaleur", Q) },
        { tex: `W = ${q(W, "J")}`, note: signNote("Travail", W) },
        { tex: `\\Delta U = Q + W = ${num(Q)} + ${par(W)} = ${q(dU, "J")}`, note: T },
      ],
    };
  }
  if (ask === "Q") {
    return {
      type: "firstLaw", prompt: "Calcule Q en J, avec son signe",
      text: `L'énergie interne d'un gaz ${uPhrase(dU)} alors que ${workPhrase(W)}. Quelle chaleur $Q$ le gaz a-t-il échangée ?`,
      answers: [Q], tol: 0.5, unit: "J", hints,
      steps: [
        { tex: `\\Delta U = ${q(dU, "J")} \\qquad W = ${q(W, "J")}`, note: `${signNote("Travail", W)} $\\Delta U$ est positif si U augmente.` },
        { tex: "\\Delta U = Q + W \\quad\\Rightarrow\\quad Q = \\Delta U - W", note: "On isole $Q$." },
        { tex: `Q = ${num(dU)} - ${par(W)} = ${q(Q, "J")}`, note: Q > 0 ? "Positif : le gaz a reçu de la chaleur." : "Négatif : le gaz a cédé de la chaleur." },
      ],
    };
  }
  return {
    type: "firstLaw", prompt: "Calcule W en J, avec son signe",
    text: `Un gaz ${heatPhrase(Q)} et son énergie interne ${uPhrase(dU)}. Quel travail $W$ le gaz a-t-il échangé ?`,
    answers: [W], tol: 0.5, unit: "J", hints,
    steps: [
      { tex: `\\Delta U = ${q(dU, "J")} \\qquad Q = ${q(Q, "J")}`, note: `${signNote("Chaleur", Q)} $\\Delta U$ est positif si U augmente.` },
      { tex: "\\Delta U = Q + W \\quad\\Rightarrow\\quad W = \\Delta U - Q", note: "On isole $W$." },
      { tex: `W = ${num(dU)} - ${par(Q)} = ${q(W, "J")}`, note: W > 0 ? "Positif : le gaz a reçu un travail (il a été comprimé)." : "Négatif : le gaz a fourni un travail (il s'est détendu)." },
    ],
  };
}

function cycleGen(rng) {
  const Q1 = stepped(rng, 1000, 5000, 100);
  const Wout = Math.round((Q1 * randInt(rng, 15, 45)) / 100 / 50) * 50;
  const Q2 = -(Q1 - Wout), W = -Wout;
  const rendement = Math.round((Wout / Q1) * 100);
  const hints = [
    "Sur un cycle, le moteur revient à son état de départ : $\\Delta U = 0$.",
    "Donc la somme de toutes les chaleurs et de tous les travaux échangés est nulle.",
    "Attention aux signes : reçu positif, cédé ou fourni négatif.",
  ];
  if (rng() < 0.5) {
    return {
      type: "cycle", prompt: "Calcule Q₂ en J, avec son signe",
      text: `Sur un cycle, un moteur thermique reçoit ${Q$(Q1, "J")} de chaleur de la source chaude et fournit un travail de ${Q$(Wout, "J")}. Quelle chaleur $Q_2$ échange-t-il avec la source froide ?`,
      answers: [Q2], tol: 0.5, unit: "J", hints,
      steps: [
        { tex: "\\Delta U = Q_1 + Q_2 + W = 0", note: "Un cycle : l'énergie interne revient à sa valeur de départ." },
        { tex: `Q_1 = ${q(Q1, "J")} \\qquad W = ${q(W, "J")}`, note: "Chaleur reçue : positive ; travail fourni : négatif." },
        { tex: `Q_2 = -Q_1 - W = -${num(Q1)} + ${num(Wout)} = ${q(Q2, "J")}`, note: `Négatif : le moteur cède cette chaleur à la source froide. Seuls ${rendement} % de la chaleur reçue deviennent du travail (rendement).` },
      ],
    };
  }
  return {
    type: "cycle", prompt: "Calcule W en J, avec son signe",
    text: `Sur un cycle, un moteur thermique reçoit ${Q$(Q1, "J")} de chaleur de la source chaude et cède ${Q$(-Q2, "J")} à la source froide. Quel travail $W$ échange-t-il sur ce cycle ?`,
    answers: [W], tol: 0.5, unit: "J", hints,
    steps: [
      { tex: "\\Delta U = Q_1 + Q_2 + W = 0", note: "Un cycle : l'énergie interne revient à sa valeur de départ." },
      { tex: `Q_1 = ${q(Q1, "J")} \\qquad Q_2 = ${q(Q2, "J")}`, note: "Chaleur reçue : positive ; chaleur cédée : négative." },
      { tex: `W = -Q_1 - Q_2 = -${num(Q1)} + ${num(-Q2)} = ${q(W, "J")}`, note: `Négatif : le moteur fournit ce travail. Rendement : ${rendement} % de la chaleur reçue.` },
    ],
  };
}

// ---------- catalogue ----------

export const TYPES = {
  energyForm: { label: "Formes d'énergie", level: 1, gen: energyFormGen },
  conversion: { label: "Chaînes de conversion", level: 1, gen: conversionGen },
  heatMode: { label: "Conduction, convection, rayonnement", level: 1, gen: heatModeGen },
  trueStatement: { label: "Vrai ou faux : pièges classiques", level: 1, gen: trueStatementGen },
  kinetic: { label: "Énergie cinétique", level: 2, gen: kineticGen },
  potential: { label: "Énergie potentielle", level: 2, gen: potentialGen },
  fall: { label: "Chute et lancer (conservation)", level: 2, gen: fallGen },
  kelvin: { label: "Degrés Celsius et kelvins", level: 3, gen: kelvinGen },
  heat: { label: "Chaleur Q = m·c·ΔT", level: 3, gen: heatGen },
  heatFind: { label: "Température finale ou masse", level: 3, gen: heatFindGen },
  work: { label: "Travail d'une force", level: 4, gen: workGen },
  workFind: { label: "Force ou distance à partir du travail", level: 4, gen: workFindGen },
  firstLaw: { label: "Premier principe ΔU = Q + W", level: 5, gen: firstLawGen },
  cycle: { label: "Machine thermique (cycle)", level: 5, gen: cycleGen },
};

export const LEVELS = [
  { id: 1, label: "Notions" },
  { id: 2, label: "Énergie mécanique" },
  { id: 3, label: "Chaleur et température" },
  { id: 4, label: "Travail" },
  { id: 5, label: "Premier principe" },
];

export function generate(choiceId = "all", rng = Math.random) {
  let ids = Object.keys(TYPES);
  if (choiceId.startsWith("level:")) ids = ids.filter((id) => TYPES[id].level === Number(choiceId.slice(6)));
  else if (choiceId !== "all") ids = [choiceId];
  return TYPES[pick(rng, ids)].gen(rng);
}

// ---------- answers ----------

/** Units accepted for each expected unit, with their factor. */
const UNITS = {
  J: { j: 1, kj: 1e3, mj: 1e6 },
  "m/s": { "m/s": 1, "km/h": 1 / 3.6 },
  m: { m: 1, km: 1e3, cm: 1e-2 },
  kg: { kg: 1, g: 1e-3 },
  N: { n: 1, kn: 1e3 },
  "°C": { "°c": 1, "°": 1 },
  K: { k: 1 },
};

/**
 * "-1050 J", "2,5 kJ", "36 km/h", "1,2·10^5" → { value } in the expected unit,
 * { badUnit } for a unit that does not fit, or null when unreadable.
 */
export function parseAnswer(text, unit) {
  const t = text.toLowerCase().replace(/[−–]/g, "-").replace(/\s+/g, "");
  if (!t) return null;
  const [, number, suffix] = t.match(/^(.*?)(kj|mj|j|m\/s|km\/h|km|cm|kg|kn|°c|°|m|g|n|k)?$/);
  const value = readNumber(number);
  if (!Number.isFinite(value)) return null;
  if (!suffix) return { value };
  const factor = UNITS[unit]?.[suffix];
  return factor === undefined ? { badUnit: suffix } : { value: value * factor };
}

const close = (ex, v, a) => Math.abs(v - a) <= Math.max(ex.tol ?? 1e-9, ex.rel ? Math.abs(a) * ex.rel : 0);

/** { ok, values } (values null = unreadable, then badUnit may say why). */
export function checkAnswer(ex, text) {
  if (ex.choices) {
    const i = /^\d+$/.test(text.trim()) ? Number(text) : NaN;
    return { ok: i === ex.answers[0], values: Number.isInteger(i) ? [i] : null };
  }
  const r = parseAnswer(text, ex.unit);
  if (!r || r.badUnit) return { ok: false, values: null, badUnit: r?.badUnit };
  return { ok: close(ex, r.value, ex.answers[0]), values: [r.value] };
}

/** Small deterministic generator (mulberry32), for tests and worked examples. */
export function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
