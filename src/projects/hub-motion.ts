export type HubPulsePose = {
  liftPx: number
  rotationY: number
}

export type HubMotionController = {
  readonly pose: HubPulsePose
  tick(deltaSeconds: number, reducedMotion?: boolean): HubPulsePose
  pause(paused: boolean): void
}

const PULSE_INTERVAL = 2
const PULSE_DURATION = 1
const LIFT_DURATION = .20
const SETTLE_START = .70
const SPIN_START = .05
const SPIN_DURATION = .65
const FULL_TURN = Math.PI * 2
const EPSILON = 1e-10

const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3)
const smoothStep = (progress: number) => progress * progress * (3 - 2 * progress)

/** Lift, turn once around the local vertical axis, then settle into exact rest. */
export function getHubPulsePose(elapsedSeconds: number, liftPixels = 8): HubPulsePose {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < PULSE_INTERVAL - EPSILON) {
    return { liftPx: 0, rotationY: 0 }
  }

  let phase = Math.max(0, elapsedSeconds - PULSE_INTERVAL) % PULSE_INTERVAL
  if (phase < EPSILON || phase >= PULSE_INTERVAL - EPSILON) phase = 0
  if (phase >= PULSE_DURATION - EPSILON) return { liftPx: 0, rotationY: 0 }

  const lift = Number.isFinite(liftPixels) ? Math.max(0, liftPixels) : 8
  let liftFactor = 1
  if (phase < LIFT_DURATION) liftFactor = easeOutCubic(phase / LIFT_DURATION)
  else if (phase > SETTLE_START) {
    liftFactor = 1 - smoothStep((phase - SETTLE_START) / (PULSE_DURATION - SETTLE_START))
  }

  let rotationY = 0
  if (phase >= SPIN_START + SPIN_DURATION - EPSILON) rotationY = FULL_TURN
  else if (phase > SPIN_START) rotationY = FULL_TURN * smoothStep((phase - SPIN_START) / SPIN_DURATION)

  return { liftPx: lift * liftFactor, rotationY }
}

/** Mutable shared pose for the renderer and matching HTML control; no timers. */
export function createHubMotionController(): HubMotionController {
  const pose: HubPulsePose = { liftPx: 0, rotationY: 0 }
  let elapsed = 0
  let paused = false

  return {
    get pose(): HubPulsePose { return pose },
    tick(deltaSeconds: number, reducedMotion = false): HubPulsePose {
      if (reducedMotion) {
        elapsed = 0
        pose.liftPx = 0
        pose.rotationY = 0
        return pose
      }
      if (paused) return pose

      const delta = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(.05, deltaSeconds)) : 0
      elapsed += delta
      // Keep the local clock bounded without accumulating turns or changing phase.
      if (elapsed >= PULSE_INTERVAL * 2) elapsed = PULSE_INTERVAL + (elapsed - PULSE_INTERVAL) % PULSE_INTERVAL
      const next = getHubPulsePose(elapsed)
      pose.liftPx = next.liftPx
      pose.rotationY = next.rotationY
      return pose
    },
    pause(nextPaused: boolean): void { paused = nextPaused },
  }
}
