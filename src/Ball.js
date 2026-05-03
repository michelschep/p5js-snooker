export class Ball {
  constructor(x, y, ballColor, ballValue, ballType, name) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 11;
    this.ballColor = ballColor;
    this.ballValue = ballValue;
    this.ballType  = ballType;  // 'red' | 'colour' | 'cue'
    this.name      = name;
    this.spotX  = x;
    this.spotY  = y;
    this.inPlay = true;
    this.onSpot = true;
  }

  draw() {
    if (!this.inPlay) return;
    push();
    noStroke();
    fill(this.ballColor);
    ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
    // White specular highlight
    fill(255, 255, 255, 80);
    ellipse(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.7,
      this.radius * 0.7
    );
    pop();
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  getSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}
