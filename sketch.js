import { Table }        from './src/Table.js';
import { Ball }         from './src/Ball.js';
import { Physics }      from './src/Physics.js';
import { Cue }          from './src/Cue.js';
import { AI }           from './src/AI.js';
import { Game }         from './src/Game.js';
import { SoundManager } from './src/SoundManager.js';

// Logical canvas dimensions
const LOGICAL_W = 1100;
const LOGICAL_H = 700;
const TABLE_W   = 900;
const TABLE_H   = 450;
const TABLE_X   = (LOGICAL_W - TABLE_W) / 2; // 100
const TABLE_Y   = 120;                         // space for scoreboard

let scaleFactor = 1;
let game, table, physics, cue, ai, soundManager;
let balls = [];

window.setup = function () {
  createCanvas(windowWidth, windowHeight);

  scaleFactor = constrain(
    min(windowWidth / LOGICAL_W, windowHeight / LOGICAL_H),
    0.5, 1.5
  );

  table        = new Table(TABLE_X, TABLE_Y, TABLE_W, TABLE_H);
  physics      = new Physics();
  cue          = new Cue();
  ai           = new AI();
  soundManager = new SoundManager();

  balls = createBalls(table);

  game = new Game(table, physics, cue, ai, soundManager, balls);
  game.start();

  textFont('Georgia');
};

window.draw = function () {
  background(10);

  push();
  // Centre the logical canvas on the browser window
  const ox = (width  - LOGICAL_W * scaleFactor) / 2;
  const oy = (height - LOGICAL_H * scaleFactor) / 2;
  translate(ox, oy);
  scale(scaleFactor);

  game.update();
  game.draw();

  pop();
};

window.mousePressed = function () {
  const mx = _toLogicalX(mouseX);
  const my = _toLogicalY(mouseY);
  game.handleMousePressed(mx, my);
};

window.mouseDragged = function () {
  const mx = _toLogicalX(mouseX);
  const my = _toLogicalY(mouseY);
  game.handleMouseDragged(mx, my);
};

window.mouseReleased = function () {
  game.handleMouseReleased();
};

window.keyPressed = function () {
  game.handleKeyPressed();
};

window.windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
  scaleFactor = constrain(
    min(windowWidth / LOGICAL_W, windowHeight / LOGICAL_H),
    0.5, 1.5
  );
};

// ─── helpers ───────────────────────────────────────────────────────────────────

function _toLogicalX(screenX) {
  return (screenX - (width  - LOGICAL_W * scaleFactor) / 2) / scaleFactor;
}

function _toLogicalY(screenY) {
  return (screenY - (height - LOGICAL_H * scaleFactor) / 2) / scaleFactor;
}

function createBalls(t) {
  const result  = [];
  const bounds  = t.getBounds();
  const centerY = (bounds.top + bounds.bottom) / 2;
  const tableW  = bounds.right - bounds.left;
  const baulkX  = bounds.left + tableW * 0.2;
  const dRadius = (bounds.bottom - bounds.top) / 6;
  const r       = 11;

  const pinkX  = bounds.left + tableW * 0.753;
  const blackX = bounds.left + tableW * 0.882;
  const blueX  = bounds.left + tableW * 0.5;

  // Cue ball — inside the D (left of baulkX)
  result.push(new Ball(baulkX - dRadius * 0.5, centerY, '#f5f5f5', 0, 'cue', 'cue'));

  // Baulk colours
  result.push(new Ball(baulkX, centerY + dRadius, '#f5e642',  2, 'colour', 'yellow'));
  result.push(new Ball(baulkX, centerY,           '#228B22',  3, 'colour', 'green'));
  result.push(new Ball(baulkX, centerY - dRadius, '#8B4513',  4, 'colour', 'brown'));

  // Blue
  result.push(new Ball(blueX, centerY, '#0066cc', 5, 'colour', 'blue'));

  // Pink
  result.push(new Ball(pinkX, centerY, '#ff69b4', 6, 'colour', 'pink'));

  // Black
  result.push(new Ball(blackX, centerY, '#111111', 7, 'colour', 'black'));

  // Set spot positions for colour balls
  for (const ball of result) {
    ball.spotX = ball.x;
    ball.spotY = ball.y;
  }

  // 15 reds in a 5-row triangle (apex nearest pink, rows extend toward black)
  const apexX   = pinkX + r * 3.5;
  const spacing = r * 2.15;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const bx = apexX + row * spacing;
      const by = centerY + (col - row / 2) * spacing;
      result.push(new Ball(bx, by, '#cc0000', 1, 'red', 'red'));
    }
  }

  return result;
}
