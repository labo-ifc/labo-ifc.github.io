// Family trees of the course's exercises, redrawn (columns set by hand).
//
// One line per generation: "id:code@x" tokens, code = sex (m, f, ? unborn) then flags
// (* affected, c carrier shown, g grey, x cross), "=Name" optional. Families: [father/mother, other, kids, twins?].

function make(gens, fams, traitOf = (p) => p.flags.includes("*")) {
  const people = {};
  gens.forEach((line, g) => {
    for (const tok of line.trim().split(/\s+/)) {
      const [, id, sex, flags, x, name] = tok.match(/^(\w+):([mf?])([*cgx]*)@([\d.]+)(?:=(.+))?$/);
      people[id] = { sex, g, x: Number(x), flags, name: name?.replace(/_/g, " ") };
    }
  });
  for (const p of Object.values(people)) {
    if (p.sex !== "?") p.aff = traitOf(p);
    if (p.flags.includes("c")) p.carrier = true;
    if (p.flags.includes("g")) p.grey = true;
    if (p.flags.includes("x")) p.cross = true;
    delete p.flags;
  }
  for (let g = 0; g < gens.length; g++) {
    Object.values(people).filter((p) => p.g === g && p.sex !== "?").sort((a, b) => a.x - b.x).forEach((p, i) => { p.n = i + 1; });
  }
  const families = fams.map(([a, b, kids, twins]) => ({ parents: [a, b], kids, ...(twins ? { twins } : {}) }));
  return { people, families };
}

/** Eye colour: filled = blue eyes. */
const eyes = () => make([
  "i1:f@1 i2:m@2",
  "a1:m@0 a2:m@1 a3:f*@2 a4:f@3 a5:f*@4 s1:m@5 b1:f@10 b2:m*@11",
  "c1:m@0 c2:m*@1 c3:m*@2 c4:f@3 c5:f@4 c6:m@5 c7:m@6 c8:f*@7 d1:m*@8 d2:f@9 d3:f*@10 d4:m*@11 d5:m@12 d6:m@13 d7:f@14",
  "e1:f*@6 e2:m*@7 e3:f*@8 e4:f*@9",
], [
  ["i2", "i1", ["a1", "a2", "a3", "a4", "a5"]],
  ["s1", "a5", ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"]],
  ["b2", "b1", ["d1", "d2", "d3", "d4", "d5", "d6", "d7"]],
  ["d1", "c8", ["e1", "e2", "e3", "e4"]],
]);

/** Red hair: filled = roux. */
const hair = () => make([
  "i1:f*@3.5 i2:m@4.5",
  "a1:m@0.5 a2:f*@1.5 a3:m@3.5 a4:f@4.5 a5:m*@6.5 a6:f@7.5",
  "b1:m@0 b2:f@1 b3:f*@2 b4:f@3.5 b5:f*@4.5 b6:m@6 b7:m@7 b8:m@8",
], [
  ["i2", "i1", ["a2", "a3", "a5"]],
  ["a1", "a2", ["b1", "b2", "b3"]],
  ["a3", "a4", ["b4", "b5"]],
  ["a5", "a6", ["b6", "b7", "b8"]],
]);

/** Albinism. */
const albino = () => make([
  "i1:f@3.5 i2:m@4.5",
  "a1:m@1.5 a2:f@2.5 a3:m@3.5 a4:m*@4.5 a5:f@5.5",
  "b1:m@0.5 b2:f*@1.5 b3:m@2.5",
  "c1:f@0 c2:f*@1 c3:m@2",
], [
  ["i2", "i1", ["a2", "a3", "a4", "a5"]],
  ["a1", "a2", ["b2", "b3"]],
  ["b1", "b2", ["c1", "c2", "c3"]],
]);

/** Otosclerosis (otospongiose). */
const otosclerosis = () => make([
  "i1:f*@4.75 i2:m@5.75",
  "a1:f@0.5 a2:m*@1.5 a3:m@3 a4:f@4 a5:f*@5.5 a6:m@6.5 a7:m@9 a8:f@10",
  "b1:m*@0 b2:f*@1 b3:f@2 b4:f@3.5 b5:f@5 b6:m*@6 b7:f*@7 b8:m@8.5 b9:m@9.5 b10:f@10.5",
], [
  ["i2", "i1", ["a2", "a3", "a5", "a7"]],
  ["a2", "a1", ["b1", "b2", "b3"]],
  ["a3", "a4", ["b4"]],
  ["a6", "a5", ["b5", "b6", "b7"]],
  ["a7", "a8", ["b8", "b9", "b10"]],
]);

/** Lesch-Nyhan syndrome. */
const leschNyhan = () => make([
  "i1:m@12 i2:fc@13",
  "a1:m*@8 a2:f@9 s1:m@10 a3:m*@11 a4:m*@12 a5:m*@13 a6:m*@14 a7:f@15 a8:m*@16 a9:m*@17",
  "t1:m@2 b1:f@3 b2:f@7 t2:m@8 b3:f@11.5 t3:m@12.5 b4:f@16 t4:m@17",
  "c1:f@0.5 u1:m@1.5 c2:m*@3 c3:f@4.5 u2:m@5.5 d1:m*@7 d2:m@8 e1:m*@9.5 e2:m@10.5 e3:m*@11.5 e4:f@12.5 e5:m@13.5 e6:m*@14.5 f1:m@16 f2:m*@17",
  "v1:m*@0 v2:m*@1 v3:?@2 v4:m@5",
], [
  ["i1", "i2", ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9"]],
  ["s1", "a2", ["b1", "b2", "b3", "b4"]],
  ["t1", "b1", ["c1", "c2", "c3"]],
  ["t2", "b2", ["d1", "d2"], ["d1", "d2"]],
  ["t3", "b3", ["e1", "e2", "e3", "e4", "e5", "e6"]],
  ["t4", "b4", ["f1", "f2"]],
  ["u1", "c1", ["v1", "v2", "v3"]],
  ["u2", "c3", ["v4"]],
]);

/** Haemophilia A, with first names. */
const haemophilia = () => make([
  "i1:m@5=Christian i2:fc@6.5=Marie_France",
  "s1:m@0.5 a1:f@1.5 a2:m*@3 a3:f@4 a4:f@6.5=Chloé s2:m@7.5 a5:m@9=Jacques a6:m*@10=Arthur",
  "b1:f@0 b2:m*@1 b3:f@2=Pauline c1:f@5 c2:f@6 c3:f@7 c4:m*@8=Oscar c5:m@9",
], [
  ["i1", "i2", ["a1", "a2", "a3", "a4", "a5", "a6"]],
  ["s1", "a1", ["b1", "b2", "b3"]],
  ["s2", "a4", ["c1", "c2", "c3", "c4", "c5"]],
]);

/** Exercise 9: cross = haemophilia, grey = red hair; `trait` picks what "affected" means. */
const twoTraits = (trait) => make([
  "i1:m@3.75 i2:fx@4.75",
  "a1:mx@0 s1:f@1 a2:fg@2.5 s2:mg@3.5 a3:mx@5 a4:mgx@6 s3:f@7 a5:fg@8.5 s4:m@9.5",
  "b1:f@0.5 b2:mgx@2 b3:mgx@3 b4:fg@4 b5:m@6.5 b6:mgx@8.5 b7:fg@9.5",
], [
  ["i1", "i2", ["a1", "a2", "a3", "a4", "a5"]],
  ["a1", "s1", ["b1"]],
  ["s2", "a2", ["b2", "b3", "b4"]],
  ["a4", "s3", ["b5"]],
  ["s4", "a5", ["b6", "b7"]],
], (p) => p.flags.includes(trait === "roux" ? "g" : "x"));

/** Trees of the pedigree lab and of the exercises (id → { label, tree() }). */
export const FAMILIES = {
  eyes: { label: "Couleur des yeux (bleus en plein)", tree: eyes, ex: 1 },
  hair: { label: "Cheveux roux", tree: hair, ex: 2 },
  albino: { label: "Albinisme", tree: albino, ex: 3 },
  otosclerosis: { label: "Otospongiose", tree: otosclerosis, ex: 4 },
  leschNyhan: { label: "Syndrome de Lesch-Nyhan", tree: leschNyhan, ex: 5 },
  haemophilia: { label: "Hémophilie A (famille de Christian)", tree: haemophilia, ex: 7 },
  roux9: { label: "Exercice 9 : cheveux roux (gris)", tree: () => twoTraits("roux"), ex: 9 },
  hemo9: { label: "Exercice 9 : hémophilie (croix)", tree: () => twoTraits("hemo"), ex: 9 },
};
