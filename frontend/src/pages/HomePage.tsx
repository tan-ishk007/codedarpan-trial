import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, FileArchive, Github, Layers3, Network, Search, ShieldAlert } from 'lucide-react';
import { ApiError, submitGitHubAnalysis, submitZipAnalysis } from '../lib/api';
import { Brand } from '../components/Brand';
import { StatusNotice, type NoticeKind } from '../components/StatusNotice';

const heroImage = '/manus-storage/technical-atlas-hero-3d_027effd6.webp';
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
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-rule" />CODEBASE CARTOGRAPHY <span className="eyebrow-dot">/</span> EVIDENCE FIRST</p>
            <h1 id="hero-title">The architecture is already there.<br /><em>Make it visible.</em></h1>
            <p className="hero-deck">Understand the code behind the code. Follow real dependencies, inspect matching source, and see what the returned evidence can—and cannot—tell you.</p>

            <div className="intake-card" id="repository-intake">
              <div className="intake-head">
                <div><span className="intake-kicker">BEGIN AN ATLAS</span><h2>Bring a repository</h2></div>
                <span className="intake-index">01 / 02</span>
              </div>
              <div className="intake-switch" role="tablist" aria-label="Choose a repository input type">
                <button id="tab-github" type="button" role="tab" aria-selected={intakeMode === 'github'} aria-controls="panel-github" onClick={() => { setIntakeMode('github'); setNotice(null); }}><Github size={15} /> GitHub</button>
                <button id="tab-zip" type="button" role="tab" aria-selected={intakeMode === 'zip'} aria-controls="panel-zip" onClick={() => { setIntakeMode('zip'); setNotice(null); }}><FileArchive size={15} /> ZIP archive</button>
              </div>
              {intakeMode === 'github' ? (
                <form id="panel-github" role="tabpanel" aria-labelledby="tab-github" onSubmit={handleGitHubSubmit} className="intake-form">
                  <label htmlFor="repository-url">Public GitHub repository URL</label>
                  <div className="url-field"><Github aria-hidden="true" size={16} /><input id="repository-url" type="url" placeholder="https://github.com/owner/repository" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} autoComplete="url" required /><button type="submit" disabled={busy} aria-label="Submit repository URL">{busy ? <span className="spinner" /> : <ArrowRight size={17} />}</button></div>
                  <div className="ref-row"><label htmlFor="repository-ref">Branch, tag or commit <span>(optional)</span></label><input id="repository-ref" type="text" placeholder="main" value={ref} onChange={(event) => setRef(event.target.value)} autoComplete="off" /></div>
                  <p className="field-hint">Public repositories only. Private access is not supported by this frontend.</p>
                </form>
              ) : (
                <form id="panel-zip" role="tabpanel" aria-labelledby="tab-zip" onSubmit={handleZipSubmit} className="intake-form">
                  <div className={`drop-zone${dragging ? ' is-dragging' : ''}${selectedFile ? ' has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
                    <input ref={fileInput} className="visually-hidden" type="file" accept=".zip,application/zip" aria-label="Choose ZIP archive" onChange={(event) => acceptFile(event.target.files?.[0])} />
                    <FileArchive aria-hidden="true" size={22} />
                    {selectedFile ? <><strong>{selectedFile.name}</strong><span>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB · file name check only</span></> : <><strong>Drop a .zip archive here</strong><span>or choose a file from your device</span></>}
                    <button className="button-quiet" type="button" onClick={() => fileInput.current?.click()}>{selectedFile ? 'Choose another' : 'Browse files'}</button>
                  </div>
                  <div className="zip-submit-row"><p>Server safety and size checks require the analyzer.</p><button className="button-primary" type="submit" disabled={busy || !selectedFile}>{busy ? 'Sending…' : 'Analyze ZIP'} <ArrowRight size={16} /></button></div>
                </form>
              )}
              {notice && <StatusNotice kind={notice.kind} title={notice.title}>{notice.message}</StatusNotice>}
              <div className="sample-entry"><span>Want to see the atlas first?</span><button type="button" onClick={() => openSample('explore')}>Explore sample atlas <ArrowUpRight size={15} /></button></div>
            </div>
            <p className="hero-note"><ShieldAlert size={14} /> Live analysis uses the connected analyzer; outages and unsupported inputs remain explicit.</p>
          </div>

          <div className="hero-art-wrap">
            <div className="hero-art-frame">
              <img className="hero-art" src={heroImage} alt="A three-dimensional code atlas with raised modules, brass relationship paths and layered parchment terrain." />
              <div className="art-grain" aria-hidden="true" />
              <div className="art-side-label">STRUCTURE / RELATION / CONTEXT</div>
            </div>
            <div className="hero-caption"><span>01</span><p>A map built from relationships.<br /><strong>Not a picture standing in for them.</strong></p><ArrowDown size={15} /></div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Product principles">
          <div><span className="strip-number">A</span><p><strong>Evidence, not guesswork</strong><span>Only returned facts appear as live analysis.</span></p></div>
          <div><span className="strip-number">B</span><p><strong>Source stays in view</strong><span>Follow a relationship back to its file.</span></p></div>
          <div><span className="strip-number">C</span><p><strong>Uncertainty is explicit</strong><span>Unavailable data stays unavailable.</span></p></div>
        </section>

        <section className="capabilities-section section-shell" id="capabilities" aria-labelledby="capabilities-title">
          <div className="section-heading">
            <div><p className="eyebrow"><span className="eyebrow-rule" />A FIELD GUIDE FOR CODE</p><h2 id="capabilities-title">Four ways to read<br /><em>the same atlas.</em></h2></div>
            <p>Move from structure to evidence, then keep every view tied to the same repository and selection.</p>
          </div>
          <div className="mode-grid">
            <ModeCard number="01" title="Explore" name="Find the shape" image={modeAssets.explore} icon={<Network size={16} />} text="Trace imports and calls. Move between the tree, graph and source without losing your place." onClick={() => openSample('explore')} />
            <ModeCard number="02" title="Diagnose" name="Read the signals" image={modeAssets.diagnose} icon={<Search size={16} />} text="Review returned health factors, findings and history limits. No score is inferred." onClick={() => openSample('diagnose')} />
            <ModeCard number="03" title="Onboard" name="Find a first route" image={modeAssets.onboard} icon={<Layers3 size={16} />} text="Follow backend-returned contributor steps and public issues when they are available." onClick={() => openSample('onboard')} />
            <ModeCard number="04" title="Impact" name="Trace what connects" image={modeAssets.impact} icon={<ArrowUpRight size={16} />} text="Inspect structural dependents and PR changes as estimates, not runtime predictions." onClick={() => openSample('impact')} />
          </div>
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

        <section className="closing-note" aria-label="Evidence limitation">
          <span className="closing-mark">“</span><p>A structural estimate, not a prediction of every runtime failure.</p><a href="/workspace">Open the atlas <ArrowUpRight size={15} /></a>
        </section>
      </main>

      <footer className="site-footer"><Brand compact /><p>Understand the code behind the code.</p><nav aria-label="Footer navigation"><a href="/privacy">Privacy draft</a><a href="/terms">Terms draft</a></nav><span className="footer-boundary">Live analyzer connected · public repositories and ZIP archives</span></footer>
    </div>
  );
}

function ModeCard({ number, title, name, image, icon, text, onClick }: { number: string; title: string; name: string; image: string; icon: React.ReactNode; text: string; onClick: () => void }) {
  return (
    <article className="mode-card">
      <button type="button" className="mode-image-button" onClick={onClick} aria-label={`Open sample atlas in ${title} mode`}><img src={image} alt="" loading="lazy" /><span className="mode-open"><ArrowUpRight size={16} /></span></button>
      <div className="mode-card__meta"><span>{number} / {title.toUpperCase()}</span>{icon}</div>
      <h3>{name}</h3><p>{text}</p>
    </article>
  );
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <li><span className="flow-step-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div><Check aria-hidden="true" size={16} /></li>;
}
