import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`brand${compact ? ' brand--compact' : ''}`} aria-label="CodeDarpan home">
      <img src="/assets/brand-glyph-ink.svg" alt="" width="32" height="32" />
      <span>CodeDarpan</span>
    </Link>
  );
}
