# PUNTOS A MEJORAR — Ronda 4 (brief para el agente planificador)

> **VITAL para el correcto funcionamiento del juego.** Reportado jugando el build de escritorio
> (`main` con la auditoría del Agente 11). Un agente **Opus 4.8 high** determina causas y arma el plan;
> **Sonnet 5.0 medium** lo ejecuta (rama `fix/...` → PR a `main`).
>
> **No asumir diagnósticos previos.** Los problemas 1 y 3 ya "se arreglaron" en rondas anteriores y
> **volvieron**. Reproducí visualmente antes de concluir la causa. Cerrar con test de regresión donde
> se pueda, `npm test` + `npm run test:e2e` verdes, HANDOFF actualizado.

---

## 1. Canvas de escarbado — capa de suciedad no opaca, nombres faltantes, parches a medias

**Síntomas (ver captura del usuario):**
- La capa de suciedad, en las zonas **sin rascar**, se ve como **damero transparente** (el indicador
  de transparencia del canvas) en vez de suciedad opaca. Por eso:
- **A veces se ve el objeto ANTES de rascar** (la capa de arriba no tapa la de abajo).
- Quedan **parches sin rascar / a medias**, sobre todo en las **bandas de arriba y abajo del todo**,
  que el arrastre no alcanza y que **no se limpian al completar** el escarbado.
- **A veces los objetos no tienen nombre** (intermitente; ya se "arregló" en ronda 2 y volvió).

**Verificado en código (contexto, NO conclusión de causa):**
- `apps/game/src/dig/DigCanvas.js` → `drawTopLayer()` hace `fillStyle='#4a3526'` (opaco) y luego overlaya
  un patrón (`getDirtTexture()`, tile 16×16 con `rgba(...,0.18)`/`rgba(...,0.05)` sobre base **sin fill
  opaco propio**). Que en runtime la capa se vea transparente sugiere que la opacidad real de la capa
  de arriba no es la esperada — reproducir y confirmar por qué (¿el tile queda mayormente transparente?,
  ¿un `globalCompositeOperation` mal reseteado?, ¿la reparación de anomalía de ronda 3 repinta mal?).
- El nombre se dibuja en `drawBottomLayer()` (círculo → ícono async → nombre). La carga async del ícono
  puede pisar/omitir el nombre según timing (la ronda 2 dijo haberlo cerrado con un contador de
  generación; verificar por qué reaparece).

**Comportamiento deseado:**
- Antes de rascar, la suciedad **tapa por completo** el contenido (no se ve ningún objeto).
- Al rascar/completar, **no quedan parches sin rascar ni a medias** — al llegar al umbral, la capa se
  limpia entera (sin bandas arriba/abajo). Definir si al completar se hace un clear total del top layer.
- Cada objeto revelado muestra **siempre** su nombre.

---

## 2. Nombres del menú: se ven con mayúsculas mal ("PrestIgIo", "ÍndIce")

**Síntoma:** en el nav se lee "PrestIgIo" en vez de "Prestigio" y "ÍndIce" en vez de "Índice" — las
mayúsculas se ven mal.

**Verificado en código (para acotar la búsqueda):**
- Los **strings del HTML son correctos**: `Prestigio`, `Índice`, `Contenedores`, etc.
  (`apps/game/index.html` líneas ~60-65).
- **No hay `text-transform` sobre el nav** (`#tabbar button`, ni mobile ni desktop; sí lo hay en otras
  clases como `.label-caps`/`.quick-upgrade-label`, que NO son el nav).
- La fuente **Plus Jakarta Sans está self-hosteada** (`apps/game/assets/fonts/*.woff2` + `@font-face`),
  así que carga offline en Electron.
- Conclusión parcial: **no es el string ni un `text-transform` del nav** → es un problema de **render en
  runtime** (fuente/estilo). Reproducir en `npm run desktop` e inspeccionar el glifo real (¿la 'i'
  minúscula pierde el punto y parece 'I'?, ¿algún `letter-spacing`/`font-feature-settings` heredado?,
  ¿el peso de `@font-face` cae en un fallback?). El agente confirma la causa mirándolo.

**Comportamiento deseado:** el nav se lee en **Title Case español normal, legible** —
`Escarbar · Contenedores · Automatización · Logros · Prestigio · Índice`— sin 'i' que parezcan 'I'.

---

## 3. Sección Prestigio: layout estrecho/apretado a la derecha + hueco enorme

**Síntoma:** en Prestigio, el contenido se ve **muy estrecho, pegado al lado derecho y apretado**, y
entre el botón **"Hacer Prestigio"** y el **árbol de prestigio** hay **muchísimo espacio** vacío.

**Dónde vive (orientación):** `apps/game/src/ui/PrestigeView.js` + su CSS en
`apps/game/styles/components.css`/`layout.css`. Posible interacción con el clamp de altura / scroll por
panel de la ronda 3 (que cambió cómo se acota `#tab-content` en desktop). Reproducir a 1280×800 y 1440.

**Comportamiento deseado:** el panel de Prestigio usa el ancho disponible (no apretado a la derecha),
con el botón "Hacer Prestigio" y el árbol a una distancia razonable (sin el hueco grande), coherente
con el sistema "The Workshop".

---

## Reglas para el plan y la ejecución
- Respetar "The Workshop" (PLAN.md §5.3): sin emojis, tokens centralizados en `tokens.css`, mobile-first + Steam Deck.
- Verificar en los 3 anchos (375×812, 1280×800, 1440×900) y en `npm run desktop` real (Electron), no solo el smoke web.
- Para el Problema 1, si se puede, un test de regresión que capture "objeto visible antes de rascar" y/o "parche sin rascar al completar".
- `npm test` + `npm run test:e2e` verdes. HANDOFF con causa raíz encontrada por problema.
