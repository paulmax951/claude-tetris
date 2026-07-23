# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Toggle claro / oscuro**: switch en la esquina superior que cambia el tema visual. El modo oscuro es el predeterminado; la preferencia se guarda en `localStorage`.
- **Combo**: contador de encadenado de líneas — se incrementa cada vez que una pieza se fija y elimina al menos una línea, y se reinicia a `0` en cuanto una pieza se fija sin eliminar ninguna. Se muestra en el panel lateral (`COMBO`) durante la partida.
- **Tabla de récords local**: guarda el **top 5** de puntuaciones (nombre + puntuación) en `localStorage`. Se muestra en la pantalla de inicio y en el overlay de Game Over, resaltando la fila de la partida actual si entró al top 5. Si la puntuación califica, se pide el nombre del jugador antes de guardarla. Incluye un botón para reiniciar los récords.
- **Estadísticas históricas**: además del top 5, se guarda el **mejor combo** y el **máximo de líneas** eliminadas en una sola partida, acumulados entre todas las partidas jugadas.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P`       | Pausar / reanudar                 |

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un título visible `<h1 class="game-title">TETRIS</h1>` sobre el tablero.
- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, `COMBO`, vista de la siguiente pieza y la lista de controles.
- Un switch (`#theme-toggle`) junto al título para alternar entre modo oscuro y claro.
- Un overlay (`#overlay`) para los estados **PAUSA** y **GAME OVER**, con la tabla de récords, el campo para ingresar el nombre (si la puntuación califica) y el botón de reinicio de récords.
- Una pantalla de inicio (`#start-overlay`), visible antes de la primera partida, con la tabla de récords y el botón **Jugar**.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays. Los colores se definen como variables CSS (`--bg`, `--text`, `--board-bg`, etc.) en `:root` para el modo oscuro (por defecto) y se sobrescriben bajo `body.light` para el modo claro.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–7) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Tema claro/oscuro** (`applyTheme`): alterna la clase `light` en `<body>` (que activa las variables CSS del tema claro), sincroniza el switch y persiste la preferencia en `localStorage` bajo la clave `tetris-theme`. El color de la cuadrícula del canvas (`drawGrid`) se toma de `GRID_COLORS[theme]` porque el canvas no puede leer variables CSS directamente.
- **Combo** (`lockPiece`): cada vez que una pieza se fija (`merge` + `clearLines`), si `clearLines()` eliminó al menos una línea se incrementa `combo` y se actualiza `maxCombo` de la partida; si no eliminó ninguna, `combo` vuelve a `0`. `combo`/`maxCombo` se reinician en `init()` al empezar una partida nueva.
- **Tabla de récords** (`loadHighScores` / `addHighScore` / `saveHighScores`): el top 5 de puntuaciones (`{ id, name, score }`) se persiste en `localStorage` bajo la clave `tetris-highscores`, ordenado de mayor a menor. `qualifiesForHighScore` decide si la puntuación de la partida actual entra al top 5; si califica, se muestra un campo de texto (`#highscore-entry`) para ingresar el nombre antes de guardarla con `saveCurrentScore`. `renderHighScoresTable` dibuja la tabla tanto en la pantalla de inicio (`#start-highscores`) como en el overlay de Game Over (`#overlay-highscores`), resaltando (`.highlight`) la fila de la entrada recién guardada.
- **Estadísticas históricas** (`loadStats` / `saveStats` / `updateStatsIfNeeded`): el mejor combo y el máximo de líneas eliminadas en una sola partida se persisten en `localStorage` bajo la clave `tetris-stats` y se actualizan al terminar cada partida (`endGame`) si la superan.
- **Reinicio de récords** (`resetHighScores`): borra la clave `tetris-highscores` de `localStorage`; hay un botón en la pantalla de inicio y otro en el overlay de Game Over que lo disparan (no afecta las estadísticas de mejor combo/líneas).
- **Pantalla de inicio** (`showStartScreen`): se muestra antes de llamar a `init()` por primera vez; dibuja un tablero vacío, la tabla de récords y las estadísticas. El flag `started` bloquea los controles de juego (movimiento, rotación, pausa) hasta que se pulsa **Jugar**.

### Flujo del juego

```
showStartScreen()                   → tablero vacío + tabla de récords (pantalla de inicio)
  └─ click en "Jugar" → started = true → init()

init()
  ├─ createBoard()                  → matriz vacía
  ├─ combo = 0, maxCombo = 0
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   lockPiece()
     ├─ merge()
     ├─ clearLines()  → cleared
     ├─ cleared > 0 ? combo++ (y maxCombo si corresponde) : combo = 0
     └─ spawn()

   keydown → mover / rotar / soft-drop / hard-drop / pausa (bloqueado hasta started = true)
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()`: se actualizan las estadísticas históricas, y si la puntuación entra al top 5 se pide el nombre del jugador antes de guardarla en la tabla de récords. Se muestra el overlay de **Game Over** con la tabla de récords y el botón de reinicio.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (temas claro / oscuro)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 7 colores             |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |
| `MAX_HIGHSCORES` | Cantidad de entradas en la tabla de récords | `5`                |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
