import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, GitBranch, Network, ScanSearch, Sparkles, Target } from 'lucide-react';

type Chapter = { number: string; overline: string; title: string; detail: string; icon: typeof GitBranch; camera: { scale: number; x: number; y: number; rotate: number } };

const chapters: Chapter[] = [
  { number: '01', overline: 'THE REPOSITORY', title: 'Start with the whole shape.', detail: 'A repository arrives as a landscape of files, modules and first relationships.', icon: GitBranch, camera: { scale: .64, x: 0, y: 0, rotate: 0 } },
  { number: '02', overline: 'SELECT A NODE', title: 'Choose one place to begin.', detail: 'A single file comes forward while its surrounding system falls into context.', icon: Target, camera: { scale: 1.58, x: -104, y: -30, rotate: -3 } },
  { number: '03', overline: 'FOLLOW THE THREAD', title: 'Travel the connection.', detail: 'The route draws itself from the selected node to the relationships it depends on.', icon: Network, camera: { scale: 2.18, x: -176, y: -74, rotate: 3 } },
  { number: '04', overline: 'RETURN TO CONTEXT', title: 'See the system again.', detail: 'The focused path becomes part of the larger architecture instead of disappearing into it.', icon: ScanSearch, camera: { scale: .78, x: 38, y: 12, rotate: 0 } },
  { number: '05', overline: 'READ THE EVIDENCE', title: 'Turn structure into a signal.', detail: 'Complexity, churn, cycles and source evidence attach to the map.', icon: Sparkles, camera: { scale: 1.32, x: -36, y: -22, rotate: -1.5 } },
];

const routes = [
  'M365 270 C296 216 224 180 140 130',
  'M365 270 C430 210 502 172 590 130',
  'M365 270 C420 322 488 378 560 420',
  'M365 270 C292 324 228 362 160 390',
  'M365 270 C365 205 368 150 370 90',
  'M140 130 C275 34 472 24 590 130 C690 218 690 334 560 420 C440 520 236 502 160 390 C52 304 48 200 140 130',
];

export function RepositoryJourney() {
  const [active, setActive] = useState(0);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const sceneRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start end', 'end start'] });
  const sceneY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.chapter));
    }, { threshold: .55, rootMargin: '-14% 0px -14% 0px' });
    chapterRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const chapter = chapters[active];
  const Icon = chapter.icon;

  return (
    <section className="journey-story-cinema" aria-labelledby="journey-title">
      <div className="journey-cinema-stage">
        <motion.div ref={sceneRef} style={{ y: sceneY }} className={`journey-visual journey-visual--${active}`} aria-label="Animated atlas graph showing repository architecture at multiple scales" role="img">
          <div className="journey-visual__topline"><span>CODEDARPAN / ATLAS FILM</span><span><i /> FRAME {chapter.number} / 05</span></div>
          <div className="journey-graph" aria-hidden="true">
            <motion.div className="journey-camera" animate={chapter.camera} transition={{ type: 'tween', duration: 1.55, ease: [0.16, 1, 0.3, 1] }}>
              <svg viewBox="0 0 730 540" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="journey-line" x1="0" x2="1"><stop offset="0" stopColor="#af8c57" /><stop offset="1" stopColor="#8f3030" /></linearGradient>
                  <radialGradient id="node-metal" cx="32%" cy="22%" r="78%"><stop offset="0" stopColor="#fff8e9" /><stop offset=".24" stopColor="#dfc17e" /><stop offset=".68" stopColor="#a77b37" /><stop offset="1" stopColor="#604321" /></radialGradient>
                  <radialGradient id="glass-node" cx="28%" cy="18%" r="86%"><stop offset="0" stopColor="#fffdf5" stopOpacity=".98" /><stop offset=".2" stopColor="#fff4d9" stopOpacity=".96" /><stop offset=".5" stopColor="#e5c991" stopOpacity=".82" /><stop offset=".78" stopColor="#b58a50" stopOpacity=".62" /><stop offset="1" stopColor="#fff8e8" stopOpacity=".92" /></radialGradient>
                  <radialGradient id="node-ivory" cx="30%" cy="20%" r="82%"><stop offset="0" stopColor="#fffdf4" /><stop offset=".42" stopColor="#e9d7b5" /><stop offset=".82" stopColor="#af8c57" /><stop offset="1" stopColor="#6b4f2f" /></radialGradient>
                  <filter id="engraved-shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#6d5334" floodOpacity=".2" /></filter>
                  <linearGradient id="brass-highlight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0bd" /><stop offset=".3" stopColor="#d5aa58" /><stop offset=".58" stopColor="#8b6027" /><stop offset="1" stopColor="#f0cf8a" /></linearGradient>
                </defs>
                <g className="journey-artefacts">
                  <g className="journey-artefact journey-artefact--north"><path className="artefact-extrude" d="M290 58 L382 33 L432 63 L340 89 Z" /><path className="artefact-face" d="M290 48 L382 23 L432 53 L340 79 Z" /><circle cx="360" cy="50" r="13" /><path d="M329 56 L392 39" /></g>
                  <g className="journey-artefact journey-artefact--west"><path className="artefact-extrude" d="M62 226 L152 201 L185 222 L95 248 Z" /><path className="artefact-face" d="M62 216 L152 191 L185 212 L95 238 Z" /><circle cx="125" cy="214" r="10" /><circle cx="155" cy="207" r="5" /></g>
                  <g className="journey-artefact journey-artefact--east"><path className="artefact-extrude" d="M548 238 L627 214 L667 240 L588 264 Z" /><path className="artefact-face" d="M548 228 L627 204 L667 230 L588 254 Z" /><path d="M575 230 L635 212 M585 239 L646 221" /></g>
                  <g className="journey-artefact journey-artefact--south"><path className="artefact-extrude" d="M330 437 L420 411 L461 437 L370 463 Z" /><path className="artefact-face" d="M330 427 L420 401 L461 427 L370 453 Z" /><circle cx="393" cy="428" r="12" /></g>
                </g>
                <g className="journey-structural-figures">
                  <g className="structure-tower"><path className="structure-side" d="M74 286 L122 272 L122 340 L74 354 Z" /><path className="structure-face" d="M74 276 L122 262 L122 330 L74 344 Z" /><path d="M84 292 L112 284 M84 308 L112 300 M84 324 L112 316" /></g>
                  <g className="structure-bridge"><path className="structure-side" d="M515 324 L585 302 L626 328 L556 351 Z" /><path className="structure-face" d="M515 314 L585 292 L626 318 L556 341 Z" /><circle className="glass-node" cx="551" cy="318" r="8" fill="url(#glass-node)" /><circle className="glass-node" cx="588" cy="306" r="8" fill="url(#glass-node)" /></g>
                  <g className="structure-ring"><ellipse cx="365" cy="270" rx="82" ry="53" /><ellipse cx="365" cy="270" rx="67" ry="43" /><path d="M300 270 L430 270 M365 227 L365 313" /></g>
                </g>
                <g className="journey-showcase-elements"><g className="showcase-element showcase-element--nw"><path className="showcase-shadow" d="M73 154 L139 132 L177 154 L111 179 Z" /><path className="showcase-side" d="M73 144 L139 122 L177 144 L111 169 Z" /><path className="showcase-top" d="M73 133 L139 111 L177 133 L111 158 Z" /><path className="showcase-etch" d="M94 137 L137 123 M105 145 L151 130" /><circle cx="131" cy="128" r="9" /></g><g className="showcase-element showcase-element--ne"><path className="showcase-shadow" d="M553 154 L619 132 L657 154 L591 179 Z" /><path className="showcase-side" d="M553 144 L619 122 L657 144 L591 169 Z" /><path className="showcase-top" d="M553 133 L619 111 L657 133 L591 158 Z" /><path className="showcase-etch" d="M574 137 L617 123 M585 145 L631 130" /><circle cx="611" cy="128" r="9" /></g><g className="showcase-element showcase-element--sw"><path className="showcase-shadow" d="M73 402 L139 380 L177 402 L111 427 Z" /><path className="showcase-side" d="M73 392 L139 370 L177 392 L111 417 Z" /><path className="showcase-top" d="M73 381 L139 359 L177 381 L111 406 Z" /><path className="showcase-etch" d="M94 385 L137 371 M105 393 L151 378" /><circle cx="131" cy="376" r="9" /></g><g className="showcase-element showcase-element--se"><path className="showcase-shadow" d="M553 402 L619 380 L657 402 L591 427 Z" /><path className="showcase-side" d="M553 392 L619 370 L657 392 L591 417 Z" /><path className="showcase-top" d="M553 381 L619 359 L657 381 L591 406 Z" /><path className="showcase-etch" d="M574 385 L617 371 M585 393 L631 378" /><circle cx="611" cy="376" r="9" /></g></g>
                <g className="journey-field-lines"><ellipse cx="365" cy="270" rx="305" ry="205" /><ellipse cx="365" cy="270" rx="232" ry="151" /><ellipse cx="365" cy="270" rx="116" ry="77" /><path d="M64 270H666M365 44V496" /></g>
                <g className="journey-links">{routes.map((route, index) => <motion.path key={route} d={route} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: active >= Math.min(index + 1, 5) ? 1 : .16, opacity: active >= Math.min(index + 1, 5) ? 1 : .22 }} transition={{ duration: 1.25, delay: index * .12, ease: 'easeOut' }} />)}</g>
                <g className="journey-packets"><circle cx="365" cy="270" r="4" /><circle cx="140" cy="130" r="3" /><circle cx="590" cy="130" r="3" /><circle cx="560" cy="420" r="3" /><circle cx="160" cy="390" r="3" /><circle cx="370" cy="90" r="3" /></g>
                <g className="journey-flow-packets"><circle><animateMotion dur="3.6s" repeatCount="indefinite" path="M365 270 C296 216 224 180 140 130" /></circle><circle><animateMotion dur="4.2s" begin="-.9s" repeatCount="indefinite" path="M365 270 C430 210 502 172 590 130" /></circle><circle><animateMotion dur="4.5s" begin="-1.7s" repeatCount="indefinite" path="M365 270 C420 322 488 378 560 420" /></circle><circle><animateMotion dur="4s" begin="-2.4s" repeatCount="indefinite" path="M365 270 C292 324 228 362 160 390" /></circle></g>
                <motion.g className="journey-figure journey-figure--ui" animate={{ y: active === 0 ? -10 : 0, scale: active === 0 ? 1.1 : 1 }} filter="url(#engraved-shadow)"><path className="figure-shadow" d="M92 151 L140 134 L181 151 L133 169 Z" /><path className="figure-side" d="M92 143 L140 126 L181 143 L133 161 Z" /><path className="figure-top" d="M92 133 L140 116 L181 133 L133 151 Z" /><path className="figure-detail" d="M109 135 L140 124 M118 142 L151 130" /><text x="140" y="181">UI</text></motion.g>
                <motion.g className="journey-figure journey-figure--repo" animate={{ y: active === 1 || active === 2 ? -14 : 0, scale: active === 1 || active === 2 ? 1.08 : 1 }} filter="url(#engraved-shadow)"><path className="figure-shadow" d="M300 300 L365 276 L430 300 L365 326 Z" /><path className="figure-side" d="M300 286 L365 262 L430 286 L365 312 Z" /><path className="figure-top" d="M300 270 L365 246 L430 270 L365 296 Z" /><path className="figure-column" d="M330 263 L347 257 L347 226 L330 232 Z M383 257 L400 263 L400 232 L383 226 Z" /><path className="figure-arch" d="M347 232 Q365 208 383 232" /><path className="figure-detail" d="M320 275 L365 258 L410 275 M365 246 L365 292" /><text x="365" y="344">REPO</text></motion.g>
                <motion.g className="journey-figure journey-figure--api" animate={{ y: active === 2 ? -10 : 0, scale: active === 2 ? 1.1 : 1 }} filter="url(#engraved-shadow)"><path className="figure-shadow" d="M548 151 L590 136 L632 151 L590 167 Z" /><path className="figure-side" d="M548 142 L590 127 L632 142 L590 158 Z" /><path className="figure-top" d="M548 132 L590 117 L632 132 L590 148 Z" /><path className="figure-column" d="M568 128 L579 124 L579 91 L568 95 Z M601 124 L612 128 L612 95 L601 91 Z" /><path className="figure-arch" d="M579 97 Q590 80 601 97" /><text x="590" y="181">API</text></motion.g>
                <motion.g className="journey-figure journey-figure--test" animate={{ y: active === 3 ? -10 : 0, scale: active === 3 ? 1.1 : 1 }} filter="url(#engraved-shadow)"><path className="figure-shadow" d="M520 438 L560 423 L600 438 L560 454 Z" /><path className="figure-side" d="M520 429 L560 414 L600 429 L560 445 Z" /><path className="figure-top" d="M520 419 L560 404 L600 419 L560 435 Z" /><path className="figure-column" d="M538 416 L550 412 L550 379 L538 383 Z M570 412 L582 416 L582 383 L570 379 Z" /><path className="figure-arch" d="M550 385 Q560 366 570 385" /><path className="figure-detail" d="M548 423 L572 414" /><text x="560" y="469">TEST</text></motion.g>
                <motion.g className="journey-figure journey-figure--docs" animate={{ y: active >= 4 ? -10 : 0, scale: active >= 4 ? 1.1 : 1 }} filter="url(#engraved-shadow)"><path className="figure-shadow" d="M120 411 L160 396 L200 411 L160 427 Z" /><path className="figure-side" d="M120 402 L160 387 L200 402 L160 418 Z" /><path className="figure-top" d="M120 392 L160 377 L200 392 L160 408 Z" /><path className="figure-top figure-top--thin" d="M127 382 L160 370 L193 382 L160 395 Z" /><path className="figure-detail" d="M141 389 L160 382 L179 389 M146 399 L174 389" /><text x="160" y="442">DOCS</text></motion.g>
                <motion.g className="journey-figure journey-figure--auth" animate={{ y: active >= 4 ? -9 : 0, scale: active >= 4 ? 1.08 : 1 }} filter="url(#engraved-shadow)"><path className="figure-shadow" d="M335 111 L370 98 L405 111 L370 125 Z" /><path className="figure-side" d="M335 102 L370 89 L405 102 L370 116 Z" /><path className="figure-top" d="M335 92 L370 79 L405 92 L370 106 Z" /><path className="figure-column" d="M348 99 L359 95 L359 70 L348 74 Z M381 95 L392 99 L392 74 L381 70 Z" /><path className="figure-arch" d="M359 75 Q370 55 381 75" /><path className="figure-detail" d="M360 91 L380 84" /><text x="370" y="143">AUTH</text></motion.g>
              </svg>
            </motion.div>
            <motion.div className="journey-callout journey-callout--top" key={`top-${active}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><span>NOW READING</span><strong>{chapter.overline.toLowerCase()}</strong></motion.div>
            <motion.div className="journey-callout journey-callout--bottom" key={`bottom-${active}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><Icon size={14} /><span>{active < 2 ? 'repository indexed' : active < 4 ? 'path in focus' : 'evidence attached'}</span></motion.div>
          </div>
          <div className="journey-visual__footer"><span>FILES / SYMBOLS / RELATIONSHIPS</span><ArrowDown size={15} className="journey-arrow" /></div>
        </motion.div>
      </div>
      <div className="journey-cinema-intro"><p className="eyebrow"><span className="eyebrow-rule" />A STORY THROUGH THE ATLAS</p><h2 id="journey-title">Travel the graph.<br />Keep the <em>context.</em></h2><p>One repository. Five changes of scale. Follow the architecture from the first shape to the evidence attached to it.</p></div>
      <div className="journey-cinema-chapters">
        {chapters.map((item, index) => <article key={item.number} ref={(element) => { chapterRefs.current[index] = element; }} data-chapter={index} className={`journey-cinema-chapter${active === index ? ' is-active' : ''}`}><div className="journey-cinema-chapter__content"><span className="journey-cinema-number">{item.number}</span><span className="journey-cinema-overline">{item.overline}</span><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}
      </div>
    </section>
  );
}
