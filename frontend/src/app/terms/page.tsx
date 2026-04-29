import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Scaleswap",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-[720px] mx-auto px-7 py-20">
        <Link href="/" className="text-xs inline-flex items-center gap-1 mb-10 transition-colors hover:opacity-80" style={{ color: "var(--color-muted-2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to home
        </Link>

        <h1 className="text-3xl font-semibold mb-2 tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Terms of Service</h1>
        <p className="text-sm mb-12" style={{ color: "var(--color-muted-2)" }}>Last updated: April 25, 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>1. Acceptance of Terms</h2>
            <p>By accessing and using Scaleswap, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>2. Description of Service</h2>
            <p>Scaleswap provides video processing tools that generate unique variants of uploaded content. The service is currently in development and provided as-is, without guarantees of availability or performance.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>3. User Content</h2>
            <p>You retain all ownership rights to the content you upload. By using our service, you grant us a limited license to process your content solely for the purpose of providing the requested service. You are solely responsible for ensuring you have the rights to use and process any content you upload.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Use the service for any illegal purpose</li>
              <li>Upload content that infringes on third-party rights</li>
              <li>Attempt to reverse-engineer or compromise the platform</li>
              <li>Resell or redistribute access to the service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>5. Limitation of Liability</h2>
            <p>Scaleswap is provided &ldquo;as is&rdquo; without warranty of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>6. Modifications</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>7. Contact</h2>
            <p>For any questions about these Terms, reach out on <a href="https://discord.gg/t3ZjPbrFBY" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--color-text)" }}>Discord</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
