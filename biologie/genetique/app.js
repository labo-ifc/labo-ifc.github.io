// Entry point: static formulas, chapters, labs, trainer, theme and chapter navigation.

import { renderStaticTex } from "../../shared/tex.js";
import { initTheme } from "../../shared/theme.js";
import { initLessons } from "./lessons.js";
import { initTrainer } from "./trainer.js";
import { initCourse } from "../../shared/course.js";

renderStaticTex();
const lessons = initLessons();
const trainer = initTrainer();
initTheme(document.getElementById("theme-toggle"), lessons.render);
initCourse({ trainer });
