"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service — Scaleswap";
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
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2 tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Terms of Service</h1>
        <p className="text-sm mb-12" style={{ color: "var(--color-muted-2)" }}>Last updated: June 10, 2026</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>1. Company Information</h2>
            <p>The Scaleswap website and service are operated by:</p>
            <ul className="list-none mt-3 flex flex-col gap-1.5">
              <li><strong style={{ color: "var(--color-ink-2)" }}>Company name:</strong> Klen Digital LLC</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Legal form:</strong> Limited Liability Company (LLC), registered in the State of Wyoming, United States</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>EIN:</strong> 42-2742118</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Registered office:</strong> 33 N Gould St, Sheridan, WY 82801, United States</li>
              <li><strong style={{ color: "var(--color-ink-2)" }}>Email:</strong> <a href="mailto:madebyklen.contact@gmail.com" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--color-ink-2)" }}>madebyklen.contact@gmail.com</a></li>
            </ul>
            <p className="mt-3">References to &quot;Scaleswap&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot; in these Terms refer to Klen Digital LLC.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>2. Acceptance of These Terms</h2>
            <p>These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Scaleswap platform. By accessing the website or using the service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>3. Description of the Service</h2>
            <p>Scaleswap is a video processing tool that generates technically unique variants of uploaded content. The service is currently in early access and is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without any guarantee of availability or performance.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>4. Accounts and Registration</h2>
            <p>Access to certain features requires creating an account. You agree to:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Provide accurate and up-to-date information</li>
              <li>Keep your login credentials confidential</li>
              <li>Not create an account on behalf of a third party without authorization</li>
              <li>Notify us of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>5. Ownership of Content</h2>
            <p>You retain full ownership of the content you upload. By using the service, you grant us a limited, non-exclusive, temporary license to process your content solely for the purpose of providing the service. You are solely responsible for ensuring that you hold all rights necessary in the content you submit.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Use the service for any unlawful purpose or in violation of any applicable law</li>
              <li>Upload content that infringes the rights of third parties (copyright, publicity rights, etc.)</li>
              <li>Attempt to reverse engineer, decompile, or compromise the platform</li>
              <li>Resell or redistribute access to the service without authorization</li>
              <li>Use the service to distribute unlawful, hateful, or discriminatory content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>7. Intellectual Property</h2>
            <p>All elements of the Scaleswap website and service (text, graphics, software, images, logos, trademarks) are the exclusive property of Klen Digital LLC and are protected by intellectual property laws. Any unauthorized reproduction, representation, or exploitation is prohibited.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>8. Pricing</h2>
            <p>The service is currently offered free of charge as part of its early access phase. Klen Digital LLC reserves the right to introduce paid plans in the future. Any pricing changes will be communicated with reasonable advance notice.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>9. Disclaimer of Warranties</h2>
            <p>The service is provided &quot;as is&quot; without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted, error-free, or secure.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by applicable law, Klen Digital LLC shall not be liable for:</p>
            <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
              <li>Indirect, incidental, special, or consequential damages arising from the use of the service</li>
              <li>Temporary interruptions of the service for maintenance or updates</li>
              <li>Your use of any content generated by the service</li>
              <li>Loss of data due to circumstances beyond our reasonable control</li>
            </ul>
            <p className="mt-3">In no event shall the aggregate liability of Klen Digital LLC exceed the amounts paid by you to us in the twelve (12) months preceding the event giving rise to the claim, or one hundred US dollars (USD $100), whichever is greater.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>11. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Klen Digital LLC, its officers, members, and agents from any claims, damages, or expenses (including reasonable attorneys&apos; fees) arising from your use of the service, your content, or your violation of these Terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>12. Termination</h2>
            <p>You may delete your account at any time from your profile settings. Klen Digital LLC reserves the right to suspend or terminate an account in the event of a violation of these Terms, without prior notice or compensation.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>13. Changes to These Terms</h2>
            <p>We reserve the right to modify these Terms at any time. Changes take effect upon posting on this page. Your continued use of the service after changes are posted constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>14. Governing Law and Jurisdiction</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the <strong style={{ color: "var(--color-ink-2)" }}>State of Wyoming, United States</strong>, without regard to its conflict of law principles. Any dispute arising out of or relating to these Terms or the service that cannot be resolved amicably shall be subject to the exclusive jurisdiction of the state and federal courts located in Wyoming, United States.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-ink)" }}>15. Contact</h2>
            <p>For any questions about these Terms:</p>
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
