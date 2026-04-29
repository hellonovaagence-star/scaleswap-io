import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Scaleswap",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-[720px] mx-auto px-7 py-20">
        <Link href="/" className="text-xs inline-flex items-center gap-1 mb-10 transition-colors hover:opacity-80" style={{ color: "var(--color-muted-2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to home
        </Link>

        <h1 className="text-3xl font-semibold mb-2 tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Privacy Policy</h1>
        <p className="text-sm mb-12" style={{ color: "var(--color-muted-2)" }}>Last updated: April 25, 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>1. Information We Collect</h2>
            <p>When you use Scaleswap, we may collect the following information:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Account information (email address, username)</li>
              <li>Content you upload to our platform (videos, images)</li>
              <li>Usage data (features used, processing history)</li>
              <li>Technical data (browser type, device information, IP address)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Provide and maintain our services</li>
              <li>Process your video content as requested</li>
              <li>Improve and optimize our platform</li>
              <li>Communicate with you about updates and changes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>3. Data Storage & Security</h2>
            <p>Your uploaded content is processed and stored securely. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, or destruction.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>4. Data Sharing</h2>
            <p>We do not sell, trade, or transfer your personal information to third parties. We may share data only with service providers who assist us in operating our platform, subject to confidentiality agreements.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us via our Discord community or email.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>6. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>7. Contact</h2>
            <p>If you have any questions about this Privacy Policy, you can reach us on <a href="https://discord.gg/t3ZjPbrFBY" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--color-text)" }}>Discord</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
