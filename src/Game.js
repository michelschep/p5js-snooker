export class Game {
  constructor(table, physics, cue, ai, soundManager, balls) {
    this.table        = table;
    this.physics      = physics;
    this.cue          = cue;
    this.ai           = ai;
    this.soundManager = soundManager;
    this.balls        = balls;

    this.gamePhase  = 'startup'; // 'startup' | 'playing' | 'gameover'
    this.turnState  = 'waiting'; // 'waiting' | 'shot_in_progress' | 'evaluating' | 'foul' | 'ball_in_hand'

    this.scores        = [0, 0]; // [computer, human]
    this.currentPlayer = 1;      // 1 = human, 0 = computer
    this.nextBallType  = 'red';  // 'red' | 'colour' | 'sequence'
    this.sequenceBall  = 0;
    this.COLOUR_SEQUENCE = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

    this.foulMessage  = '';
    this.foulTimer    = 0;
    this.statusMessage = '';
    this.statusTimer  = 0;

    this.aiTimer = 0;

    // Startup state
    this.startupBalls = [];
    this.fadeOut      = false;
    this.fadeTimer    = 0;
    this.introPlayed  = false;

    // Wire physics callbacks
    this.physics.onBallHitCallback = (hitSpeed) => this.soundManager.playBallHit(hitSpeed);
    this.physics.onPocketCallback  = () => this.soundManager.playPocket();
  }

  start() {
    this._initStartupBalls();
  }

  _initStartupBalls() {
    const colours = ['#cc0000', '#f5e642', '#0066cc', '#228B22', '#ff69b4'];
    for (let i = 0; i < 5; i++) {
      this.startupBalls.push({
        x: 100 + Math.random() * 900,
        y: 100 + Math.random() * 500,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        ballColor: colours[i],
        radius: 18
      });
    }
  }

  // ─── update ─────────────────────────────────────────────────────────────────

  update() {
    if (this.gamePhase === 'startup') {
      this._updateStartup();
      return;
    }
    if (this.gamePhase === 'gameover') return;

    if (this.turnState === 'shot_in_progress') {
      this.physics.update(this.balls, this.table);
      if (!this.physics.ballsMoving(this.balls)) {
        this.turnState = 'evaluating';
        this._evaluateShot();
      }
    }

    // AI turn
    if (this.turnState === 'waiting' && this.currentPlayer === 0) {
      this.aiTimer++;
      if (this.aiTimer > 90) {
        this._executeAIShot();
        this.aiTimer = 0;
      }
    }

    // Foul countdown
    if (this.foulTimer > 0) {
      this.foulTimer--;
      if (this.foulTimer === 0) {
        this.foulMessage = '';
        if (this.turnState === 'foul') {
          this.turnState = 'ball_in_hand';
          if (this.currentPlayer === 0) {
            this._computerPlaceBallInHand();
          }
        }
      }
    }

    if (this.statusTimer > 0) {
      this.statusTimer--;
    }

    if (this._isGameOver()) {
      this.gamePhase = 'gameover';
    }
  }

  _updateStartup() {
    for (const b of this.startupBalls) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x - b.radius < 0)    { b.x = b.radius;       b.vx =  Math.abs(b.vx); }
      if (b.x + b.radius > 1100) { b.x = 1100 - b.radius; b.vx = -Math.abs(b.vx); }
      if (b.y - b.radius < 0)    { b.y = b.radius;       b.vy =  Math.abs(b.vy); }
      if (b.y + b.radius > 700)  { b.y = 700 - b.radius; b.vy = -Math.abs(b.vy); }
    }

    if (this.fadeOut) {
      this.fadeTimer++;
      if (this.fadeTimer > 30) {
        this.gamePhase = 'playing';
        this.turnState = 'waiting';
        this.physics.resetShotTracking();
      }
    }

    if (!this.introPlayed) {
      this.introPlayed = true;
      setTimeout(() => this.soundManager.playIntroTune(), 500);
    }
  }

  // ─── shot evaluation ─────────────────────────────────────────────────────────

  _evaluateShot() {
    const pocketed  = this.physics.pocketedThisShot;
    const firstHit  = this.physics.firstBallHit;
    const cueBall   = this.balls.find(b => b.ballType === 'cue');

    // Cue ball pocketed = foul
    if (cueBall && !cueBall.inPlay) {
      cueBall.inPlay = true;
      cueBall.vx     = 0;
      cueBall.vy     = 0;
      this._triggerFoul('CUE BALL POCKETED! +4', 4);
      this.turnState = 'foul';
      return;
    }

    // Nothing hit = foul
    if (!firstHit && pocketed.length === 0) {
      this._triggerFoul('MISS — No ball hit! +4', 4);
      this.turnState = 'foul';
      return;
    }

    // Wrong first ball = foul
    if (firstHit && !this._isCorrectBall(firstHit)) {
      const penalty = Math.max(4, firstHit.ballValue);
      this._triggerFoul(`WRONG BALL! +${penalty}`, penalty);
      this.turnState = 'foul';
      return;
    }

    // Process pocketed balls
    let validPot = false;
    for (const ball of pocketed) {
      if (ball.ballType === 'cue') continue;
      const result = this._processPocketedBall(ball);
      if (result.valid) validPot = true;
      if (result.foul) {
        this._triggerFoul(result.foulMessage, result.foulValue);
        this.turnState = 'foul';
        this.physics.resetShotTracking();
        return;
      }
    }

    // Continue or switch
    if (validPot) {
      this.turnState = 'waiting';
      this.aiTimer   = 0;
    } else {
      this._switchPlayer();
      this.turnState = 'waiting';
      this.aiTimer   = 0;
    }

    this.physics.resetShotTracking();
  }

  _isCorrectBall(ball) {
    if (this.nextBallType === 'red')      return ball.ballType === 'red';
    if (this.nextBallType === 'colour')   return ball.ballType === 'colour';
    if (this.nextBallType === 'sequence') return ball.name === this.COLOUR_SEQUENCE[this.sequenceBall];
    return false;
  }

  _processPocketedBall(ball) {
    const redsInPlay = this.balls.filter(b => b.inPlay && b.ballType === 'red').length;

    if (this.nextBallType === 'red') {
      if (ball.ballType === 'red') {
        this.scores[this.currentPlayer] += 1;
        this.nextBallType = 'colour';
        return { valid: true, foul: false };
      }
      // Pocketed a colour when red needed
      const penalty = Math.max(4, ball.ballValue);
      this._respotBall(ball);
      return { valid: false, foul: true, foulMessage: `WRONG BALL! +${penalty}`, foulValue: penalty };
    }

    if (this.nextBallType === 'colour') {
      if (ball.ballType === 'colour') {
        this.scores[this.currentPlayer] += ball.ballValue;
        // Respot only if reds remain
        if (redsInPlay > 0) {
          this._respotBall(ball);
        }
        this.nextBallType = 'red';
        // Check for transition to sequence
        const redsLeft   = this.balls.filter(b => b.inPlay && b.ballType === 'red').length;
        const coloursLeft = this.balls.filter(b => b.inPlay && b.ballType === 'colour').length;
        if (redsLeft === 0 && coloursLeft > 0) {
          this.nextBallType = 'sequence';
          this.sequenceBall = 0;
        }
        return { valid: true, foul: false };
      }
      // Pocketed a red when colour needed
      return { valid: false, foul: true, foulMessage: 'WRONG BALL! +4', foulValue: 4 };
    }

    if (this.nextBallType === 'sequence') {
      if (ball.name === this.COLOUR_SEQUENCE[this.sequenceBall]) {
        this.scores[this.currentPlayer] += ball.ballValue;
        this.sequenceBall++;
        if (this.sequenceBall >= this.COLOUR_SEQUENCE.length) {
          this.gamePhase = 'gameover';
        }
        return { valid: true, foul: false };
      }
      const penalty = Math.max(4, ball.ballValue);
      this._respotBall(ball);
      return { valid: false, foul: true, foulMessage: `WRONG ORDER! +${penalty}`, foulValue: penalty };
    }

    return { valid: false, foul: false };
  }

  _respotBall(ball) {
    const occupied = (x, y) =>
      this.balls.some(b => b.inPlay && b !== ball &&
        Math.sqrt((b.x - x) ** 2 + (b.y - y) ** 2) < ball.radius * 2.5);

    ball.inPlay = true;
    ball.vx     = 0;
    ball.vy     = 0;

    if (!occupied(ball.spotX, ball.spotY)) {
      ball.x = ball.spotX;
      ball.y = ball.spotY;
    } else {
      ball.x = ball.spotX + ball.radius * 2.5;
      ball.y = ball.spotY;
    }
  }

  _triggerFoul(message, points) {
    this.foulMessage = message;
    this.foulTimer   = 120;
    const opponent   = 1 - this.currentPlayer;
    this.scores[opponent] += Math.max(4, points);
    this.soundManager.playFoul();
    this.currentPlayer = opponent; // fouled-against player gets ball in hand
  }

  _switchPlayer() {
    this.currentPlayer = 1 - this.currentPlayer;
    this.soundManager.playTurnSwitch();
  }

  _computerPlaceBallInHand() {
    const bounds  = this.table.getBounds();
    const centerY = (bounds.top + bounds.bottom) / 2;
    const tableW  = bounds.right - bounds.left;
    const baulkX  = bounds.left + tableW * 0.2;
    const dRadius = (bounds.bottom - bounds.top) / 6;
    const cueBall = this.balls.find(b => b.ballType === 'cue');
    if (cueBall) {
      cueBall.x     = baulkX - dRadius * 0.5;
      cueBall.y     = centerY;
      cueBall.inPlay = true;
      cueBall.vx     = 0;
      cueBall.vy     = 0;
    }
    this.turnState = 'waiting';
    this.aiTimer   = 0;
  }

  _executeAIShot() {
    const cueBall = this.balls.find(b => b.ballType === 'cue');
    if (!cueBall || !cueBall.inPlay) return;

    const shot = this.ai.calculateShot(cueBall, this.balls, this.table, this.nextBallType);
    if (!shot) return;

    this.physics.resetShotTracking();
    cueBall.vx     = Math.cos(shot.angle) * shot.power;
    cueBall.vy     = Math.sin(shot.angle) * shot.power;
    this.turnState = 'shot_in_progress';
  }

  _isGameOver() {
    return this.balls.filter(b => b.inPlay && b.ballType !== 'cue').length === 0;
  }

  // ─── draw ────────────────────────────────────────────────────────────────────

  draw() {
    if (this.gamePhase === 'startup') {
      this._drawStartup();
      return;
    }

    this.table.draw();

    for (const ball of this.balls) {
      ball.draw();
    }

    // Cue only for human player when waiting
    if (this.turnState === 'waiting' && this.currentPlayer === 1) {
      const cueBall = this.balls.find(b => b.ballType === 'cue');
      this.cue.draw(cueBall);
    }

    if (this.turnState === 'ball_in_hand' && this.currentPlayer === 1) {
      this._drawBallInHand();
    }

    this._drawHUD();

    if (this.gamePhase === 'gameover') {
      this._drawGameOver();
    }
  }

  _drawStartup() {
    background(10, 10, 10);

    // Vignette
    noStroke();
    for (let i = 20; i >= 0; i--) {
      fill(0, 0, 0, (20 - i) * 8);
      ellipse(550, 350, 1100 - i * 30, 700 - i * 20);
    }

    // Spotlight
    for (let i = 0; i < 15; i++) {
      fill(255, 255, 220, i * 3);
      ellipse(550, 280, 600 - i * 35, 400 - i * 25);
    }

    // Animated balls
    for (const b of this.startupBalls) {
      noStroke();
      fill(b.ballColor);
      ellipse(b.x, b.y, b.radius * 2);
      fill(255, 255, 255, 80);
      ellipse(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.7);
    }

    // Title shadow
    textAlign(CENTER, CENTER);
    textSize(52);
    textStyle(BOLD);
    fill(0, 0, 0, 150);
    text('WORLD SNOOKER CHAMPIONSHIP', 552, 202);

    // Title gold
    fill(180, 140, 20);
    text('WORLD SNOOKER CHAMPIONSHIP', 550, 200);
    fill(255, 215, 0);
    text('WORLD SNOOKER CHAMPIONSHIP', 550, 198);

    // Subtitle
    textStyle(NORMAL);
    textSize(26);
    fill(200, 180, 80);
    text('The Crucible · Sheffield', 550, 260);

    // Year
    textSize(20);
    fill(160, 140, 60);
    text(new Date().getFullYear(), 550, 295);

    // Divider
    stroke(180, 140, 20, 150);
    strokeWeight(1);
    line(250, 320, 850, 320);
    noStroke();

    // Pulsating prompt
    const pulseAlpha = (Math.sin(frameCount * 0.05) + 1) / 2 * 200 + 55;
    textSize(18);
    textStyle(BOLD);
    fill(255, 255, 200, pulseAlpha);
    text('PRESS ANY KEY OR CLICK TO START', 550, 400);

    // Fade overlay
    if (this.fadeOut) {
      fill(0, 34, 0, map(this.fadeTimer, 0, 30, 0, 255));
      rect(0, 0, 1100, 700);
    }
  }

  _drawHUD() {
    // Scoreboard bar
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, 1100, 80);

    // Computer score (left)
    const p0Active = this.currentPlayer === 0;
    textAlign(LEFT, CENTER);
    textSize(16);
    textStyle(BOLD);
    fill(p0Active ? '#FFD700' : '#aaaaaa');
    text(p0Active ? '▶ COMPUTER' : '  COMPUTER', 30, 25);
    textSize(28);
    fill(p0Active ? '#FFD700' : '#ffffff');
    text(this.scores[0], 30, 55);

    // Human score (right)
    const p1Active = this.currentPlayer === 1;
    textAlign(RIGHT, CENTER);
    textSize(16);
    textStyle(BOLD);
    fill(p1Active ? '#FFD700' : '#aaaaaa');
    text(p1Active ? 'YOU ▶' : 'YOU  ', 1070, 25);
    textSize(28);
    fill(p1Active ? '#FFD700' : '#ffffff');
    text(this.scores[1], 1070, 55);

    // Center info
    textAlign(CENTER, CENTER);
    textSize(13);
    textStyle(NORMAL);
    fill('#cccccc');
    let needText = '';
    if (this.nextBallType === 'red')      needText = 'NEED: RED';
    else if (this.nextBallType === 'colour')   needText = 'NEED: COLOUR';
    else if (this.nextBallType === 'sequence') {
      needText = `NEED: ${(this.COLOUR_SEQUENCE[this.sequenceBall] || 'DONE').toUpperCase()}`;
    }
    text(needText, 550, 30);

    const redsLeft = this.balls.filter(b => b.inPlay && b.ballType === 'red').length;
    fill('#888888');
    textSize(12);
    text(`REDS: ${redsLeft}`, 550, 55);

    // Foul message panel
    if (this.foulMessage) {
      textAlign(CENTER, CENTER);
      noStroke();
      fill(180, 20, 20, 220);
      rect(300, 305, 500, 60, 8);
      textSize(22);
      textStyle(BOLD);
      fill(255, 255, 255);
      text(this.foulMessage, 550, 335);
    }

    // Ball-in-hand instruction
    if (this.turnState === 'ball_in_hand' && this.currentPlayer === 1) {
      textAlign(CENTER, CENTER);
      textSize(18);
      textStyle(BOLD);
      fill(255, 220, 0, 200);
      text('BALL IN HAND — Click inside the D to place', 550, 640);
    }

    // Status message
    if (this.statusMessage && this.statusTimer > 0) {
      textAlign(CENTER, CENTER);
      textSize(16);
      textStyle(NORMAL);
      fill(200, 200, 200, map(this.statusTimer, 0, 60, 0, 200));
      text(this.statusMessage, 550, 90);
    }
  }

  _drawBallInHand() {
    const bounds  = this.table.getBounds();
    const centerY = (bounds.top + bounds.bottom) / 2;
    const tableW  = bounds.right - bounds.left;
    const baulkX  = bounds.left + tableW * 0.2;
    const dRadius = (bounds.bottom - bounds.top) / 6;

    noFill();
    stroke(255, 255, 0, 150);
    strokeWeight(2);
    // Left-opening D: clockwise from bottom (HALF_PI) to top (PI+HALF_PI)
    arc(baulkX, centerY, dRadius * 2, dRadius * 2, HALF_PI, PI + HALF_PI);
    noStroke();
  }

  _drawGameOver() {
    noStroke();
    fill(0, 0, 0, 180);
    rect(200, 200, 700, 300, 20);

    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(40);
    fill('#FFD700');
    text('GAME OVER', 550, 280);

    textSize(22);
    fill('#ffffff');
    const winner = this.scores[0] > this.scores[1] ? 'Computer wins!' :
                   this.scores[1] > this.scores[0] ? 'You win!' : 'Draw!';
    text(winner, 550, 330);

    textSize(18);
    text(`Computer: ${this.scores[0]}  vs  You: ${this.scores[1]}`, 550, 370);

    textSize(14);
    fill('#aaaaaa');
    textStyle(NORMAL);
    text('Refresh to play again', 550, 420);
  }

  // ─── event handlers ──────────────────────────────────────────────────────────

  handleMousePressed(mx, my) {
    if (this.gamePhase === 'startup') {
      this.soundManager.unlock();
      this.soundManager.stopIntro();
      this.fadeOut = true;
      return;
    }

    if (this.turnState === 'ball_in_hand' && this.currentPlayer === 1) {
      this._handleBallInHandPlacement(mx, my);
      return;
    }

    if (this.turnState === 'waiting' && this.currentPlayer === 1) {
      const cueBall = this.balls.find(b => b.ballType === 'cue');
      this.cue.mousePressed(mx, my, cueBall, true, false);
    }
  }

  handleMouseDragged(mx, my) {
    if (this.turnState === 'waiting' && this.currentPlayer === 1) {
      const cueBall = this.balls.find(b => b.ballType === 'cue');
      this.cue.mouseDragged(mx, my, cueBall);
    }
  }

  handleMouseReleased() {
    if (this.turnState === 'waiting' && this.currentPlayer === 1) {
      const cueBall = this.balls.find(b => b.ballType === 'cue');
      const shotFired = this.cue.mouseReleased(cueBall);
      if (shotFired) {
        this.physics.resetShotTracking();
        this.turnState = 'shot_in_progress';
      }
    }
  }

  handleKeyPressed() {
    if (this.gamePhase === 'startup') {
      this.soundManager.unlock();
      this.soundManager.stopIntro();
      this.fadeOut = true;
    }
  }

  _handleBallInHandPlacement(mx, my) {
    const bounds  = this.table.getBounds();
    const centerY = (bounds.top + bounds.bottom) / 2;
    const tableW  = bounds.right - bounds.left;
    const baulkX  = bounds.left + tableW * 0.2;
    const dRadius = (bounds.bottom - bounds.top) / 6;

    const dx   = mx - baulkX;
    const dy   = my - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Inside D: left of baulkX and within dRadius
    if (dist <= dRadius && dx <= 0) {
      const cueBall = this.balls.find(b => b.ballType === 'cue');
      if (cueBall) {
        cueBall.x     = mx;
        cueBall.y     = my;
        cueBall.inPlay = true;
        cueBall.vx     = 0;
        cueBall.vy     = 0;
        this.turnState = 'waiting';
        this.aiTimer   = 0;
      }
    }
  }
}
