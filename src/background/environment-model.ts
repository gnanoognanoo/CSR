export type EnvironmentBudget = {
  pixelRatio: number;
  signalCount: number;
  panelCount: number;
  frameInterval: number;
};

/** Keep the atmospheric layer cheaper than either page's foreground scene. */
export function getEnvironmentBudget(width: number, height: number, compact: boolean, devicePixelRatio: number): EnvironmentBudget {
  const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;
  const area = safeWidth * safeHeight;
  const requestedRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    pixelRatio: Math.min(requestedRatio, compact ? 1 : 1.35, Math.sqrt((compact ? 600_000 : 1_600_000) / area)),
    signalCount: compact ? 96 : Math.min(440, Math.max(320, Math.round(safeWidth / 3.4))),
    panelCount: compact ? 3 : 6,
    frameInterval: 1000 / 30,
  };
}

export type EngineeringSignal = {
  u: number;
  v: number;
  depth: number;
  phase: number;
  tone: number;
};

/** Stable sampling makes the field resize without random flickering. */
export function createSignals(count: number): EngineeringSignal[] {
  let seed = 741_103;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return (seed - 1) / 2_147_483_646;
  };
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => ({
    u: random() * 2 - 1,
    v: random() * 2 - 1,
    depth: random(),
    phase: random() * Math.PI * 2,
    tone: random(),
  })).sort((a, b) => a.depth - b.depth);
}
