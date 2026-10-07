import { useEffect, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { FrameEngine } from './frame-engine';
gsap.registerPlugin(ScrollTrigger);
export function useExperience(root: RefObject<HTMLDivElement | null>, canvas: RefObject<HTMLCanvasElement | null>) {
  const [chapter, setChapter] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches); media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!root.current || !canvas.current) return;
    const element = root.current;
    const mobile = matchMedia('(max-width: 760px)').matches;
    let engine: FrameEngine | undefined;
    let lenis: Lenis | undefined;
    if (!reduced) engine = new FrameEngine(canvas.current, mobile, false, ok => { setReady(true); setFailed(!ok); });
    else setReady(true);
    // Never block navigation or content for a stalled connection.
    const timeout = setTimeout(() => { setReady(true); }, 4500);
    const ticker = (time: number) => lenis?.raf(time * 1000);
    if (!reduced) {
      lenis = new Lenis({ duration: .9, smoothWheel: true, syncTouch: false, anchors: true });
      lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(ticker); gsap.ticker.lagSmoothing(0);
    }
    const chapters = Array.from(element.querySelectorAll<HTMLElement>('[data-chapter]'));
    const ctx = gsap.context(() => {
      if (!reduced) ScrollTrigger.create({trigger: element, start:'top top', end:'bottom bottom', pin: element.querySelector('.cinema'), pinSpacing:false});
      chapters.forEach((section, index) => {
        const update = (progress: number) => {
          setChapter(index); engine?.update(index, progress);
          if (index === 1) element.querySelectorAll('.process-scale > span').forEach((node, i) => node.classList.toggle('is-active', i === Math.min(4, Math.floor(progress * 5))));
        };
        // One-pixel tolerance accounts for native subpixel scroll rounding at anchor targets.
        ScrollTrigger.create({ trigger: section, start:'top top+=1', end: index === chapters.length - 1 ? 'bottom bottom' : 'bottom top+=1', onUpdate:self=>{if(self.isActive) update(self.progress);}, onEnter:self=>update(self.progress), onEnterBack:self=>update(self.progress) });
      });
      if (!reduced) {
        gsap.fromTo('.hero-title', {opacity:.5,letterSpacing:'-.055em'}, {opacity:1,letterSpacing:'-.07em',duration:1.1,ease:'power2.out'});
        element.querySelectorAll<HTMLElement>('[data-reveal]').forEach(node => {
          gsap.fromTo(node, { y: mobile ? 18 : 35, opacity: .15 }, {y:0,opacity:1,ease:'none',scrollTrigger:{trigger:node,start:'top 94%',end:'top 69%',scrub:true}});
        });
        element.querySelectorAll<HTMLElement>('[data-parallax]').forEach(node=>{
          gsap.fromTo(node,{y:20},{y:-(Number(node.dataset.parallax)||40),ease:'none',scrollTrigger:{trigger:node.closest('.story-beat')||node,start:'top bottom',end:'bottom top',scrub:true}});
        });
      }
    }, element);
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) engine?.prefetch(Number((entry.target as HTMLElement).dataset.chapter));
    }), { rootMargin:'150px' });
    chapters.forEach(section=>observer.observe(section));
    let layoutFrame = 0;
    const layoutObserver = new ResizeObserver(() => {
      cancelAnimationFrame(layoutFrame);
      layoutFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    chapters.forEach(section=>layoutObserver.observe(section));
    const resize = () => engine?.resize(); window.addEventListener('resize',resize);
    const mouse = (event: PointerEvent) => {
      if (reduced || mobile || event.pointerType !== 'mouse') return;
      gsap.to('.cinema canvas',{x:(event.clientX/innerWidth-.5)*12,y:(event.clientY/innerHeight-.5)*12,duration:1.3,overwrite:true});
      gsap.to('.hero-content',{x:(event.clientX/innerWidth-.5)*18,y:(event.clientY/innerHeight-.5)*18,duration:1.5,overwrite:true});
      gsap.to('.hero-annotation',{x:(event.clientX/innerWidth-.5)*32,y:(event.clientY/innerHeight-.5)*32,duration:1.6,overwrite:true});
    };
    window.addEventListener('pointermove',mouse,{passive:true});
    const refresh = requestAnimationFrame(()=>ScrollTrigger.refresh());
    return () => {
      clearTimeout(timeout); cancelAnimationFrame(refresh); cancelAnimationFrame(layoutFrame); layoutObserver.disconnect(); ctx.revert(); observer.disconnect();
      gsap.killTweensOf('.cinema canvas, .hero-content, .hero-annotation');
      engine?.destroy(); lenis?.destroy(); gsap.ticker.remove(ticker);
      window.removeEventListener('resize',resize); window.removeEventListener('pointermove',mouse);
    };
  }, [root, canvas, reduced]);
  return { chapter, ready, failed, reduced };
}
