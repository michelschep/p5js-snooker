export class Physics {
  constructor() {
    this.friction           = 0.985;
    this.stopThreshold      = 0.05;
    this.cushionRestitution = 0.75;
    this.ballRestitution    = 0.96;
    this.firstBallHit       = null;
    this.pocketedThisShot   = [];
    this.onBallHitCallback  = null;
    this.onPocketCallback   = null;
  }

  resetShotTracking() {
    this.firstBallHit     = null;
    this.pocketedThisShot = [];
  }

  update(balls, table) {
    for (const ball of balls) {
      if (!ball.inPlay) continue;
      ball.update();
      ball.vx *= this.friction;
      ball.vy *= this.friction;
      if (ball.getSpeed() < this.stopThreshold) {
        ball.vx = 0;
        ball.vy = 0;
      }
    }

    this._handleCushions(balls, table);
    this._handleBallCollisions(balls);
    this._handlePockets(balls, table);
  }

  _handleCushions(balls, table) {
    const { left, right, top, bottom } = table.getBounds();
    const pockets    = table.pocketPositions;
    const pocketGap  = 22;

    for (const ball of balls) {
      if (!ball.inPlay) continue;
      const r = ball.radius;

      if (ball.x - r < left && !this._nearPocket(ball.x, ball.y, pockets, pocketGap)) {
        ball.x  = left + r;
        ball.vx = Math.abs(ball.vx) * this.cushionRestitution;
      }
      if (ball.x + r > right && !this._nearPocket(ball.x, ball.y, pockets, pocketGap)) {
        ball.x  = right - r;
        ball.vx = -Math.abs(ball.vx) * this.cushionRestitution;
      }
      if (ball.y - r < top && !this._nearPocket(ball.x, ball.y, pockets, pocketGap)) {
        ball.y  = top + r;
        ball.vy = Math.abs(ball.vy) * this.cushionRestitution;
      }
      if (ball.y + r > bottom && !this._nearPocket(ball.x, ball.y, pockets, pocketGap)) {
        ball.y  = bottom - r;
        ball.vy = -Math.abs(ball.vy) * this.cushionRestitution;
      }
    }
  }

  _nearPocket(x, y, pockets, gap) {
    for (const p of pockets) {
      const dx = x - p.x;
      const dy = y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < gap * 1.5) return true;
    }
    return false;
  }

  _handleBallCollisions(balls) {
    const active = balls.filter(b => b.inPlay);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        const dx     = b.x - a.x;
        const dy     = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.radius + b.radius;

        if (distSq < minDist * minDist && distSq > 0) {
          const dist    = Math.sqrt(distSq);
          const nx      = dx / dist;
          const ny      = dy / dist;
          const overlap = minDist - dist;

          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const dot   = relVx * nx + relVy * ny;

          if (dot < 0) {
            const impulse = dot * this.ballRestitution;
            a.vx += impulse * nx;
            a.vy += impulse * ny;
            b.vx -= impulse * nx;
            b.vy -= impulse * ny;

            if (a.ballType === 'cue' && this.firstBallHit === null) {
              this.firstBallHit = b;
            } else if (b.ballType === 'cue' && this.firstBallHit === null) {
              this.firstBallHit = a;
            }

            const hitSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
            if (this.onBallHitCallback) this.onBallHitCallback(hitSpeed);
          }
        }
      }
    }
  }

  _handlePockets(balls, table) {
    const pockets      = table.pocketPositions;
    const pocketRadius = 18;
    for (const ball of balls) {
      if (!ball.inPlay) continue;
      for (const pocket of pockets) {
        const dx   = ball.x - pocket.x;
        const dy   = ball.y - pocket.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pocketRadius) {
          ball.inPlay = false;
          ball.vx     = 0;
          ball.vy     = 0;
          this.pocketedThisShot.push(ball);
          if (this.onPocketCallback) this.onPocketCallback(ball);
          break;
        }
      }
    }
  }

  ballsMoving(balls) {
    return balls.some(b => b.inPlay && b.getSpeed() > this.stopThreshold);
  }
}
