// Ronda 32: genera apps/game/assets/title-bg.webp IDÉNTICO a reference/ui/NuevaPantallaInicio.webp
// (mismo logo horneado, mismo marco, MISMA ruedita horneada) pero con la placa del botón JUGAR
// vacía (reference/ui/Fondorenovadoinicio.png, mismo render/composición a mayor resolución) para
// que el texto sea 100% DOM/traducible en vez de horneado en español.
//
// Se usa Chromium headless (Playwright, ya pineado en el repo) porque no hay cwebp/ImageMagick
// disponibles en este entorno.
//
// Pipeline: (1) base = Fondorenovadoinicio.png tal cual, SIN retoques — nada de blur/vignette;
// (2) la ruedita se recorta de NuevaPantallaInicio.webp (que sí la trae horneada) y se pega
// escalada en la posición equivalente de la base — ambas imágenes son el MISMO render a distinta
// resolución (1402x789 vs 1672x941, misma proporción 16:9), así que un solo factor de escala
// (S = 1672/1402) alinea cualquier coordenada de una a la otra.
import { chromium } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const basePath = path.resolve('reference/ui/Fondorenovadoinicio.png');
const gearSrcPath = path.resolve('reference/ui/NuevaPantallaInicio.webp');
const outPath = path.resolve('apps/game/assets/title-bg.webp');

const browser = await chromium.launch();
const page = await browser.newPage();

async function loadImage(p) {
  await page.goto(pathToFileURL(p).href);
  return page.evaluate(() => {
    const img = document.querySelector('img');
    return { w: img.naturalWidth, h: img.naturalHeight, src: img.src };
  });
}

const base = await loadImage(basePath);
console.log('base', base);

// Ambas imágenes como data: URI (evita que Chromium las trate como orígenes file:// distintos y
// "tainte" el canvas al mezclar drawImage de dos orígenes — con data: no hay fetch cross-origin).
const baseDataUri = `data:image/png;base64,${fs.readFileSync(basePath).toString('base64')}`;
const gearDataUri = `data:image/webp;base64,${fs.readFileSync(gearSrcPath).toString('base64')}`;

const tmpHtml = path.resolve('agentes/scripts/.tmp-composite-ronda32.html');
fs.writeFileSync(tmpHtml, `<img id="base" src="${baseDataUri}" /><img id="gear" src="${gearDataUri}" />`);
await page.goto(pathToFileURL(tmpHtml).href);
await page.waitForFunction(() => {
  const a = document.querySelector('#base');
  const b = document.querySelector('#gear');
  return a.complete && a.naturalWidth > 0 && b.complete && b.naturalWidth > 0;
});

const webpBuffer = await page.evaluate(async () => {
  const baseImg = document.querySelector('#base');
  const gearImg = document.querySelector('#gear');
  const w = baseImg.naturalWidth;
  const h = baseImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(baseImg, 0, 0);

  // Escala entre NuevaPantallaInicio.webp (1402x789, origen de la ruedita horneada) y la base
  // (1672x941): mismo render, misma proporción — un solo factor alinea coordenadas.
  const scale = w / gearImg.naturalWidth;

  // Rect de la ruedita en el espacio de NuevaPantallaInicio.webp (medido por escaneo de píxeles
  // dorados + verificación visual por crop, agentes/scripts/gear-crop3.png durante el desarrollo).
  const gearSrc = { x: 1253, y: 647, w: 143, h: 135 };
  const gearDest = {
    x: gearSrc.x * scale,
    y: gearSrc.y * scale,
    w: gearSrc.w * scale,
    h: gearSrc.h * scale,
  };
  ctx.drawImage(gearImg, gearSrc.x, gearSrc.y, gearSrc.w, gearSrc.h, gearDest.x, gearDest.y, gearDest.w, gearDest.h);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
  const arrayBuffer = await blob.arrayBuffer();
  return { bytes: Array.from(new Uint8Array(arrayBuffer)), gearDest };
});

fs.writeFileSync(outPath, Buffer.from(webpBuffer.bytes));
console.log('gearDest (para calibrar el anclaje CSS del engranaje real)', webpBuffer.gearDest);
console.log('wrote', outPath, fs.statSync(outPath).size, 'bytes');
fs.unlinkSync(tmpHtml);

await browser.close();
