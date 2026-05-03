export class Cue {
  constructor() {
    this.isAiming = false;
    this.dragX    = 0;
    this.dragY    = 0;
    this.power    = 0;
    this.angle    = 0;
    this.maxDrag  = 150;
    this.maxPower = 18;
  }

  mousePressed(mx, my, cueBall, isHumanTurn, ballsMoving) {
    if (!isHumanTurn || ballsMoving) return;
    if (!cueBall || !cueBall.inPlay) return;
    const dx = mx - cueBall.x;
    const dy = my - cueBall.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 80) {
      this.isAiming = true;
      this.dragX    = mx;
      this.dragY    = my;
    }
  }

  mouseDragged(mx, my, cueBall) {
    if (!this.isAiming || !cueBall) return;
    this.dragX     = mx;
    this.dragY     = my;
    const dx       = mx - cueBall.x;
    const dy       = my - cueBall.y;
    const dragDist = Math.min(Math.sqrt(dx * dx + dy * dy), this.maxDrag);
    this.power     = dragDist / this.maxDrag;
    this.angle     = Math.atan2(dy, dx);
  }

  mouseReleased(cueBall) {
    if (!this.isAiming || !cueBall) return false;
    // Shot is opposite to drag direction
    const shotAngle = this.angle + Math.PI;
    const speed     = this.power * this.maxPower;
    cueBall.vx      = Math.cos(shotAngle) * speed;
    cueBall.vy      = Math.sin(shotAngle) * speed;
    this.isAiming   = false;
    this.power      = 0;
    return true;
  }

  draw(cueBall) {
    if (!this.isAiming || !cueBall) return;
    push();

    // Power bar
    const barX = cueBall.x - 20;
    const barY = cueBall.y + 20;
    noStroke();
    fill(50, 50, 50, 150);
    rect(barX, barY, 40, 8, 3);
    const r = Math.floor(this.power * 255);
    const g = Math.floor((1 - this.power) * 255);
    fill(r, g, 0, 200);
    rect(barX, barY, 40 * this.power, 8, 3);

    // Cue stick — angle is direction from cueBall to mouse (drag direction)
    // Tip sits at cueBall edge in the drag direction, offset by power pullback
    const cueLength = 120;
    const tipX = cueBall.x + Math.cos(this.angle) * (cueBall.radius + this.power * 15 + 5);
    const tipY = cueBall.y + Math.sin(this.angle) * (cueBall.radius + this.power * 15 + 5);
    const buttX = tipX + Math.cos(this.angle) * cueLength;
    const buttY = tipY + Math.sin(this.angle) * cueLength;

    strokeWeight(8);
    stroke(139, 90, 43);
    line(tipX, tipY,
         buttX - Math.cos(this.angle) * (cueLength * 0.7),
         buttY - Math.sin(this.angle) * (cueLength * 0.7));
    strokeWeight(12);
    stroke(101, 67, 33);
    line(buttX - Math.cos(this.angle) * (cueLength * 0.7),
         buttY - Math.sin(this.angle) * (cueLength * 0.7),
         buttX, buttY);

    pop();
  }
}
