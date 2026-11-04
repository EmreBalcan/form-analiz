// One Euro filtresi: yavaş hareketlerde titremeyi keser, hızlı harekette gecikme yapmaz.
class LowPass {
  constructor() { this.y = null; }
  filter(x, a) { this.y = this.y === null ? x : a * x + (1 - a) * this.y; return this.y; }
}
const alpha = (cutoff, dt) => { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); };

export class OneEuro {
  constructor({ minCutoff = 1.5, beta = 0.01, dCutoff = 1.0 } = {}) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.x = new LowPass(); this.dx = new LowPass(); this.t = null; this.prev = null;
  }
  reset() { this.x = new LowPass(); this.dx = new LowPass(); this.t = null; this.prev = null; }
  filter(value, t) {
    if (this.t === null) { this.t = t; this.prev = value; this.x.filter(value, 1); this.dx.filter(0, 1); return value; }
    const dt = Math.max(1e-3, (t - this.t) / 1000);
    this.t = t;
    const d = (value - this.prev) / dt;
    this.prev = value;
    const ed = this.dx.filter(d, alpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(ed);
    return this.x.filter(value, alpha(cutoff, dt));
  }
}

/** 33 nokta için x,y,z filtresi + görünürlük için yumuşatma. Nokta kaybolursa filtre sıfırlanır. */
export class LandmarkSmoother {
  constructor(opts) {
    this.opts = opts;
    this.f = Array.from({ length: 33 }, () => [new OneEuro(opts), new OneEuro(opts), new OneEuro(opts)]);
    this.vis = new Array(33).fill(0);
  }
  reset() { this.f.forEach((a) => a.forEach((o) => o.reset())); this.vis.fill(0); }
  apply(points, t) {
    return points.map((p, i) => {
      this.vis[i] = 0.6 * p.v + 0.4 * this.vis[i];
      if (p.v < 0.2) { this.f[i].forEach((o) => o.reset()); return { ...p, v: this.vis[i] }; }
      const [fx, fy, fz] = this.f[i];
      return { x: fx.filter(p.x, t), y: fy.filter(p.y, t), z: fz.filter(p.z, t), v: this.vis[i] };
    });
  }
}
