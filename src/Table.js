export class Table {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.cushionW = 22;
    this.pocketRadius = 20;

    this.pocketPositions = [
      { x: x,       y: y,       isMiddle: false }, // top-left
      { x: x + w/2, y: y - 2,   isMiddle: true  }, // top-middle
      { x: x + w,   y: y,       isMiddle: false }, // top-right
      { x: x,       y: y + h,   isMiddle: false }, // bottom-left
      { x: x + w/2, y: y + h+2, isMiddle: true  }, // bottom-middle
      { x: x + w,   y: y + h,   isMiddle: false }, // bottom-right
    ];
  }

  getBounds() {
    return {
      left:   this.x,
      right:  this.x + this.w,
      top:    this.y,
      bottom: this.y + this.h
    };
  }

  getBaulkLineX() {
    return this.x + this.w * 0.2;
  }

  getDRadius() {
    return this.h / 6;
  }

  draw() {
    push();

    // Outer wood frame
    fill(60, 35, 10);
    noStroke();
    rect(this.x - 35, this.y - 35, this.w + 70, this.h + 70, 8);

    // Cushion area
    fill(101, 67, 33);
    rect(this.x - this.cushionW, this.y - this.cushionW,
         this.w + this.cushionW * 2, this.h + this.cushionW * 2, 4);

    // Green felt playing surface
    fill(35, 100, 45);
    noStroke();
    rect(this.x, this.y, this.w, this.h);

    // Felt texture
    stroke(30, 90, 40, 80);
    strokeWeight(0.5);
    for (let i = 0; i < this.h; i += 8) {
      line(this.x, this.y + i, this.x + this.w, this.y + i);
    }
    noStroke();

    const baulkX  = this.getBaulkLineX();
    const dRadius = this.getDRadius();
    const centerY = this.y + this.h / 2;

    // Baulk line
    stroke(245, 235, 190, 180);
    strokeWeight(1.5);
    line(baulkX, this.y, baulkX, this.y + this.h);

    // D semicircle — opens LEFT toward baulk cushion
    noFill();
    stroke(245, 235, 190, 180);
    strokeWeight(1.5);
    arc(baulkX, centerY, dRadius * 2, dRadius * 2, HALF_PI, PI + HALF_PI);
    noStroke();

    // Ball spots (small coloured dots)
    const spotDefs = [
      { x: this.x + this.w * 0.2,   y: centerY + dRadius, c: '#f5e642' }, // yellow
      { x: this.x + this.w * 0.2,   y: centerY,           c: '#228B22' }, // green
      { x: this.x + this.w * 0.2,   y: centerY - dRadius, c: '#8B4513' }, // brown
      { x: this.x + this.w * 0.5,   y: centerY,           c: '#0066cc' }, // blue
      { x: this.x + this.w * 0.753, y: centerY,           c: '#ff69b4' }, // pink
      { x: this.x + this.w * 0.882, y: centerY,           c: '#333333' }, // black
    ];

    for (const spot of spotDefs) {
      fill(spot.c);
      noStroke();
      ellipse(spot.x, spot.y, 5, 5);
    }

    // Pocket circles
    for (const pocket of this.pocketPositions) {
      fill(0);
      noStroke();
      ellipse(pocket.x, pocket.y, this.pocketRadius * 2.2, this.pocketRadius * 2.2);
      fill(5, 5, 5);
      ellipse(pocket.x, pocket.y, this.pocketRadius * 2, this.pocketRadius * 2);
      fill(0);
      ellipse(pocket.x, pocket.y, this.pocketRadius * 1.5, this.pocketRadius * 1.5);
    }

    pop();
  }
}
