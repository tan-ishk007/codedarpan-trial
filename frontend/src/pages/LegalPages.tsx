import type { ReactNode } from 'react';

function LegalLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <header className="legal-page__header">
        <a className="legal-page__brand" href="/" aria-label="CodeDarpan home">
          CodeDarpan
        </a>
        <p className="legal-page__eyebrow">{eyebrow}</p>
        <h1 className="legal-page__title">{title}</h1>
        <p className="legal-page__intro">{intro}</p>
        <p className="legal-page__draft-notice" role="note">
          Review draft — not approved for launch. Qualified professional review is required before launch.
        </p>
      </header>
      <div className="legal-page__content">{children}</div>
      <nav className="legal-page__related" aria-label="Legal pages">
        <a href="/">Home</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="CodeDarpan · Privacy"
      title="Privacy notice"
      intro="This draft identifies what is and is not established about the CodeDarpan frontend. It is not a final description of service-side data practices."
    >
      <section className="legal-page__section" aria-labelledby="privacy-product">
        <h2 id="privacy-product">What this product currently includes</h2>
        <p>
          CodeDarpan is being built as a browser frontend for exploring repository structure. Its documented interface can accept a GitHub repository URL and optional ref, or a ZIP file, for a live submission. It also offers a separately and explicitly selected sample atlas; that sample is local illustrative data, not the result of analyzing a submitted repository.
        </p>
        <p>
          The analyzer backend is not included in this frontend. A compatible backend is required for live analysis. The frontend plan specifies same-origin requests to documented analysis API routes, but that does not establish how a deployed service will receive, process, or otherwise handle submitted information.
        </p>
      </section>

      <section className="legal-page__section" aria-labelledby="privacy-unknowns">
        <h2 id="privacy-unknowns">Important details remain unresolved</h2>
        <p>
          This review draft cannot say whether or how submissions are transmitted beyond the browser, processed, stored, retained, backed up, or deleted. Data location, retention periods, deletion procedures, service operators, subprocessors or other third-party processing, and any associated access or security practices have not been established. Hosting logs and other deployment-level handling are also unknown.
        </p>
        <p>
          The product operator and privacy contact have not been identified. The public domain, applicable jurisdiction, and any future analytics or other measurement practices are also unresolved. This draft makes no promise about collection, confidentiality, security, retention, deletion, or data location. Do not treat the sample atlas as evidence of how submitted repository data is handled.
        </p>
      </section>

      <section className="legal-page__section" aria-labelledby="privacy-before-use">
        <h2 id="privacy-before-use">Before using a live service</h2>
        <p>
          Until the operator publishes reviewed, deployment-specific disclosures, users should not assume that submitting a repository or archive is private or that any particular deletion or retention process applies. Whether a repository is public or private does not resolve the unknown handling of a submission by a future compatible backend.
        </p>
        <p>
          The operator must confirm actual data flows and service configuration, identify responsible contacts and third parties, and provide accurate retention, deletion, location, and analytics disclosures before launch. This page must then be reviewed and updated to match the deployed product.
        </p>
      </section>

      <section className="legal-page__section" aria-labelledby="privacy-review">
        <h2 id="privacy-review">Review status</h2>
        <p>
          This is an implementation-stage review draft, not legal advice or a final privacy notice. Qualified professional review is required before launch. See the <a href="/terms">Terms draft</a> for related product-use context, or return to <a href="/">CodeDarpan home</a>.
        </p>
      </section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout
      eyebrow="CodeDarpan · Terms"
      title="Terms of use"
      intro="These provisional terms describe the intended frontend experience while making clear that material service, operator, and legal details have not yet been settled."
    >
      <section className="legal-page__section" aria-labelledby="terms-draft">
        <h2 id="terms-draft">Draft status and scope</h2>
        <p>
          This page is a review draft for a frontend-only product. It is not a final contract and does not establish an operator, governing law, jurisdiction, dispute process, or legal guarantee. Those matters remain unresolved. Qualified professional review is required before launch.
        </p>
      </section>

      <section className="legal-page__section" aria-labelledby="terms-function">
        <h2 id="terms-function">What the interface is designed to do</h2>
        <p>
          The documented frontend provides an entry point for a GitHub repository URL with an optional ref, a ZIP upload/drop interaction, and an explicitly chosen sample atlas. In a live workspace, the interface is intended to present information returned by a compatible analyzer service. It should report unavailable, partial, or failed service states rather than inventing analysis or silently substituting sample results.
        </p>
        <p>
          The analyzer backend is not included. Live submissions and analysis features require a compatible backend implementing the documented API. The sample atlas is illustrative demo data, not an analysis of a user's repository and not evidence about how a live service will operate.
        </p>
      </section>

      <section className="legal-page__section" aria-labelledby="terms-limits">
        <h2 id="terms-limits">Limits of analysis</h2>
        <p>
          Repository maps and any future backend-provided findings are intended to help explore code structure. They may be incomplete, unavailable, or dependent on the submitted material and service capabilities. A structural impact estimate, if provided, is not a prediction of every runtime failure. The interface does not warrant that any sample or future analysis is complete, current, or suitable as the sole basis for a technical or business decision.
        </p>
        <p>
          The frontend's client-side file checks, where present, do not establish that an archive is safe, accepted, or within server limits. Such acceptance depends on a compatible backend and its actual implementation.
        </p>
      </section>

      <section className="legal-page__section" aria-labelledby="terms-submissions">
        <h2 id="terms-submissions">Submissions and service handling</h2>
        <p>
          These draft terms do not state or promise how repository URLs, refs, uploaded archives, analysis results, or related technical information are processed, stored, retained, deleted, or located. Third-party processing, hosting practices, the identity and contact details of the operator, and future analytics remain unknown or unresolved. Consult a final, reviewed privacy notice before relying on a live service; the current <a href="/privacy">Privacy draft</a> explains these open questions but is not a final notice.
        </p>
      </section>

      <section className="legal-page__section" aria-labelledby="terms-finalization">
        <h2 id="terms-finalization">What must be completed before launch</h2>
        <p>
          The product owner must establish the operator identity and contact channel, deployment and backend behavior, applicable jurisdiction, and any domain-specific details, then replace this provisional text with terms that match the actual service. No company identity, address, domain, governing law, liability allocation, or other legal guarantee is supplied by this draft.
        </p>
        <p>
          This text is not legal advice. Qualified professional review is required before launch. Return to <a href="/">CodeDarpan home</a> or read the <a href="/privacy">Privacy draft</a>.
        </p>
      </section>
    </LegalLayout>
  );
}

export function NotFoundPage() {
  return (
    <main className="not-found-page">
      <p className="not-found-page__eyebrow">CodeDarpan</p>
      <h1 className="not-found-page__title">Page not found</h1>
      <p className="not-found-page__message">
        This address does not match a page in CodeDarpan.
      </p>
      <a className="not-found-page__home-link" href="/">
        Return to CodeDarpan home
      </a>
    </main>
  );
}
