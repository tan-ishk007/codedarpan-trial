import { useRef } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, Crosshair, Layers3 } from 'lucide-react';

type HeroAtlasSceneProps = { image: string };

export function HeroAtlasScene({ image }: HeroAtlasSceneProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ['start end', 'end start'] });
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-.5, .5], [5, -5]), { stiffness: 130, damping: 18 });
  const rotateY = useSpring(useTransform(pointerX, [-.5, .5], [-7, 7]), { stiffness: 130, damping: 18 });
  const imageX = useSpring(useTransform(pointerX, [-.5, .5], [-12, 12]), { stiffness: 90, damping: 22 });
  const imageY = useSpring(useTransform(pointerY, [-.5, .5], [-8, 8]), { stiffness: 90, damping: 22 });
  const sceneScale = useTransform(scrollYProgress, [0, .35, .75, 1], [.9, 1.05, .98, .9]);
  const sceneY = useTransform(scrollYProgress, [0, .45, 1], [55, 0, -70]);
  const sceneRotate = useTransform(scrollYProgress, [0, .5, 1], [2, 0, -1.5]);
  const imageOpacity = useTransform(scrollYProgress, [0, .48, .82, 1], [1, 1, .32, .08]);
  const routeOpacity = useTransform(scrollYProgress, [0, .35, .7, 1], [.42, .8, 1, 1]);
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds) return;
    pointerX.set((event.clientX - bounds.left) / bounds.width - .5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - .5);
  };
  const reset = () => { pointerX.set(0); pointerY.set(0); };
  return (
    <motion.div className="hero-atlas-scene" ref={frameRef} style={{ scale: sceneScale, y: sceneY, rotateX: sceneRotate }} onPointerMove={handlePointerMove} onPointerLeave={reset} initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.15, ease: [0.16, 1, .3, 1] }}>
      <motion.div className="hero-atlas-card" style={{ rotateX, rotateY }}>
        <motion.img className="hero-atlas-image" src={image} alt="A three-dimensional code atlas with raised modules, brass relationship paths and layered parchment terrain." style={{ x: imageX, y: imageY, opacity: imageOpacity }} />
        <div className="hero-atlas-vignette" />
        <div className="hero-atlas-grid" />
        <motion.svg className="hero-atlas-routes" viewBox="0 0 620 560" preserveAspectRatio="none" style={{ opacity: routeOpacity }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55, duration: .8 }} aria-hidden="true">
          <defs><linearGradient id="hero-route" x1="0" x2="1"><stop offset="0" stopColor="#d0a866" /><stop offset="1" stopColor="#8f3030" /></linearGradient></defs>
          <motion.path d="M92 154 C160 110 196 198 278 174 S386 82 524 142" pathLength="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .4, duration: 1.6, ease: 'easeInOut' }} />
          <motion.path d="M278 174 C300 252 240 304 174 360 S310 424 464 348" pathLength="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .75, duration: 1.7, ease: 'easeInOut' }} />
          <motion.path d="M386 82 C430 162 430 228 464 348" pathLength="1" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 1.5, ease: 'easeInOut' }} />
          <circle cx="92" cy="154" r="7" /><circle cx="278" cy="174" r="11" /><circle cx="386" cy="82" r="8" /><circle cx="524" cy="142" r="7" /><circle cx="464" cy="348" r="9" />
        </motion.svg>
        <motion.div className="hero-atlas-depth-tag hero-atlas-depth-tag--one" animate={{ y: [0, -5, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}><Crosshair size={12} /><span>RELATION / 03</span></motion.div>
        <motion.div className="hero-atlas-depth-tag hero-atlas-depth-tag--two" animate={{ y: [0, 5, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: .3 }}><Layers3 size={12} /><span>DEPTH / 02</span></motion.div>
        <div className="hero-atlas-node hero-atlas-node--primary"><span>B</span><i /></div><div className="hero-atlas-node hero-atlas-node--secondary"><span>C</span><i /></div>
        <div className="hero-atlas-scanline" />
      </motion.div>
      <div className="hero-atlas-frame-label"><span>STRUCTURE / RELATION / CONTEXT</span><span>LIVE ATLAS</span></div>
      <div className="hero-atlas-morph-label"><span>THE IMAGE</span><i /> <strong>BECOMES THE MAP</strong></div>
      <div className="hero-atlas-caption"><span>01</span><p>A map built from relationships.<br /><strong>Not a picture standing in for them.</strong></p><ArrowDown size={15} /></div>
    </motion.div>
  );
}
