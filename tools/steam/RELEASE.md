# RELEASE.md — Guía de publicación en Steam (para el usuario)

> Ronda 18. Todo lo que está acá es lo que **solo vos** podés hacer (cuenta de Steamworks,
> appId real, panel de la tienda). El código ya está listo: el juego corre sin Steam (los
> logros/cloud fallan en silencio), así que podés probar cada paso de forma incremental.
> Referencia cruzada: checklist U1-U9 en `ROADMAPv3.md` §2.

---

## 0. Resumen del flujo completo

```
1. Pagar el fee de Steamworks y obtener appId + depotIds        (una vez)
2. Reemplazar los placeholders 480 en el repo                    (una vez)
3. npm run build:win / build:linux                               (cada build)
4. steamcmd +run_app_build → sube los depots                     (cada build)
5. Panel de Steamworks: logros, Cloud, launch options, tienda    (una vez + retoques)
6. Probar en Steam Deck real y ciclo Cloud entre 2 máquinas      (antes del release)
```

---

## 1. Prerrequisitos: Steamworks y steamcmd

1. **Cuenta de partner**: registrate en <https://partner.steamgames.com>, pagá el fee
   (~USD 100 por app) y creá la app. Steamworks te asigna:
   - un **appId** (número de la app), y
   - **depotIds** (por convención `appId+1`, `appId+2`, …; los ves en
     *App Admin → SteamPipe → Depots*). Necesitás **uno por plataforma**: Windows y Linux.
2. **steamcmd** (la herramienta de línea de comandos que sube builds):
   - Windows: bajá <https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip>,
     descomprimilo en una carpeta SIN espacios (p. ej. `C:\steamcmd\`) y corré `steamcmd.exe`
     una vez para que se auto-actualice.
   - Docs oficiales: <https://partner.steamgames.com/doc/sdk/uploading>.
3. La cuenta que sube builds necesita el permiso *Edit App Metadata* + *Publish App Changes
   To Steam* y, si tiene Steam Guard, la primera corrida de `steamcmd +login` te pide el código.

---

## 2. Dónde van el appId y los depotIds (placeholders `480`)

Hoy el repo usa `480` (Spacewar, la app de pruebas de Valve) en 4 lugares. Reemplazalos por
los valores reales — son las tareas U2/U3 del checklist:

| Archivo | Línea | Qué es | Reemplazar por |
|---|---|---|---|
| `apps/desktop/steam.js` | 12 (`STEAM_APP_ID = 480`) | appId que usa steamworks.js en runtime (logros + Cloud) | **appId real** |
| `tools/steam/app_build.vdf` | 6 (`"AppID" "480"`) | appId del build de SteamPipe | **appId real** |
| `tools/steam/app_build.vdf` | 12 (`"480" "depot_build.vdf"`) | depot que incluye este build | **depotId de Windows** |
| `tools/steam/depot_build.vdf` | 7 (`"DepotID" "480"`) | depot de contenido Windows | **depotId de Windows** |

Para Linux, **duplicá** `depot_build.vdf` como `depot_build_linux.vdf`, poné el depotId de
Linux y cambiá el `LocalPath` a `..\..\dist\linux-unpacked\*`; después agregá la línea del
depot nuevo en el bloque `"Depots"` de `app_build.vdf`.

Estructura de los VDF (ya committeados con comentarios `TODO(usuario)`):

- `app_build.vdf` — el build: appId, descripción (aparece en el historial de builds de
  Steamworks), `ContentRoot` (`..\..\dist\` = la carpeta `dist/` de la raíz del repo, donde
  electron-builder deja todo) y la lista de depots.
- `depot_build.vdf` — un depot: depotId + `FileMapping` (qué carpeta local sube y a dónde).

---

## 3. Buildear el juego

Desde la **raíz del repo** (los outputs quedan en `dist/`, ignorada por git):

```
npm run build:win      → dist/win-unpacked/           (carpeta que sube el depot Windows)
                         dist/Dumpster Empire Setup <versión>.exe   (instalador NSIS, NO va a Steam)
npm run build:linux    → dist/linux-unpacked/         (carpeta que sube el depot Linux)
                         dist/*.AppImage y *.tar.gz   (para probar en la Steam Deck a mano, U8)
```

Notas:

- **A Steam se sube la carpeta `*-unpacked`**, nunca el instalador: Steam es el instalador.
- La versión del nombre del instalador sale de `apps/desktop/package.json` (`version`); si
  querés versionar los builds, subí ese número antes de buildear.
- `npm run build:linux` desde Windows puede necesitar Docker o directamente correrse en una
  máquina Linux/WSL (electron-builder lo avisa si falta algo).
- El ícono sale de `apps/desktop/build/icon.png` (electron-builder genera `.ico`/`.icns` solo).

---

## 4. Subir el build con steamcmd

Con los VDF ya completados y `dist/win-unpacked/` (y `linux-unpacked/`) recién buildeados:

```
C:\steamcmd\steamcmd.exe +login TU_USUARIO +run_app_build "C:\Users\SANTI\Desktop\dumpire\tools\steam\app_build.vdf" +quit
```

- La primera vez pide contraseña + código de Steam Guard; después queda cacheado.
- El log del build queda en `tools/builder_output/` (lo crea steamcmd; ignorado por git).
- Al terminar, el build aparece en *App Admin → SteamPipe → Builds*: hay que **asignarlo al
  branch `default`** (o a un branch beta con contraseña para probar primero) y publicar con
  *Publish App Changes*.

---

## 5. Launch options (Steamworks → Installation → General Installation)

Steam necesita saber qué ejecutable lanzar por plataforma. Creá dos launch options:

| # | Executable | Operating System | Notas |
|---|---|---|---|
| 1 | `Dumpster Empire.exe` | Windows | raíz del depot Windows (viene de `dist/win-unpacked/`) |
| 2 | `dumpster-empire` | Linux + SteamOS | el binario dentro de `dist/linux-unpacked/` — verificá el nombre exacto tras el primer `npm run build:linux` |

Sin argumentos ni working dir especial: el juego resuelve sus rutas desde el propio
ejecutable (`process.resourcesPath`).

---

## 6. Logros: registrarlos en el panel (U4)

En *Steamworks → Stats & Achievements → Achievements*, creá **un logro por fila** de la
tabla. El **API Name debe ser exactamente el id** (`a1`…`a35`): es lo que el juego manda por
`client.achievement.activate(id)` — un API Name distinto = logro que nunca se desbloquea.
El nombre/descripción visibles en Steam los escribís vos (la tabla da la condición y la
recompensa in-game como referencia; acordate de cargar también los textos en inglés).

Para regenerar la tabla cuando cambie `achievements.json` (desde la raíz del repo):

```
node tools/steam/achievements-table.mjs
```

Total: 35 logros (API Name = id del engine, en orden de data)

| API Name | Nombre | Condición | Recompensa |
|---|---|---|---|
| `a1` | Primeros Pasos | Ganar $1 en total | $5 |
| `a2` | Cien Monedas | Ganar $100 en total | $10 |
| `a3` | Mil Monedas | Ganar $1.000 en total | $100 |
| `a4` | Diez Mil | Ganar $10.000 en total | $1.000 |
| `a5` | Cien Mil | Ganar $100.000 en total | $10.000 |
| `a6` | Millonario | Ganar $1.000.000 en total | $100.000 |
| `a7` | Diez Millones | Ganar $10.000.000 en total | $1.000.000 |
| `a8` | Cien Millones | Ganar $100.000.000 en total | $10.000.000 |
| `a9` | Mil Millones | Ganar $1.000.000.000 en total | 3 Llaves de Ciudad |
| `a10` | Primer Objeto | Encontrar 1 objeto | $5 |
| `a11` | Cincuenta Objetos | Encontrar 50 objetos | $100 |
| `a12` | Quinientos Objetos | Encontrar 500 objetos | $5.000 |
| `a13` | Cinco Mil Objetos | Encontrar 5.000 objetos | $250.000 |
| `a14` | Toque Eléctrico | Encontrar 1 objeto de Electrónica | $500 |
| `a15` | Coleccionista de Antaño | Encontrar 1 objeto de Antigüedades | $2.000 |
| `a16` | Historiador | Encontrar 1 objeto de Objetos Históricos | $10.000 |
| `a17` | Alma de Artista | Encontrar 1 objeto de Arte | $100.000 |
| `a18` | Cazador de Reliquias | Encontrar 1 objeto de Reliquias | 1 Llave de Ciudad |
| `a19` | Del Futuro | Encontrar 1 objeto de Tecnología Futurista | 2 Llaves de Ciudad |
| `a20` | Coleccionista Total | Poseer todos los contenedores | 10 Llaves de Ciudad |
| `a21` | Automatizador | Comprar todas las máquinas de automatización | 6 Llaves de Ciudad |
| `a22` | Primer Prestigio | Prestigiar 1 vez | 5 Llaves de Ciudad |
| `a23` | Veterano de Ciudades | Prestigiar 3 veces | 10 Llaves de Ciudad |
| `a24` | Leyenda Urbana | Prestigiar 10 veces | 30 Llaves de Ciudad |
| `a25` | Curtido en la Basura | Caer en 20 trampas | $50.000 |
| `a26` | Equipo de Robots | Que el robot procese 100 contenedores | $100.000 |
| `a27` | Maximalista | Todas las mejoras rápidas a nivel 20+ | 8 Llaves de Ciudad |
| `a28` | Billonario Galáctico | Ganar $1.000.000.000.000 en total | 4 Llaves de Ciudad |
| `a29` | Fortuna Cósmica | Ganar $1.000.000.000.000.000 en total | 8 Llaves de Ciudad |
| `a30` | Cincuenta Mil Objetos | Encontrar 50.000 objetos | 5 Llaves de Ciudad |
| `a31` | Ciudadano del Multiverso | Prestigiar 6 veces | 15 Llaves de Ciudad |
| `a32` | Cicatrices de Guerra | Caer en 100 trampas | $5.000.000 |
| `a33` | Ejército de Robots | Que el robot procese 2.000 contenedores | $10.000.000 |
| `a34` | Ojo Biónico | Que el robot descarte 50 contenedores con trampa | 5 Llaves de Ciudad |
| `a35` | Basura Primordial | Poseer 1 × Vertedero del Big Bang | 10 Llaves de Ciudad |

---

## 7. Steam Cloud (U5)

El proceso principal de Electron sincroniza **un solo archivo**: `save.json`.

- En disco vive en `userData` (Windows: `%APPDATA%\@dumpster\desktop\save.json`).
- En la nube lo escribe/lee vía la **Cloud API** de ISteamRemoteStorage
  (`client.cloud.writeFile('save.json', …)` en `apps/desktop/steam.js`) — NO usa Auto-Cloud,
  así que **no** hay que configurar rutas de archivos en el panel.
- Configuración en *Steamworks → App Admin → Cloud*: habilitá Steam Cloud y fijá cuota, p. ej.
  **1 MB por usuario / 2 archivos** (un save pesa unos pocos KB; sobra). Guardá y publicá.
- Conflictos: al arrancar, el juego compara `lastSavedAt` entre el archivo local y el de la
  nube y se queda con el más nuevo, re-sincronizando el otro (`apps/desktop/saveFile.js`).
  Nunca pisa en silencio una partida más avanzada.
- Prueba real (U9): jugá y cerrá en la máquina A, abrí en la máquina B con la misma cuenta →
  tiene que aparecer el progreso de A.

---

## 8. `steam_appid.txt` (probar la integración sin subir a Steam)

Para probar logros/Cloud en una build local **sin** lanzar desde el cliente de Steam,
steamworks.js necesita un archivo `steam_appid.txt` con el appId, **al lado del ejecutable**
(p. ej. `dist/win-unpacked/steam_appid.txt`). Con el cliente de Steam abierto y sesión
iniciada, el juego inicializa Steam como si fuera esa app.

- En dev podés usar `480` (Spacewar) para verificar que la integración levanta; los logros
  reales solo existen bajo tu appId.
- **NO se committea** (está en `.gitignore`) y **no** va dentro del depot que subís: cuando
  el juego se lanza desde Steam no hace falta.

---

## 9. Checklist final de Steam Deck (U8)

Antes del review de Valve, en una Deck real con la AppImage (o el build ya subido a un
branch beta):

- [ ] La AppImage de `npm run build:linux` abre en modo escritorio de la Deck.
- [ ] Agregada como *Non-Steam Game* (o desde el branch beta), abre en modo gaming a 1280×800.
- [ ] **Táctil**: escarbar arrastrando el dedo funciona (el canvas usa `touch-action: none`);
      los botones se acomodan al dedo (mínimo 44px, ya verificado a 375px en mobile).
- [ ] **Mando**: el juego es 100% puntero — configurá el layout de Steam Input por defecto
      como *Web Browser* / trackpad-como-mouse y verificá que alcanza para jugar todo
      (escarbar, comprar, prestigiar). Si algo no se puede hacer con trackpad+gatillo, anotarlo.
- [ ] Texto legible a distancia de sofá (la UI escala por `rem` responsive).
- [ ] Autoguardado al cerrar desde el botón de la Deck (before-quit fuerza el save).
- [ ] Rendimiento: sin caídas visibles con el robot procesando y partículas activas.

---

## 10. Página de tienda y review (U7)

Fuera del alcance del repo, pero para no olvidar: cápsulas (header 920×430, cápsula chica
462×174, etc.), 5+ screenshots 1920×1080, tráiler, descripción ES+EN, precio, y el proceso
*Review* de Valve (~2-5 días hábiles). El juego debe estar marcado como *Playable on Steam
Deck* recién después de pasar el checklist de la sección 9.
