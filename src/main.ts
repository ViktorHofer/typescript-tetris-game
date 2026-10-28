}

function restart(): void {
  board = createBoard();
  bag = [];
  upcoming = [];
  held = null;
  canHold = true;
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  active = createPiece(drawFromBag());
  fillUpcoming();
  overlay.hidden = true;
  holdStatus.textContent = 'SAVE FOR LATER';
  lastDrop = performance.now();
  updateStats();
}

function paintBlock(ctx: CanvasRenderingContext2D, type: PieceType, x: number, y: number, size: number): void {
  const [light, dark] = COLORS[type];
  const inset = Math.max(1, size * 0.045);
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, light);
  gradient.addColorStop(1, dark);
  ctx.fillStyle = gradient;
  ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + inset * 2, y + inset * 2, size - inset * 4, Math.max(1, size * 0.08));
  ctx.fillStyle = 'rgba(8,12,22,0.16)';
  ctx.fillRect(x + inset * 2, y + size - inset * 3, size - inset * 4, Math.max(1, size * 0.06));
}

function drawBoard(): void {
  context.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  context.fillStyle = '#0c101a';
  context.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  context.strokeStyle = 'rgba(145, 163, 194, 0.075)';
  context.lineWidth = 1;
  for (let x = 0; x <= COLUMNS; x++) {
    context.beginPath(); context.moveTo(x * CELL + 0.5, 0); context.lineTo(x * CELL + 0.5, gameCanvas.height); context.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    context.beginPath(); context.moveTo(0, y * CELL + 0.5); context.lineTo(gameCanvas.width, y * CELL + 0.5); context.stroke();
  }

  board.forEach((row, y) => row.forEach((type, x) => { if (type) paintBlock(context, type, x * CELL, y * CELL, CELL); }));

  if (!gameOver) {
    let ghostY = active.y;
    while (!collision(active, 0, ghostY - active.y + 1)) ghostY++;
    active.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (!value || ghostY + y < 0) return;
      const px = (active.x + x) * CELL;
      const py = (ghostY + y) * CELL;
      context.strokeStyle = 'rgba(190, 204, 229, 0.32)';
      context.lineWidth = 1;
      context.strokeRect(px + 3.5, py + 3.5, CELL - 7, CELL - 7);
    }));
    active.matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value) paintBlock(context, active.type, (active.x + x) * CELL, (active.y + y) * CELL, CELL);
    }));
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, types: (PieceType | null)[], slots: number): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111622';
  ctx.fillRect(0, 0, width, height);
  const slotHeight = height / slots;

  types.slice(0, slots).forEach((type, index) => {
    if (!type) return;
    const matrix = SHAPES[type];
    const tile = Math.min(20, (width - 28) / Math.max(matrix[0].length, matrix.length));
    const shapeWidth = matrix[0].length * tile;
    const shapeHeight = matrix.length * tile;
    const startX = (width - shapeWidth) / 2;
    const startY = index * slotHeight + (slotHeight - shapeHeight) / 2;
    matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value) paintBlock(ctx, type, startX + x * tile, startY + y * tile, tile);
    }));
    if (index > 0) {
      ctx.strokeStyle = 'rgba(145, 163, 194, 0.09)';
      ctx.beginPath(); ctx.moveTo(14, index * slotHeight); ctx.lineTo(width - 14, index * slotHeight); ctx.stroke();
    }
  });
}

function render(time: number): void {
  if (!paused && !gameOver) {
    const interval = Math.max(90, 800 - (level - 1) * 65);
    if (time - lastDrop >= interval) {
      if (!move(0, 1)) lockPiece();
      lastDrop = time;
    }
  }
  drawBoard();
  drawPreview(holdContext, [held], 1);
  drawPreview(nextContext, upcoming.slice(0, 5), 5);
  animationFrame = requestAnimationFrame(render);
}

function handleKey(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowdown', 'arrowup', ' '].includes(key)) event.preventDefault();
  if (key === 'p' || key === 'escape') { togglePause(); return; }
  if (paused || gameOver) {
    if (key === 'enter' && gameOver) restart();
    return;
  }
  switch (key) {
    case 'arrowleft': case 'a': move(-1, 0); break;
    case 'arrowright': case 'd': move(1, 0); break;
    case 'arrowdown': case 's': move(0, 1); break;
    case 'arrowup': case 'x': case 'w': rotateActive(); break;
    case ' ': hardDrop(); break;
    case 'c': case 'shift': holdPiece(); break;
  }
}

window.addEventListener('keydown', handleKey);
document.querySelector('#restart-button')?.addEventListener('click', restart);
document.querySelector('[data-action="left"]')?.addEventListener('click', () => move(-1, 0));
document.querySelector('[data-action="right"]')?.addEventListener('click', () => move(1, 0));
document.querySelector('[data-action="down"]')?.addEventListener('click', () => move(0, 1));
document.querySelector('[data-action="rotate"]')?.addEventListener('click', rotateActive);
document.querySelector('[data-action="drop"]')?.addEventListener('click', hardDrop);
document.querySelector('[data-action="hold"]')?.addEventListener('click', holdPiece);

updateStats();
fillUpcoming();
lastDrop = performance.now();
animationFrame = requestAnimationFrame(render);

window.addEventListener('pagehide', () => cancelAnimationFrame(animationFrame));

