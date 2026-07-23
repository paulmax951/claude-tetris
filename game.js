'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleLabel = document.getElementById('theme-toggle-label');

const highscoreEntryEl = document.getElementById('highscore-entry');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const overlayHighscoresSection = document.getElementById('overlay-highscores-section');
const overlayHighscoresEl = document.getElementById('overlay-highscores');
const overlayStatsEl = document.getElementById('overlay-stats');
const resetScoresBtn = document.getElementById('reset-scores-btn');

const startOverlay = document.getElementById('start-overlay');
const startHighscoresEl = document.getElementById('start-highscores');
const startStatsEl = document.getElementById('start-stats');
const startBtn = document.getElementById('start-btn');
const resetScoresBtnStart = document.getElementById('reset-scores-btn-start');

const THEME_KEY = 'tetris-theme';
const GRID_COLORS = { dark: '#22222e', light: '#dcdce6' };
const HIGHSCORES_KEY = 'tetris-highscores';
const STATS_KEY = 'tetris-stats';
const MAX_HIGHSCORES = 5;

let board, current, next, score, lines, level, combo, maxCombo, paused, gameOver, started, lastTime, dropAccum, dropInterval, animId;
let theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';

function applyTheme(t) {
  theme = t;
  document.body.classList.toggle('light', theme === 'light');
  themeToggle.checked = theme === 'light';
  themeToggleLabel.textContent = theme === 'light' ? 'LIGHT' : 'DARK';
  localStorage.setItem(THEME_KEY, theme);
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (cleared > 0) {
    combo++;
    if (combo > maxCombo) maxCombo = combo;
  } else {
    combo = 0;
  }
  updateHUD();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = GRID_COLORS[theme];
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

// ---- High scores & all-time stats (localStorage) ----

function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGHSCORES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Defensive: drop malformed entries and re-sort in case storage was
    // edited externally or written by a future bug — code below assumes
    // a sorted, well-formed list (e.g. qualifiesForHighScore reads the last item).
    return parsed
      .filter(e => e && typeof e.name === 'string' && Number.isFinite(e.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGHSCORES);
  } catch {
    return [];
  }
}

function saveHighScores(list) {
  localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(list));
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      maxCombo: parsed && Number.isFinite(parsed.maxCombo) ? parsed.maxCombo : 0,
      maxLines: parsed && Number.isFinite(parsed.maxLines) ? parsed.maxLines : 0,
    };
  } catch {
    return { maxCombo: 0, maxLines: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function qualifiesForHighScore(candidateScore) {
  const list = loadHighScores();
  if (list.length < MAX_HIGHSCORES) return true;
  return candidateScore > list[list.length - 1].score;
}

function addHighScore(name, candidateScore) {
  const list = loadHighScores();
  const entry = { id: Date.now(), name, score: candidateScore };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  saveHighScores(list.slice(0, MAX_HIGHSCORES));
  return entry;
}

function resetHighScores() {
  localStorage.removeItem(HIGHSCORES_KEY);
  renderHighScoresTable(startHighscoresEl);
  renderHighScoresTable(overlayHighscoresEl);
}

function updateStatsIfNeeded(sessionMaxCombo, sessionLines) {
  const stats = loadStats();
  let changed = false;
  if (sessionMaxCombo > stats.maxCombo) { stats.maxCombo = sessionMaxCombo; changed = true; }
  if (sessionLines > stats.maxLines) { stats.maxLines = sessionLines; changed = true; }
  if (changed) saveStats(stats);
}

function renderHighScoresTable(container, highlightId) {
  const list = loadHighScores();
  container.innerHTML = '';
  if (list.length === 0) {
    const li = document.createElement('li');
    li.className = 'highscore-empty';
    li.textContent = 'Sin récords todavía';
    container.appendChild(li);
    return;
  }
  list.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'highscore-row';
    if (highlightId && entry.id === highlightId) li.classList.add('highlight');
    const rank = document.createElement('span');
    rank.className = 'highscore-rank';
    rank.textContent = `${i + 1}.`;
    const name = document.createElement('span');
    name.className = 'highscore-name';
    name.textContent = entry.name;
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'highscore-score';
    scoreSpan.textContent = entry.score.toLocaleString();
    li.append(rank, name, scoreSpan);
    container.appendChild(li);
  });
}

function renderStatsLine(el) {
  const stats = loadStats();
  el.textContent = `Mejor combo: ${stats.maxCombo}  ·  Máx. líneas: ${stats.maxLines}`;
}

function saveCurrentScore() {
  const raw = playerNameInput.value.trim().toUpperCase();
  const name = raw.slice(0, 10) || 'AAA';
  const entry = addHighScore(name, score);
  renderHighScoresTable(overlayHighscoresEl, entry.id);
  renderHighScoresTable(startHighscoresEl);
  highscoreEntryEl.classList.add('hidden');
}

function showStartScreen() {
  board = createBoard();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  renderHighScoresTable(startHighscoresEl);
  renderStatsLine(startStatsEl);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;

  updateStatsIfNeeded(maxCombo, lines);
  renderStatsLine(overlayStatsEl);
  overlayHighscoresSection.classList.remove('hidden');

  if (qualifiesForHighScore(score)) {
    highscoreEntryEl.classList.remove('hidden');
    renderHighScoresTable(overlayHighscoresEl);
    playerNameInput.value = '';
    overlay.classList.remove('hidden');
    playerNameInput.focus();
  } else {
    highscoreEntryEl.classList.add('hidden');
    renderHighScoresTable(overlayHighscoresEl);
    overlay.classList.remove('hidden');
  }
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    highscoreEntryEl.classList.add('hidden');
    overlayHighscoresSection.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  maxCombo = 0;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { if (started) togglePause(); return; }
  if (!started || paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'light' : 'dark');
  draw();
});

startBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  started = true;
  init();
});

saveScoreBtn.addEventListener('click', saveCurrentScore);
playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveCurrentScore();
});

resetScoresBtn.addEventListener('click', resetHighScores);
resetScoresBtnStart.addEventListener('click', resetHighScores);

applyTheme(theme);
started = false;
showStartScreen();
