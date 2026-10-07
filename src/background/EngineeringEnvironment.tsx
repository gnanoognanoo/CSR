import { useEffect, useRef } from 'react';
import { createParticleField, frameEase, getParticleSettings, updateParticle } from './particle-field';
import type { Particle } from './particle-field';
import './environment.css';

type EngineeringEnvironmentProps = {
  variant: 'projects' | 'members';
  motion: { readonly rotation: number };
  compact: boolean;
  reducedMotion: boolean;
  paused: boolean;
};

// Cache the restrained blue ramp once; drawing never creates color arrays.
const BLUE_RAMP = Array.from({ length: 128 }, (_, index) => {
  const progress = index / 127;
  const start = progress < .5 ? [11, 79, 138] : [22, 119, 200];
  const end = progress < .5 ? [22, 119, 200] : [106, 175, 230];
  const mix = progress < .5 ? progress * 2 : progress * 2 - 1;
  return `rgb(${start.map((channel, axis) => Math.round(channel + (end[axis] - channel) * mix)).join(',')})`;
});

/** Shared Canvas 2D surface. Foreground orbit input and physics remain independent. */
export default function InteractiveParticleBackground(props: EngineeringEnvironmentProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useRef(props);
  const scheduler = useRef<(() => void) | null>(null);
  settings.current = props;

  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext('2d', { alpha: true });
    if (!surface || !context) return;

    let width = 1, height = 1;
    let budget = getParticleSettings(settings.current.compact, window.devicePixelRatio);
    let particles: Particle[] = [];
    let frame = 0, previousTime = 0;
    let disposed = false, active = false, initialized = false, strength = 0;
    const mouse = { x: -9999, y: -9999 };
    const smooth = { x: -9999, y: -9999 };

    const draw = () => {
      context.setTransform(budget.pixelRatio, 0, 0, budget.pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.lineCap = 'round';

      // Batch all home-state dots into a single fill operation.
      context.beginPath();
      for (const particle of particles) {
        if (particle.influence < .02) context.rect(particle.x - .85, particle.y - .85, 1.7, 1.7);
      }
      context.globalAlpha = 1;
      context.fillStyle = 'rgba(100,115,130,.32)';
      context.fill();

      context.lineWidth = 1.65;
      for (const particle of particles) {
        const influence = particle.influence;
        if (influence < .02) continue;
        const angle = Math.atan2(particle.directionY, particle.directionX);
        const colorIndex = Math.round((angle + Math.PI) / (Math.PI * 2) * 127);
        const halfLength = (2 + 7 * influence) / 2;
        context.globalAlpha = .35 + .4 * influence;
        context.strokeStyle = BLUE_RAMP[colorIndex];
        context.beginPath();
        context.moveTo(particle.x - particle.directionX * halfLength, particle.y - particle.directionY * halfLength);
        context.lineTo(particle.x + particle.directionX * halfLength, particle.y + particle.directionY * halfLength);
        context.stroke();
      }
      context.globalAlpha = 1;
    };

    const running = () => !disposed && !document.hidden && !settings.current.paused && !settings.current.reducedMotion;
    const animate = (now: number) => {
      frame = 0;
      if (!running()) return;
      const elapsed = previousTime ? now - previousTime : 1000 / 60;
      previousTime = now;
      const cursorEase = frameEase(.08, elapsed);
      const particleEase = frameEase(.15, elapsed);
      smooth.x += (mouse.x - smooth.x) * cursorEase;
      smooth.y += (mouse.y - smooth.y) * cursorEase;
      strength += ((active ? 1 : 0) - strength) * cursorEase;
      if (!active && strength < .0001) strength = 0;

      let change = 0;
      for (const particle of particles) {
        change = Math.max(change, updateParticle(particle, smooth.x, smooth.y, budget.radius, budget.push, particleEase, strength));
      }
      draw();

      // A stationary cursor holds its cavity; settled dots need no idle animation.
      const cursorMoving = Math.abs(mouse.x - smooth.x) + Math.abs(mouse.y - smooth.y) > .02;
      const strengthMoving = Math.abs((active ? 1 : 0) - strength) > .0001;
      if (cursorMoving || strengthMoving || change > .005) frame = requestAnimationFrame(animate);
    };
    const wake = () => {
      if (!frame && running()) {
        previousTime = 0;
        frame = requestAnimationFrame(animate);
      }
    };
    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      wake();
    };
    scheduler.current = sync;

    const resize = () => {
      const bounds = surface.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      budget = getParticleSettings(settings.current.compact, window.devicePixelRatio);
      particles = createParticleField(width, height, budget.spacing);
      surface.width = Math.max(1, Math.round(width * budget.pixelRatio));
      surface.height = Math.max(1, Math.round(height * budget.pixelRatio));
      draw();
      sync();
    };
    const move = (clientX: number, clientY: number, touch: boolean) => {
      if (!running()) return;
      const bounds = surface.getBoundingClientRect();
      mouse.x = clientX - bounds.left;
      mouse.y = clientY - bounds.top;
      // Use the touch budget on tablets too, independently of the page breakpoint.
      const interaction = getParticleSettings(touch || settings.current.compact, window.devicePixelRatio);
      budget.radius = interaction.radius;
      budget.push = interaction.push;
      if (!initialized || !active) {
        smooth.x = mouse.x;
        smooth.y = mouse.y;
        initialized = true;
      }
      active = true;
      wake();
    };
    const onMouse = (event: MouseEvent) => move(event.clientX, event.clientY, false);
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) move(touch.clientX, touch.clientY, true);
    };
    const release = () => { active = false; wake(); };
    const onMouseOut = (event: MouseEvent) => { if (!event.relatedTarget) release(); };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length) onTouch(event); else release();
    };
    const onVisibility = () => { if (document.hidden) active = false; sync(); };
    const inputOptions = { passive: true, capture: true };

    // Capture observes input over every card/model without consuming its gesture.
    window.addEventListener('mousemove', onMouse, inputOptions);
    window.addEventListener('touchstart', onTouch, inputOptions);
    window.addEventListener('touchmove', onTouch, inputOptions);
    window.addEventListener('touchend', onTouchEnd, inputOptions);
    window.addEventListener('touchcancel', release, inputOptions);
    window.addEventListener('mouseout', onMouseOut, inputOptions);
    window.addEventListener('blur', release);
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('mousemove', onMouse, true);
      window.removeEventListener('touchstart', onTouch, true);
      window.removeEventListener('touchmove', onTouch, true);
      window.removeEventListener('touchend', onTouchEnd, true);
      window.removeEventListener('touchcancel', release, true);
      window.removeEventListener('mouseout', onMouseOut, true);
      window.removeEventListener('blur', release);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      scheduler.current = null;
    };
  }, [props.compact, props.reducedMotion]);

  useEffect(() => { scheduler.current?.(); }, [props.paused]);

  return <div className={`engineering-environment engineering-environment-${props.variant}`} aria-hidden="true">
    <canvas ref={canvas} className="engineering-environment-canvas" />
  </div>;
}
