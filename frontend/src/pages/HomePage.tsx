import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, FileArchive, Github, Layers3, Network, Search, ShieldAlert } from 'lucide-react';
import { ApiError, submitGitHubAnalysis, submitZipAnalysis } from '../lib/api';
import { Brand } from '../components/Brand';
import { AnalyzerHealthStatus } from '../components/AnalyzerHealthStatus';
import { StatusNotice, type NoticeKind } from '../components/StatusNotice';
import { RepositoryJourney } from '../components/RepositoryJourney';
import { HeroAtlasScene } from '../components/HeroAtlasScene';

const heroImage = '/hero-atlas-royal.jpg';
const modeAssets = {
  explore: '/manus-storage/async-images/VRhyibADRj414gcsfTz213/image-1.webp',
  diagnose: '/manus-storage/async-images/VRhyibADRj414gcsfTz213/image-2.webp',
  onboard: '/manus-storage/async-images/VRhyibADRj414gcsfTz213/image-3.webp',
  impact: '/manus-storage/async-images/VRhyibADRj414gcsfTz213/image-4.webp',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractRunId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.runId === 'string' && payload.runId.trim() ? payload.runId.trim() : null;
}

function isGitHubRepo(value: string): boolean {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const repository = parts[1]?.replace(/\.git$/i, '');
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'github.com' && parts.length === 2 && !!parts[0] && !!repository && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [intakeMode, setIntakeMode] = useState<'github' | 'zip'>('github');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [ref, setRef] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ kind: NoticeKind; title: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const showError = (title: string, message: string) => setNotice({ kind: 'error', title, message });

  const acceptFile = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setSelectedFile(null);
      showError('Choose a ZIP archive', 'The browser checks the .zip file name only. A compatible analyzer service must still validate archive safety and size.');
      return;
    }
    setNotice(null);
    setSelectedFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  };

  const handleGitHubSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const repo = repositoryUrl.trim();
    if (!isGitHubRepo(repo)) {
      showError('Check the repository URL', 'Enter a public GitHub repository link such as https://github.com/owner/repository.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const payload = await submitGitHubAnalysis({ repositoryUrl: repo, ...(ref.trim() ? { ref: ref.trim() } : {}) });
      const runId = extractRunId(payload);
      if (!runId) {
        showError('The analyzer response was incomplete', 'The service did not return the documented run identifier. No sample data was opened.');
        return;
      }
      navigate(`/workspace?runId=${encodeURIComponent(runId)}`);
    } catch (error) {
      showError('Live analysis is unavailable', error instanceof ApiError ? error.message : 'The request could not be completed. Try again when the analyzer service is available.');
    } finally {
      setBusy(false);
    }
  };

  const handleZipSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      showError('Choose a ZIP archive first', 'Select a .zip file to submit. The analyzer service is responsible for archive safety and size checks.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const payload = await submitZipAnalysis(selectedFile);
      const runId = extractRunId(payload);
      if (!runId) {
        showError('The analyzer response was incomplete', 'The service did not return the documented run identifier. No sample data was opened.');
        return;
      }
      navigate(`/workspace?runId=${encodeURIComponent(runId)}`);
    } catch (error) {
      showError('Live analysis is unavailable', error instanceof ApiError ? error.message : 'The request could not be completed. Try again when the analyzer service is available.');
    } finally {
      setBusy(false);
    }
  };

  const openSample = (mode: 'explore' | 'diagnose' | 'onboard' | 'impact' = 'explore') => navigate(`/workspace?demo=1&mode=${mode}`);

  return (
    <div className="site-shell">
      <header className="site-header">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#capabilities">Explore modes</a>
          <a href="#how-it-works">How it works</a>
          <a href="/account">Account</a>
          <a className="nav-workspace" href="/workspace">Open workspace <ArrowUpRight size={15} /></a>
        </nav>
        <a className="mobile-workspace-link" href="/workspace" aria-label="Open workspace"><ArrowUpRight size={18} /></a>
      </header>

      <main>
        <OpeningBanner />
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-rule" />CODEBASE CARTOGRAPHY <span className="eyebrow-dot">/</span> EVIDENCE FIRST</p>
            <h1 id="hero-title">The architecture is already there.<br /><em>Make it visible.</em></h1>
            <p className="hero-deck">Understand the code behind the code. Follow real dependencies, inspect matching source, and see what the returned evidence can—and cannot—tell you.</p>

            <a className="story-start-link" href="#journey-title">Begin the atlas story <ArrowDown size={15} /></a>
            <p className="hero-note"><ShieldAlert size={14} /> Follow the architecture first. Bring a repository after the story.</p>
          </div>

          <HeroAtlasScene image={heroImage} />
        </section>

        <section className="trust-strip" aria-label="Product principles">
          <div><span className="strip-number">A</span><p><strong>Evidence, not guesswork</strong><span>Only returned facts appear as live analysis.</span></p></div>
          <div><span className="strip-number">B</span><p><strong>Source stays in view</strong><span>Follow a relationship back to its file.</span></p></div>
          <div><span className="strip-number">C</span><p><strong>Uncertainty is explicit</strong><span>Unavailable data stays unavailable.</span></p></div>
        </section>

        <RepositoryJourney />

        <section className="capabilities-section section-shell" id="capabilities" aria-labelledby="capabilities-title">
          <motion.div className="section-heading" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: .35 }} transition={{ duration: .7, ease: [0.16, 1, .3, 1] }}>
            <div><p className="eyebrow"><span className="eyebrow-rule" />A FIELD GUIDE FOR CODE</p><h2 id="capabilities-title">Four ways to read<br /><em>the same atlas.</em></h2></div>
            <p>Move from structure to evidence, then keep every view tied to the same repository and selection.</p>
          </motion.div>
          <div className="mode-grid">
            <ModeCard number="01" title="Explore" name="Find the shape" image={modeAssets.explore} icon={<Network size={16} />} text="Trace imports and calls. Move between the tree, graph and source without losing your place." onClick={() => openSample('explore')} />
            <ModeCard number="02" title="Diagnose" name="Read the signals" image={modeAssets.diagnose} icon={<Search size={16} />} text="Review returned health factors, findings and history limits. No score is inferred." onClick={() => openSample('diagnose')} />
            <ModeCard number="03" title="Onboard" name="Find a first route" image={modeAssets.onboard} icon={<Layers3 size={16} />} text="Follow backend-returned contributor steps and public issues when they are available." onClick={() => openSample('onboard')} />
            <ModeCard number="04" title="Impact" name="Trace what connects" image={modeAssets.impact} icon={<ArrowUpRight size={16} />} text="Inspect structural dependents and PR changes as estimates, not runtime predictions." onClick={() => openSample('impact')} />
          </div>
        </section>

        <section className="repository-intake-section" id="repository-intake" aria-labelledby="repository-intake-title">
          <div className="repository-intake-intro"><p className="eyebrow"><span className="eyebrow-rule" />YOUR TURN</p><h2 id="repository-intake-title">Now bring the<br /><em>repository.</em></h2><p>The story showed the route. Use a public GitHub URL or upload a ZIP to open the real atlas.</p></div>
          <div className="intake-card">
            <div className="intake-head"><div><span className="intake-kicker">OPEN A REAL ATLAS</span><h2>Bring a repository</h2></div><span className="intake-index">01 / 02</span></div>
            <div className="intake-switch" role="tablist" aria-label="Choose a repository input type"><button id="tab-github" type="button" role="tab" aria-selected={intakeMode === 'github'} aria-controls="panel-github" onClick={() => { setIntakeMode('github'); setNotice(null); }}><Github size={15} /> GitHub</button><button id="tab-zip" type="button" role="tab" aria-selected={intakeMode === 'zip'} aria-controls="panel-zip" onClick={() => { setIntakeMode('zip'); setNotice(null); }}><FileArchive size={15} /> ZIP archive</button></div>
            {intakeMode === 'github' ? <form id="panel-github" role="tabpanel" aria-labelledby="tab-github" onSubmit={handleGitHubSubmit} className="intake-form"><label htmlFor="repository-url">Public GitHub repository URL</label><div className="url-field"><Github aria-hidden="true" size={16} /><input id="repository-url" type="url" placeholder="https://github.com/owner/repository" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} autoComplete="url" required /><button type="submit" disabled={busy} aria-label="Submit repository URL">{busy ? <span className="spinner" /> : <ArrowRight size={17} />}</button></div><div className="ref-row"><label htmlFor="repository-ref">Branch, tag or commit <span>(optional)</span></label><input id="repository-ref" type="text" placeholder="main" value={ref} onChange={(event) => setRef(event.target.value)} autoComplete="off" /></div><p className="field-hint">Public repositories only. Private access is not supported by this frontend.</p></form> : <form id="panel-zip" role="tabpanel" aria-labelledby="tab-zip" onSubmit={handleZipSubmit} className="intake-form"><div className={`drop-zone${dragging ? ' is-dragging' : ''}${selectedFile ? ' has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><input ref={fileInput} className="visually-hidden" type="file" accept=".zip,application/zip" aria-label="Choose ZIP archive" onChange={(event) => acceptFile(event.target.files?.[0])} /><FileArchive aria-hidden="true" size={22} />{selectedFile ? <><strong>{selectedFile.name}</strong><span>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB · file name check only</span></> : <><strong>Drop a .zip archive here</strong><span>or choose a file from your device</span></>}<button className="button-quiet" type="button" onClick={() => fileInput.current?.click()}>{selectedFile ? 'Choose another' : 'Browse files'}</button></div><div className="zip-submit-row"><p>Server safety and size checks require the analyzer.</p><button className="button-primary" type="submit" disabled={busy || !selectedFile}>{busy ? 'Sending…' : 'Analyze ZIP'} <ArrowRight size={16} /></button></div></form>}
            {notice && <StatusNotice kind={notice.kind} title={notice.title}>{notice.message}</StatusNotice>}
            <div className="sample-entry"><span>Prefer to see the product first?</span><button type="button" onClick={() => openSample('explore')}>Explore sample atlas <ArrowUpRight size={15} /></button></div>
          </div>
        </section>

        <section className="closing-note" aria-label="Final repository call to action">
          <div className="closing-copy"><span className="closing-mark">“</span><div><p>Bring the repository. Leave with a map.</p><small>Structural evidence, source context and a contributor route—kept in one workspace.</small></div></div><div className="closing-actions"><a href="#repository-intake" className="button-primary">Analyze a repository <ArrowUpRight size={15} /></a><a href="/workspace">Open the atlas <ArrowUpRight size={15} /></a></div>
        </section>

        <section className="flow-section" id="how-it-works" aria-labelledby="flow-title">
          <div className="flow-intro"><p className="eyebrow"><span className="eyebrow-rule" />A CLEAR PATH THROUGH THE CODE</p><h2 id="flow-title">From source<br />to <em>structure.</em></h2><p>Each step makes the next one easier to inspect. Missing service data is shown as missing—not filled in.</p></div>
          <ol className="flow-list">
            <FlowStep number="01" title="Ingest" text="A public GitHub URL or a ZIP you choose to submit." />
            <FlowStep number="02" title="Parse" text="A compatible analyzer reads the files it can support." />
            <FlowStep number="03" title="Resolve" text="Returned relationships connect files, symbols and evidence." />
            <FlowStep number="04" title="Explore" text="Search, select, inspect and follow the actual graph." />
          </ol>
        </section>
      </main>

      <footer className="site-footer"><div className="site-footer__brand"><Brand compact /><p>Understand the code behind the code.</p></div><div className="site-footer__links"><span>READ THE ATLAS</span><nav aria-label="Footer navigation"><a href="#capabilities">Capabilities</a><a href="#how-it-works">How it works</a><a href="/account">Account</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></div><div className="site-footer__status"><AnalyzerHealthStatus className="footer-boundary" /><span>Public analyzer status</span></div></footer>
    </div>
  );
}

function OpeningBanner() {
  const bannerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: bannerRef, offset: ['start start', 'end start'] });
  const leftX = useTransform(scrollYProgress, [0, .72, 1], ['0%', '-102%', '-108%']);
  const rightX = useTransform(scrollYProgress, [0, .72, 1], ['0%', '102%', '108%']);
  const leftSkew = useTransform(scrollYProgress, [0, .72], ['0deg', '-4deg']);
  const rightSkew = useTransform(scrollYProgress, [0, .72], ['0deg', '4deg']);
  const splashOpacity = useTransform(scrollYProgress, [0, .72, .92, 1], [1, 1, .72, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, .5, .78], [1, .96, 0]);
  const titleScale = useTransform(scrollYProgress, [0, .58, .78], [1, 1.04, .76]);
  const titleY = useTransform(scrollYProgress, [0, .78], ['0%', '-20%']);
  const titleBlur = useTransform(scrollYProgress, [0, .68, .82], ['blur(0px)', 'blur(0px)', 'blur(7px)']);
  const watermarkX = useTransform(scrollYProgress, [0, 1], ['-8%', '18%']);
  const watermarkY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const glowX = useTransform(scrollYProgress, [0, 1], ['-12%', '34%']);
  const glowY = useTransform(scrollYProgress, [0, 1], ['8%', '-20%']);
  const glowOpacity = useTransform(scrollYProgress, [0, .7, 1], [.72, .42, 0]);
  return (
    <section ref={bannerRef} className="opening-splash-shell" aria-label="Opening program">
      <motion.div className="opening-splash" aria-labelledby="opening-banner-title" style={{ opacity: splashOpacity }}>
        <motion.div className="opening-splash__glow" style={{ x: glowX, y: glowY, opacity: glowOpacity }} />
        <motion.div className="opening-splash__curtain opening-splash__curtain--left" style={{ x: leftX, skewX: leftSkew }}><span>CODEDARPAN</span><i /></motion.div>
        <motion.div className="opening-splash__curtain opening-splash__curtain--right" style={{ x: rightX, skewX: rightSkew }}><span>LIVE ATLAS</span><i /></motion.div>
        <motion.div className="opening-splash__title" style={{ opacity: titleOpacity, scale: titleScale, y: titleY, filter: titleBlur }}><span>PROGRAM / 01</span><h2 id="opening-banner-title">How to understand<br /><em>a repo.</em></h2><p>Structure / relation / context</p></motion.div>
        <motion.div className="opening-splash__watermark" style={{ x: watermarkX, y: watermarkY, rotate: -12 }}>HOW TO UNDERSTAND A REPO&nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp;HOW TO UNDERSTAND A REPO</motion.div>
        <motion.div className="opening-splash__center-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .45, duration: .75, ease: [0.16, 1, .3, 1] }} />
        <span className="opening-splash__edge opening-splash__edge--left">FILES / SYMBOLS / RELATIONSHIPS</span><span className="opening-splash__edge opening-splash__edge--right">SCROLL TO ENTER THE ATLAS <ArrowDown size={14} /></span>
      </motion.div>
    </section>
  );
}

function ModeCard({ number, title, name, image, icon, text, onClick }: { number: string; title: string; name: string; image: string; icon: React.ReactNode; text: string; onClick: () => void }) {
  return (
    <motion.article className="mode-card" initial={{ opacity: 0, y: 34, rotateX: 7 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: false, amount: .28 }} transition={{ duration: .7, delay: (Number(number) - 1) * .1, ease: [0.16, 1, .3, 1] }}>
      <button type="button" className="mode-image-button" onClick={onClick} aria-label={`Open sample atlas in ${title} mode`}><img src={image} alt="" loading="lazy" /><span className="mode-open"><ArrowUpRight size={16} /></span></button>
      <div className="mode-card__meta"><span>{number} / {title.toUpperCase()}</span>{icon}</div>
      <h3>{name}</h3><p>{text}</p>
    </motion.article>
  );
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <li><span className="flow-step-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div><Check aria-hidden="true" size={16} /></li>;
}
