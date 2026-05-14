import { useLocation } from "wouter";
import { ArrowLeft, Shield, Trash2, Lock, Globe, Eye, Download, UserCheck } from "lucide-react";

const LAST_UPDATED = "14 May 2026";
const COMPANY = "VARAH Group";
const PRODUCT = "ARYA";
const EMAIL = "privacy@aryaai.in";
const WEBSITE = "aryaai.in";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to ARYA
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold">Privacy &amp; Your Data</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Effective immediately
        </p>

        {/* ── YOUR DATA PROMISE ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-6 mb-10">
          <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-300 mb-1">Our promise to you — in plain language</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-5">
            ARYA remembers things about you so it can help you better. That memory is powerful — and it comes with real responsibility. Here is exactly what we do and don't do with your data.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900">
              <div className="text-2xl mb-2">🇮🇳</div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Stored in India</p>
              <p className="text-xs text-muted-foreground">Your conversations, goals, memory, and notes are stored on servers located in India. Your data does not leave Indian jurisdiction.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">You own it</p>
              <p className="text-xs text-muted-foreground">We never sell your personal data. We never use your conversations to train AI models. Your data exists only to serve you.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900">
              <div className="text-2xl mb-2">🗑️</div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Delete anytime</p>
              <p className="text-xs text-muted-foreground">Delete individual memories in the Memory panel, or request complete account erasure. No lock-in, no friction, no questions asked.</p>
            </div>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-4 text-center">
            Compliant with India's <strong>Digital Personal Data Protection Act 2023 (DPDP Act)</strong> and the IT Act 2000.
          </p>
        </div>

        {/* ── YOUR RIGHTS — VISUAL ──────────────────────────────────────── */}
        <div className="mb-10">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Your rights under DPDP Act 2023</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Eye, label: "Right to Access", desc: "See all personal data we hold about you — conversations, memory, goals, mood check-ins." },
              { icon: UserCheck, label: "Right to Correct", desc: "Update or fix any inaccurate information in your profile at any time." },
              { icon: Trash2, label: "Right to Erasure", desc: "Delete your memory, individual data points, or your entire account — no waiting period." },
              { icon: Download, label: "Right to Portability", desc: "Request an export of your conversations, goals, and notes in a readable format." },
              { icon: Lock, label: "Right to Withdraw Consent", desc: "Turn off memory, morning briefing, notifications, or any optional feature — instantly." },
              { icon: Globe, label: "Right to Grievance Redressal", desc: "Raise a complaint with our Data Protection Officer within 30 days of any concern." },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-3 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            To exercise any right, email <a href={`mailto:${EMAIL}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{EMAIL}</a>. We respond within 30 days as required by law. For memory deletion, you can act instantly inside the app.
          </p>
        </div>

        {/* ── LEGAL DETAIL ──────────────────────────────────────────────── */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">1. Who We Are</h2>
            <p className="text-muted-foreground">
              {PRODUCT} is a product of <strong className="text-gray-900 dark:text-white">{COMPANY}</strong>, accessible at <strong className="text-gray-900 dark:text-white">{WEBSITE}</strong>.
              We are a data fiduciary under the <strong className="text-gray-900 dark:text-white">Digital Personal Data Protection Act 2023 (DPDP Act)</strong> and
              are committed to handling your personal data with care, transparency, and respect.
              This policy also complies with the <strong className="text-gray-900 dark:text-white">Information Technology Act 2000</strong> and associated rules.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">2. What We Collect &amp; Why</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Account Information</p>
                <p>Name, email, and/or phone number when you create an account. Your password is stored as a one-way cryptographic hash (bcrypt) — we never see it in plain text. Purpose: account creation and authentication.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Conversation Data</p>
                <p>Messages you send, ARYA's responses, and conversation metadata. Purpose: to deliver the service and maintain continuity across sessions.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Memory</p>
                <p>Facts, preferences, and context ARYA learns from your conversations (e.g. your work, goals, recurring themes). Stored as discrete memory entries — visible and deletable by you at any time. Purpose: to make future conversations more useful to you.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Voice Data</p>
                <p>When you use voice input, audio is sent to Sarvam AI (Indian language STT) or OpenAI for transcription. Raw audio is discarded immediately after transcription — it is never stored. The resulting text transcript may be saved as part of your conversation or voice notes.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Goals, Mood Check-ins &amp; Notes</p>
                <p>Goals you set, daily mood and energy ratings, and voice notes. Purpose: to power personalised guidance and track your growth over time. Stored until you delete them.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Usage Data</p>
                <p>Aggregate usage statistics (chat counts, voice minutes, feature access). Purpose: rate limiting, cost management, and service improvement. Not linked to the content of your conversations.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Payment Information</p>
                <p>Payments are processed entirely by <strong className="text-gray-800 dark:text-gray-200">Razorpay</strong>. We do not store card numbers, UPI IDs, or bank details. We retain only your subscription status, plan type, and Razorpay subscription ID.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">3. What We Never Do</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-1">
              <li>We do <strong className="text-gray-900 dark:text-white">not</strong> sell your personal data to any third party</li>
              <li>We do <strong className="text-gray-900 dark:text-white">not</strong> use your conversations or memory to train AI models</li>
              <li>We do <strong className="text-gray-900 dark:text-white">not</strong> share your data with advertisers</li>
              <li>We do <strong className="text-gray-900 dark:text-white">not</strong> transfer your data outside India for storage</li>
              <li>We do <strong className="text-gray-900 dark:text-white">not</strong> retain voice audio beyond the instant of transcription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground mb-3">
              ARYA uses the following third-party processors. Your data is shared with them only to the extent needed to provide the service:
            </p>
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-200">Data shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-muted-foreground">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">OpenAI</td>
                    <td className="px-4 py-3">AI language model responses &amp; transcription</td>
                    <td className="px-4 py-3">Your messages, conversation context, voice audio (transcription only)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">Sarvam AI</td>
                    <td className="px-4 py-3">Indian language STT, TTS, translation</td>
                    <td className="px-4 py-3">Voice audio, text for translation</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">Razorpay</td>
                    <td className="px-4 py-3">Payment processing &amp; subscriptions</td>
                    <td className="px-4 py-3">Name, email, payment details (handled end-to-end by Razorpay)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">Replit / Neon</td>
                    <td className="px-4 py-3">Hosting &amp; PostgreSQL database</td>
                    <td className="px-4 py-3">All stored data (encrypted at rest and in transit)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              OpenAI API data is not used to train their models by default (per their API data usage policy).
              Sarvam AI processes audio under their enterprise data agreement.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">5. How Long We Keep Your Data</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-1">
              <li>Conversation history: retained for the duration of your account</li>
              <li>Memory entries: retained per plan (7 days Free · 30 days Core · 365 days Pro) or until you delete them</li>
              <li>Mood check-ins &amp; voice notes: retained until you delete them</li>
              <li>Voice audio: not retained — discarded immediately after transcription</li>
              <li>Account data: retained until you request deletion</li>
              <li>Payment records: retained for 7 years as required by Indian tax law (GST compliance)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">6. Consent &amp; Purpose Limitation</h2>
            <p className="text-muted-foreground">
              Under the DPDP Act 2023, we collect personal data only for the specific purposes described above.
              Optional features — morning briefing, memory, mood check-ins, news digest, notifications — require your explicit opt-in
              and can be withdrawn at any time from your settings without affecting core service access.
              We will notify you before using your data for any new purpose.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">7. Security</h2>
            <p className="text-muted-foreground">
              We use industry-standard security: bcrypt password hashing, HTTPS/TLS for all data in transit,
              encrypted database storage, and session token authentication (no persistent third-party cookies).
              Passwords are never stored in plain text. We conduct periodic security reviews.
              No method of transmission over the internet is 100% secure — we cannot guarantee absolute security, but we take every reasonable precaution.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              ARYA is intended for users aged 18 and above. We do not knowingly collect personal data from minors.
              If you believe a child has created an account, contact us immediately and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy when required by law or when our practices change.
              We will notify you of material changes inside the app and by email at least 7 days before they take effect.
              Continued use after that date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">10. Data Protection Officer &amp; Grievance Contact</h2>
            <p className="text-muted-foreground mb-3">
              As required under the DPDP Act 2023, you may raise any grievance or data request with our Data Protection Officer:
            </p>
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-muted-foreground text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{COMPANY} — Data Protection Officer</p>
              <p className="mt-1">Email: <a href={`mailto:${EMAIL}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{EMAIL}</a></p>
              <p>Website: <a href={`https://${WEBSITE}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{WEBSITE}</a></p>
              <p className="mt-2 text-xs">We will acknowledge your request within 72 hours and resolve it within 30 days.</p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY}. All rights reserved. &nbsp;·&nbsp;
            <button onClick={() => setLocation("/terms")} className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms &amp; Conditions</button>
          </p>
        </div>
      </div>
    </div>
  );
}
