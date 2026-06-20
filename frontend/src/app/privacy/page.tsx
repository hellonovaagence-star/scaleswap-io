"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy — Scaleswap";
    const el = document.documentElement;
    const wasDark = el.classList.contains("dark");
    if (wasDark) el.classList.remove("dark");
    return () => { if (wasDark) el.classList.add("dark"); };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{
        background: "rgba(250,250,247,0.5)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
      }}>
        <div className="max-w-[720px] mx-auto px-5 sm:px-7 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-sm" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, letterSpacing: "-0.035em" }}>
            <Image src="/scaleswap-logo.svg" alt="Scaleswap" width={20} height={20} />
            Scaleswap
          </Link>
          <Link href="/" className="text-xs inline-flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: "var(--color-muted-2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to home
          </Link>
        </div>
      </nav>

      <div className="max-w-[720px] mx-auto px-5 sm:px-7 py-12 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Privacy Policy</h1>
        <p className="text-sm mb-12" style={{ color: "var(--color-muted-2)" }}>Last updated: June 10, 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>1. Who We Are</h2>
            <p>
              The Scaleswap website and service are operated by{" "}
              <strong style={{ color: "var(--color-ink-2)" }}>Klen Digital LLC</strong>, a limited liability company registered in the State of Wyoming, United States, under Employer Identification Number (EIN) 42-2742118, with its registered office located at 33 N Gould St, Sheridan, WY 82801, United States.
            </p>
            <p className="mt-2">References to &quot;Scaleswap&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot; in this policy refer to Klen Digital LLC.</p>
            <p className="mt-2">Contact: <a href="mailto:madebyklen.contact@gmail.com" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--color-ink-2)" }}>madebyklen.contact@gmail.com</a></p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>2. Information We Collect</h2>
            <p>When you use Scaleswap, we may collect the following categories of information:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li><strong style={{ color: "var(--color-ink-2)" }}>Account information</strong>: email address and username</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Uploaded content</strong>: videos and images you submit for processing</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Usage data</strong>: features used and processing history</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Technical data</strong>: browser type, device information, and IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>3. How We Use Your Information</h2>
            <p>We process your information for the following purposes:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Providing, operating, and maintaining the service</li>
              <li>Processing the video content you submit</li>
              <li>Improving and optimizing the platform</li>
              <li>Communicating with you about service updates</li>
              <li>Detecting, preventing, and addressing fraud, abuse, or security issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>4. Legal Bases for Processing</h2>
            <p>Where applicable data protection law (including the EU General Data Protection Regulation, &quot;GDPR&quot;) requires a legal basis, we rely on:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li><strong style={{ color: "var(--color-ink-2)" }}>Performance of a contract</strong>: processing necessary to provide the service to you</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Consent</strong>: for marketing communications (withdrawable at any time)</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Legitimate interests</strong>: improving the service and securing the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>5. Data Retention</h2>
            <p>We retain your personal information for as long as you use the service. Uploaded content is automatically deleted after processing unless otherwise indicated. If you delete your account, your personal data is erased within 30 days, except where retention is required to comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>6. Storage and Security</h2>
            <p>Your data is hosted on secure servers. We implement appropriate technical and organizational measures designed to protect your information against unauthorized access, alteration, disclosure, or destruction. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>7. Sharing of Information</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. Your data may be shared only with technical service providers (such as hosting and infrastructure providers) strictly necessary to operate the service, who are bound by confidentiality obligations, or where disclosure is required by law.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>8. International Data Transfers</h2>
            <p>Klen Digital LLC is based in the United States. If you access the service from outside the United States, your information may be transferred to, stored, and processed in the United States or other jurisdictions. Where required, we use appropriate safeguards for such transfers.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>9. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li><strong style={{ color: "var(--color-ink-2)" }}>Access</strong>: obtain a copy of your data</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Rectification</strong>: correct inaccurate data</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Erasure</strong>: request deletion of your data</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Portability</strong>: receive your data in a structured format</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Objection</strong>: object to certain processing of your data</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Restriction</strong>: restrict the processing of your data</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:madebyklen.contact@gmail.com" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--color-ink-2)" }}>madebyklen.contact@gmail.com</a>. If you are located in the European Economic Area, you also have the right to lodge a complaint with your local supervisory authority.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>10. Cookies</h2>
            <p>Scaleswap uses cookies strictly necessary for the operation of the service (authentication, preferences). We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>11. Children&apos;s Privacy</h2>
            <p>The service is not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can delete it.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. Your continued use of the service after changes are posted constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>13. Contact</h2>
            <p>For any questions about this Privacy Policy:</p>
            <p className="mt-2">
              <strong style={{ color: "var(--color-ink-2)" }}>Klen Digital LLC</strong><br />
              33 N Gould St, Sheridan, WY 82801, United States<br />
              Email: <a href="mailto:madebyklen.contact@gmail.com" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--color-ink-2)" }}>madebyklen.contact@gmail.com</a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 text-xs" style={{ borderTop: "1px solid var(--color-border-soft)", color: "var(--color-muted-2)" }}>
          <p>&copy; 2026 Scaleswap — Klen Digital LLC. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
