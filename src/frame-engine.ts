import { frameAt, frameUrl, sequences } from './sequences';
type Job = { key: string; scene: number; frame: number; priority: number };
type Bitmap = ImageBitmap | HTMLImageElement;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Compressed frames are cached separately from the small decoded render window. */
export class FrameEngine {
  private blobs = new Map<string, Blob>();
  private decoded = new Map<string, Bitmap>();
  private pending = new Set<string>();
  private decoding = new Set<string>();
  private failed = new Map<string, number>();
  private queue: Job[] = [];
  private controller = new AbortController();
  private active = 0;
  private disposed = false;
  private raf = 0;
  private scene = 0;
  private frame = 0;
  private blend = 0;
  private width = 0;
  private height = 0;
  private step: number;
  private slowDraws = 0;
  private idle = new Map<number, ReturnType<typeof setTimeout>>();
  private lastDraw = '';
  private ready = false;
  private context: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement, private mobile: boolean, private reduced: boolean, private onReady: (ok: boolean) => void) {
    this.context = canvas.getContext('2d', { alpha: false })!;
    this.step = mobile || (navigator.hardwareConcurrency || 8) <= 4 ? 2 : 1;
    this.resize();
    this.request(0, 0, 100);
    if (!reduced) this.scheduleWarm(0, 0, 24);
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.25 : 1.5);
    this.width = window.innerWidth; this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lastDraw = ''; this.drawSoon();
  }
  update(scene: number, progress: number) {
    const nextFrame = this.reduced ? 0 : frameAt(progress, sequences[scene].count, this.step);
    const changed = scene !== this.scene;
    this.scene = scene; this.frame = nextFrame;
    // Drop stale urgent work when scrubbing quickly. The latest target must not
    // sit behind requests accumulated while the network was slower than scroll.
    this.queue = this.queue.filter(job => job.priority < 60 || (job.scene === scene && Math.abs(job.frame - nextFrame) <= 12) || (job.scene === scene + 1 && job.frame === 0));
    this.blend = this.reduced || scene === 4 ? 0 : clamp((progress - .93) / .07, 0, 1);
    if (changed) {
      this.queue = this.queue.filter(j => Math.abs(j.scene - scene) <= 1);
      this.trim(); this.lastDraw = '';
    }
    this.request(scene, nextFrame, 100);
    if (!this.reduced) {
      for (let i = 1; i <= 5; i++) {
        this.request(scene, Math.min(sequences[scene].count - 1, nextFrame + i * this.step), 70 - i);
        this.request(scene, Math.max(0, nextFrame - i * this.step), 65 - i);
      }
      this.scheduleWarm(scene, nextFrame, 28);
      if (progress > .55 && scene < 4) this.scheduleWarm(scene + 1, 0, 20);
    }
    if (this.blend > 0) this.request(scene + 1, 0, 95);
    this.drawSoon();
  }
  prefetch(scene: number) { if (!this.reduced) this.request(scene, 0, 35); }
  private scheduleWarm(scene: number, start: number, count: number) {
    // Delay noncritical work to an idle window; never enqueue the whole library.
    if (this.idle.has(scene)) return;
    this.idle.set(scene, setTimeout(() => {
      this.idle.delete(scene);
      if (this.disposed || Math.abs(scene - this.scene) > 1) return;
      const run = () => {
        for (let i = 0; i < count; i += this.step) this.request(scene, Math.min(sequences[scene].count - 1, start + i), 10);
      };
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 600 }); else run();
    }, 90));
  }
  private request(scene: number, frame: number, priority: number) {
    if (this.disposed) return;
    // Mobile assets use source indices 0,2,...238,239, including the exact endpoint.
    if (frame !== sequences[scene].count - 1) frame = Math.floor(frame / this.step) * this.step;
    const key = `${scene}:${frame}`;
    if (this.blobs.has(key)) { if (priority >= 60) void this.decode(key); return; }
    if (this.pending.has(key) || (this.failed.get(key) || 0) > Date.now()) return;
    const old = this.queue.find(j => j.key === key);
    if (old) old.priority = Math.max(old.priority, priority);
    else this.queue.push({ key, scene, frame, priority });
    this.pump();
  }
  private pump() {
    this.queue.sort((a, b) => b.priority - a.priority || Math.abs(a.frame - this.frame) - Math.abs(b.frame - this.frame));
    while (this.active < 4 && this.queue.length && !this.disposed) {
      const job = this.queue.shift()!;
      this.active++; this.pending.add(job.key);
      fetch(frameUrl(job.scene, job.frame, this.mobile), { signal: this.controller.signal, cache: 'force-cache' })
        .then(r => { if (!r.ok) throw new Error('Frame unavailable'); return r.blob(); })
        .then(async blob => {
          if (this.disposed) return;
          this.blobs.set(job.key, blob); this.trim();
          if (job.priority >= 60 || (job.scene === this.scene && Math.abs(job.frame - this.frame) < 12)) await this.decode(job.key);
        })
        .catch(() => {
          if (!this.disposed) {
            this.failed.set(job.key, Date.now() + 15000);
            if (!this.ready && job.key === '0:0') this.onReady(false);
          }
        })
        .finally(() => { this.active--; this.pending.delete(job.key); this.pump(); });
    }
  }
  private async decode(key: string) {
    if (this.decoded.has(key) || this.decoding.has(key) || this.disposed) return;
    const blob = this.blobs.get(key); if (!blob) return;
    this.decoding.add(key);
    try {
      let bitmap: Bitmap;
      if ('createImageBitmap' in window) bitmap = await createImageBitmap(blob);
      else {
        const url = URL.createObjectURL(blob); const img = new Image();
        try { img.src = url; await img.decode(); bitmap = img; } finally { URL.revokeObjectURL(url); }
      }
      if (this.disposed) { if ('close' in bitmap) bitmap.close(); return; }
      this.decoded.set(key, bitmap); this.trim();
      if (!this.ready) { this.ready = true; this.onReady(true); }
      this.drawSoon();
    } catch { this.failed.set(key, Date.now() + 15000); }
    finally { this.decoding.delete(key); }
  }
  private trim() {
    const distance = (key: string) => { const [s, f] = key.split(':').map(Number); if (s === this.scene + 1 && f === 0) return -1; return Math.abs(s - this.scene) * 500 + Math.abs(f - this.frame); };
    for (const [map, max] of [[this.blobs, this.mobile ? 160 : 300], [this.decoded, this.mobile ? 18 : 24]] as const) {
      if (map.size <= max) continue;
      const keys = [...map.keys()].sort((a, b) => distance(b) - distance(a));
      for (const key of keys.slice(0, map.size - max)) {
        const value = map.get(key); if (value && 'close' in value) value.close(); map.delete(key);
      }
    }
  }
  private closest(scene: number, frame: number): [string, Bitmap] | undefined {
    const exact = this.decoded.get(`${scene}:${frame}`); if (exact) return [`${scene}:${frame}`, exact];
    let best: [string, Bitmap] | undefined; let distance = Infinity;
    this.decoded.forEach((image, key) => { const [s, f] = key.split(':').map(Number); if (s === scene && Math.abs(f - frame) < distance) { distance = Math.abs(f - frame); best = [key, image]; } });
    return best;
  }
  private cover(image: Bitmap, scene: number) {
    const scale = Math.max(this.width / image.width, this.height / image.height);
    const w = image.width * scale, h = image.height * scale;
    this.context.drawImage(image, (this.width - w) * sequences[scene].focal, (this.height - h) * .5, w, h);
  }
  private drawSoon() {
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const current = this.closest(this.scene, this.frame); if (!current) return; // Keep the previous drawn frame while loading.
      const next = this.blend > 0 ? this.closest(this.scene + 1, 0) : undefined;
      const signature = `${current[0]}:${next?.[0]}:${this.blend.toFixed(3)}`;
      if (signature === this.lastDraw) return;
      const start = performance.now();
      this.context.globalAlpha = 1; this.cover(current[1], this.scene);
      if (next) { this.context.globalAlpha = this.blend; this.cover(next[1], this.scene + 1); this.context.globalAlpha = 1; }
      this.canvas.dataset.frame = current[0]; this.lastDraw = signature;
      if (performance.now() - start > 18) this.slowDraws++;
      if (this.slowDraws > 10) this.step = 2;
    });
  }
  destroy() {
    this.disposed = true; this.controller.abort(); cancelAnimationFrame(this.raf);
    this.idle.forEach(timer => clearTimeout(timer)); this.idle.clear();
    this.decoded.forEach(b => { if ('close' in b) b.close(); });
    this.blobs.clear(); this.decoded.clear(); this.queue = [];
  }
}
