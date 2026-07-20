// Ronda 32: convierte reference/ui/Fondorenovadoinicio.png (fondo provisto por el usuario) a
// apps/game/assets/title-bg.webp usando Chromium headless (Playwright ya está pineado en el
// repo) porque no hay cwebp/ImageMagick disponibles en este entorno.
//
// DECISIÓN (documentada también en TitleScreen.js/layout.css): el .png provisto trae horneados
// el EMBLEMA "DUMPSTER EMPIRE" y la PLACA vacía del botón (marco dorado sin texto) — no el texto
// "JUGAR" ni el engranaje, así que técnicamente cumple el requisito mínimo de la ronda 32
// (§32.2), pero ambos elementos horneados rompen el approach "controles reales, sin depender de
// la posición del arte" (§32.1 intro): en `object-fit:cover` un elemento horneado se recorta o
// queda descentrado respecto al control DOM real en proporciones distintas a la del arte
// original — verificado en la práctica: a 375x667 el emblema horneado queda cortado a los
// costados (ilegible), y a 1920x1080 la placa vacía del botón queda visible junto al botón real
// como si hubiera "dos botones". Se retocan AMBAS zonas fuera del canvas antes de exportar
// (parche borroso con máscara suave, sin recorte duro) y el emblema pasa a ser 100% DOM
// (`.title-logo`, ya NO se oculta con `.sr-only` al quedar el arte "ready" — layout.css/
// TitleScreen.js), consistente con JUGAR y el engranaje.
import { chromium } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const srcPath = path.resolve('reference/ui/Fondorenovadoinicio.png');
const outPath = path.resolve('apps/game/assets/title-bg.webp');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(srcPath).href);
const dims = await page.evaluate(() => {
  const img = document.querySelector('img');
  return { w: img.naturalWidth, h: img.naturalHeight };
});
console.log('dims', dims);
await page.setViewportSize({ width: dims.w, height: dims.h });

const webpBuffer = await page.evaluate(async () => {
  const img = document.querySelector('img');
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const main = document.createElement('canvas');
  main.width = w;
  main.height = h;
  const ctx = main.getContext('2d');
  ctx.drawImage(img, 0, 0);

  /** Difumina `rect` tomando como fuente una franja vertical de `srcY` (mismo tamaño), con
   * máscara suave (blur fuerte sobre un rect sólido) para que no quede un borde recto visible. */
  function blurPatch(rect, srcY) {
    const overscan = 70;
    const patch = document.createElement('canvas');
    patch.width = w;
    patch.height = h;
    const patchCtx = patch.getContext('2d');
    patchCtx.filter = 'blur(24px)';
    patchCtx.drawImage(
      main,
      rect.x - overscan,
      Math.max(0, srcY),
      rect.w + overscan * 2,
      rect.h + overscan * 2,
      rect.x - overscan,
      rect.y - overscan,
      rect.w + overscan * 2,
      rect.h + overscan * 2
    );
    patchCtx.globalCompositeOperation = 'destination-in';
    patchCtx.filter = 'blur(45px)';
    patchCtx.fillStyle = 'rgba(255,255,255,1)';
    patchCtx.fillRect(rect.x - 10, rect.y - 10, rect.w + 20, rect.h + 20);
    patchCtx.filter = 'none';
    ctx.drawImage(patch, 0, 0);
  }

  function vignette(rect) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const radius = Math.hypot(rect.w, rect.h) * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(10,8,4,0.38)');
    grad.addColorStop(1, 'rgba(10,8,4,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Placa vacía del botón (rect + margen generoso: cubre también los remaches/rombos que
  // sobresalen arriba y abajo del marco). Fuente: franja de arriba (cielo/skyline, más continuo
  // verticalmente en esa composición que lo que hay debajo).
  const platePlate = { x: 460, y: 500, w: 760, h: 330 };
  blurPatch(platePlate, platePlate.y - platePlate.h - 20);
  vignette(platePlate);

  // El emblema "DUMPSTER EMPIRE" horneado NO se retoca acá (un blurPatch tan grande se vio como
  // un manchón — descartado): se atenúa con un scrim CSS en layout.css (`.title-top-scrim`,
  // independiente de la proporción del viewport) y el emblema real pasa a ser 100% DOM, siempre
  // visible (TitleScreen.js ya no le pone `.sr-only` al quedar el arte "ready").

  const blob = await new Promise((resolve) => main.toBlob(resolve, 'image/webp', 0.9));
  const arrayBuffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
});

fs.writeFileSync(outPath, Buffer.from(webpBuffer));
console.log('wrote', outPath, fs.statSync(outPath).size, 'bytes');

await browser.close();
