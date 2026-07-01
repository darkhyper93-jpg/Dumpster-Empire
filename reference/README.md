# reference/ — Material de consulta (NO se buildea, NO se porta tal cual)

Esta carpeta es **solo referencia**. No forma parte del monorepo buildeable y ningún agente debe
construir sobre ella ni copiar su código. Sirve para entender *qué se siente bien* y *cómo se ve* el juego.

## Contenido

- **`dumpster-empire.html`** — prototipo funcional completo de un solo archivo (~1500 líneas). Guía de
  comportamiento: mecánica de escarbado (canvas `destination-out`, línea 958), flujo de tutorial,
  comportamiento de contenedores/mejoras/automatización/prestigio. **Tiene bugs conocidos** (la stat de
  Fuerza es inútil y se rediseñó en el engine — ver PLAN.md §2.3). El engine y sus tests son la
  autoridad, no este HTML.

- **`ui/`** — mockups de diseño Stitch (`code.html`, `screen.png`, `DESIGN.md`) que definen la dirección
  visual "fusión ámbar + Stitch" (PLAN.md §5.3): botones extruidos, gauges recesados, bloom de rareza,
  tipografía Rubik/Hanken/JetBrains Mono, íconos Material Symbols. Referencia para los Agentes 3 y 4.

## Por qué se conserva y no se borra
Retirar este material perdería las decisiones de mecánica, balance y arte ya exploradas. Se mantiene
en cuarentena para tener la referencia sin riesgo de que se shipee o se construya sobre código roto.
