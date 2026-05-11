import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

const LAST_UPDATED = "10 May 2025";
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
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Effective immediately
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">1. Who We Are</h2>
            <p className="text-muted-foreground">
              {PRODUCT} is a product of <strong className="text-gray-900 dark:text-white">{COMPANY}</strong>, accessible at <strong className="text-gray-900 dark:text-white">{WEBSITE}</strong>.
              We are committed to protecting your personal information and your right to privacy. This policy explains
              what information we collect, why we collect it, and how we use it when you use ARYA.
            </p>
            <p className="text-muted-foreground mt-2">
              This policy complies with the <strong className="text-gray-900 dark:text-white">Information Technology Act, 2000</strong> and
              the <strong className="text-gray-900 dark:text-white">Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> (India).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">2. Information We Collect</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Account Information</p>
                <p>When you create an account, we collect your name, email address, and/or phone number. Passwords are stored as one-way cryptographic hashes (bcrypt) — we never store your plain-text password.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Conversation Data</p>
                <p>Messages you send to ARYA, ARYA's responses, and metadata about your conversations (timestamps, conversation titles) are stored to provide continuity and personalisation.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Voice Data</p>
                <p>When you use voice input, the audio is sent to our speech-to-text providers (Sarvam AI or OpenAI) for transcription. We do not retain the raw audio beyond the duration needed to process your request. The resulting transcript may be stored as part of your conversation or voice notes.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Goals, Mood Check-ins &amp; Notes</p>
                <p>Goals you set, daily mood and energy ratings, voice notes, and any personal context you share are stored to power ARYA's personalised guidance.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Memory</p>
                <p>Facts and context that ARYA learns about you from conversations (e.g. your current work, preferences, recurring topics) are stored as memory entries to make future conversations more relevant. You can view and delete memories at any time.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Usage Data</p>
                <p>We collect aggregate usage statistics such as chat counts, voice minutes used, and feature access — for rate limiting, cost management, and service improvement. This data is not linked to identifiable content.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Payment Information</p>
                <p>If you subscribe to a paid plan, payments are processed entirely by <strong className="text-gray-800 dark:text-gray-200">Razorpay</strong>. We do not store your card numbers, UPI IDs, or bank account details. We only retain your subscription status, plan type, and Razorpay subscription identifier.</p>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Device &amp; Session Data</p>
                <p>We store session tokens (not cookies) in your browser's localStorage for authentication. We may collect your browser type and device type for debugging purposes.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-1">
              <li>To provide, operate, and personalise the ARYA service</li>
              <li>To generate AI responses using your conversation history and memory</li>
              <li>To track your goals, progress, and daily reflections</li>
              <li>To send optional morning briefings and weekly reviews (only if you opt in)</li>
              <li>To process subscription payments and manage your plan</li>
              <li>To enforce usage limits and prevent abuse</li>
              <li>To debug issues and improve the quality of our service</li>
              <li>To send service notifications (e.g. subscription renewals, account updates)</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We do <strong className="text-gray-900 dark:text-white">not</strong> sell your personal data to third parties.
              We do <strong className="text-gray-900 dark:text-white">not</strong> use your data to train our own AI models.
              Your data is used solely to serve you within ARYA.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">4. Third-Party Services</h2>
            <p className="text-muted-foreground mb-3">
              ARYA uses the following third-party services to operate. Each has its own privacy policy:
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
                    <td className="px-4 py-3">AI language model (chat responses, transcription)</td>
                    <td className="px-4 py-3">Your messages, conversation context, voice audio</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">Sarvam AI</td>
                    <td className="px-4 py-3">Indian language STT, TTS, translation</td>
                    <td className="px-4 py-3">Voice audio, text for translation</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">Razorpay</td>
                    <td className="px-4 py-3">Payment processing &amp; subscriptions</td>
                    <td className="px-4 py-3">Name, email, payment details (handled by Razorpay)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-300">Replit / Neon</td>
                    <td className="px-4 py-3">Hosting &amp; PostgreSQL database</td>
                    <td className="px-4 py-3">All stored data (encrypted at rest)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              OpenAI processes data under their API data usage policies — API data is not used to train their models by default.
              Sarvam AI processes audio under their enterprise data policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">5. Data Retention</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-1">
              <li>Conversation history: retained for the duration of your account</li>
              <li>Memory entries: retained per plan (7 days on Free, 30 days on Core, 365 days on Pro)</li>
              <li>Mood check-ins &amp; voice notes: retained until you delete them</li>
              <li>Voice audio: not retained — processed and discarded immediately</li>
              <li>Account data: retained until you request account deletion</li>
              <li>Payment records: retained for 7 years as required by Indian tax law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-1">
              <li><strong className="text-gray-800 dark:text-gray-300">Access</strong> — request a copy of all personal data we hold about you</li>
              <li><strong className="text-gray-800 dark:text-gray-300">Correct</strong> — update inaccurate information in your profile</li>
              <li><strong className="text-gray-800 dark:text-gray-300">Delete</strong> — request deletion of your account and all associated data</li>
              <li><strong className="text-gray-800 dark:text-gray-300">Export</strong> — request an export of your conversations, goals, and notes</li>
              <li><strong className="text-gray-800 dark:text-gray-300">Withdraw consent</strong> — opt out of optional features like morning briefing, memory, and notifications</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise any of these rights, email us at <a href={`mailto:${EMAIL}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{EMAIL}</a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">7. Security</h2>
            <p className="text-muted-foreground">
              We use industry-standard security measures including bcrypt password hashing, HTTPS/TLS in transit,
              encrypted database storage, and session token authentication (no persistent cookies).
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              ARYA is not intended for users under the age of 13. We do not knowingly collect personal information from
              children under 13. If you believe a child has provided us with personal information, please contact us and
              we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting
              a notice within ARYA or by email. Continued use of ARYA after such changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related queries, data requests, or complaints, contact our Data Protection Officer at:
            </p>
            <div className="mt-3 bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-muted-foreground text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{COMPANY}</p>
              <p>Email: <a href={`mailto:${EMAIL}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{EMAIL}</a></p>
              <p>Website: <a href={`https://${WEBSITE}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{WEBSITE}</a></p>
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
