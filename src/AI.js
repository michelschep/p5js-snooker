export class AI {
  constructor() {
    this.thinkTime  = 1500;
    this.accuracy   = 0.08;
    this.missChance = 0.2;
  }

  calculateShot(cueBall, balls, table, nextBallType) {
    if (Math.random() < this.missChance) {
      return this._safetyShot(cueBall, balls, table, nextBallType);
    }

    const targets = this._getTargetBalls(balls, nextBallType);
    if (targets.length === 0) return null;

    const pockets  = table.pocketPositions;
    let bestShot   = null;
    let bestScore  = -1;

    for (const target of targets) {
      for (const pocket of pockets) {
        const shot = this._evaluatePot(cueBall, target, pocket, balls, table);
        if (shot && shot.score > bestScore) {
          bestScore = shot.score;
          bestShot  = { ...shot, target };
        }
      }
    }

    if (bestShot) {
      bestShot.angle += (Math.random() - 0.5) * this.accuracy;
      return bestShot;
    }

    return this._safetyShot(cueBall, balls, table, nextBallType);
  }

  _getTargetBalls(balls, nextBallType) {
    if (nextBallType === 'red') {
      return balls.filter(b => b.inPlay && b.ballType === 'red');
    }
    if (nextBallType === 'colour') {
      return balls
        .filter(b => b.inPlay && b.ballType === 'colour')
        .sort((a, b) => b.ballValue - a.ballValue);
    }
    // sequence
    const sequence = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
    for (const nm of sequence) {
      const ball = balls.find(b => b.inPlay && b.name === nm);
      if (ball) return [ball];
    }
    return [];
  }

  _evaluatePot(cueBall, target, pocket, allBalls, table) {
    const dx   = target.x - pocket.x;
    const dy   = target.y - pocket.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return null;

    const nx     = dx / dist;
    const ny     = dy / dist;
    const ghostX = target.x + nx * target.radius * 2;
    const ghostY = target.y + ny * target.radius * 2;

    const adx   = ghostX - cueBall.x;
    const ady   = ghostY - cueBall.y;
    const shotAngle = Math.atan2(ady, adx);

    if (!this._pathClear(cueBall.x, cueBall.y, ghostX, ghostY, cueBall.radius, allBalls, [cueBall, target])) {
      return null;
    }
    if (!this._pathClear(target.x, target.y, pocket.x, pocket.y, target.radius, allBalls, [cueBall, target])) {
      return null;
    }
    if (!this._inTableBounds(ghostX, ghostY, table, cueBall.radius)) return null;

    const isPocketMiddle = pocket.isMiddle ? 1.5 : 1.0;
    const cueDist        = Math.sqrt(adx * adx + ady * ady);
    const score          = (isPocketMiddle * target.ballValue * 10) / (1 + cueDist * 0.01);
    const shotPower      = Math.min(15, Math.max(5, cueDist * 0.08));

    return { angle: shotAngle, power: shotPower, score };
  }

  _pathClear(x1, y1, x2, y2, ballRadius, allBalls, exclude) {
    const dx   = x2 - x1;
    const dy   = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return true;
    const nx = dx / dist;
    const ny = dy / dist;

    for (const ball of allBalls) {
      if (!ball.inPlay) continue;
      if (exclude.includes(ball)) continue;
      const bx       = ball.x - x1;
      const by       = ball.y - y1;
      const t        = Math.max(0, Math.min(dist, bx * nx + by * ny));
      const closestX = x1 + t * nx;
      const closestY = y1 + t * ny;
      const ddx      = ball.x - closestX;
      const ddy      = ball.y - closestY;
      if (Math.sqrt(ddx * ddx + ddy * ddy) < ballRadius + ball.radius) return false;
    }
    return true;
  }

  _inTableBounds(x, y, table, radius) {
    const b = table.getBounds();
    return x - radius > b.left && x + radius < b.right &&
           y - radius > b.top  && y + radius < b.bottom;
  }

  _safetyShot(cueBall, balls, table, nextBallType) {
    const targets = this._getTargetBalls(balls, nextBallType);
    if (targets.length === 0) return { angle: 0, power: 3 };
    const target = targets[0];
    const dx     = target.x - cueBall.x;
    const dy     = target.y - cueBall.y;
    const shotAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
    return { angle: shotAngle, power: 4 + Math.random() * 4 };
  }
}
