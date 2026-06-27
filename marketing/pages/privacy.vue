<script setup lang="ts">
useHead({
  title: "Privacy Policy — iinwentory",
  meta: [
    { name: "description", content: "How iinwentory collects, uses, stores, and protects your information." },
    { name: "robots", content: "index,follow" },
  ],
});

const lastUpdated = "April 27, 2026";
</script>

<template>
  <div class="bg-white pt-24 pb-20">
    <article class="mx-auto max-w-3xl px-6 lg:px-8">
      <header class="mb-10 border-b border-gray-200 pb-8">
        <p class="text-sm font-semibold uppercase tracking-wider text-primary-600">Legal</p>
        <h1 class="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Privacy Policy</h1>
        <p class="mt-3 text-sm text-gray-500">Last updated: {{ lastUpdated }}</p>
        <p class="mt-6 text-base leading-7 text-gray-700">
          This Privacy Policy describes how iinwentory ("we", "us", "the app") collects, uses, and protects your information when you use our mobile application and web dashboard.
        </p>
      </header>

      <section class="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-p:text-gray-700 prose-p:leading-7 prose-li:text-gray-700 prose-a:text-primary-600 hover:prose-a:text-primary-700">

        <h2>1. Information We Collect</h2>

        <h3>Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Password (stored as a one-way hash by our authentication provider)</li>
          <li>Full name</li>
          <li>Optional business name and business address</li>
          <li>Optional profile photo</li>
        </ul>

        <h3>Inventory Data</h3>
        <p>You provide content to the app, including:</p>
        <ul>
          <li>Item names, SKUs, barcodes, quantities, prices, locations, and photos</li>
          <li>Folder and tag organization</li>
          <li>Pick lists and pick list comments</li>
          <li>Stock counts and purchase orders</li>
          <li>Team and team member information</li>
        </ul>

        <h3>Camera and Photos</h3>
        <ul>
          <li>The camera is used to scan barcodes and QR codes, and to take photos of inventory items.</li>
          <li>The photo library is accessed only when you choose to select an existing photo as an item image.</li>
          <li>We do not access, scan, or upload any photos other than those you explicitly choose to attach to an item or your profile.</li>
        </ul>

        <h3>Biometric Authentication</h3>
        <ul>
          <li>Face ID, Touch ID, and fingerprint data are used only on your device to unlock the app.</li>
          <li>Biometric data never leaves your device and is never transmitted to our servers. The operating system handles all biometric verification.</li>
        </ul>

        <h3>Activity and Audit Logs</h3>
        <p>We log actions you take in the app (creating, editing, deleting items, pick list operations, etc.) for audit and team-collaboration purposes. These logs are tied to your user account and visible to members of your team.</p>

        <h3>Technical Information</h3>
        <ul>
          <li>Authentication session tokens (stored securely on your device)</li>
          <li>Crash and diagnostic information may be collected by Apple App Store / Google Play Store via standard platform tooling</li>
        </ul>

        <h3>What we do NOT collect</h3>
        <ul>
          <li>Advertising identifiers</li>
          <li>Location data</li>
          <li>Contacts</li>
          <li>Microphone audio (the RECORD_AUDIO permission appears as a dependency of the camera library but is not used by the app)</li>
          <li>Browsing history outside the app</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide core inventory management features</li>
          <li>Authenticate you and keep your account secure</li>
          <li>Allow team members to collaborate on shared inventory</li>
          <li>Provide an audit trail of changes</li>
          <li>Respond to support requests</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We do <strong>NOT</strong> sell your data, share it with advertisers, or use it for advertising purposes.</p>

        <h2>3. How Your Data Is Stored</h2>
        <ul>
          <li>Your data is stored in Supabase (PostgreSQL database and object storage), hosted in the EU West (Ireland) region.</li>
          <li>All data in transit is encrypted via HTTPS/TLS.</li>
          <li>All data at rest is encrypted by our infrastructure providers.</li>
          <li>Item photos are stored in a private storage bucket accessible only to authenticated members of your team.</li>
          <li>Row-level security policies enforce that you can only see and modify data belonging to you or your team.</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>We share your data only as follows:</p>
        <ul>
          <li><strong>With members of your team:</strong> Other users in the same team can view and modify shared inventory data, pick lists, and team-level activity logs.</li>
          <li><strong>With our service providers:</strong> Supabase (authentication, database, storage). These providers process data on our behalf and are bound by their own privacy and security commitments.</li>
          <li><strong>When required by law:</strong> If we receive a valid legal request (subpoena, court order), we may be required to disclose data.</li>
        </ul>
        <p>We do not sell, rent, or trade your personal information to third parties.</p>

        <h2>5. Your Rights</h2>
        <p>Depending on your jurisdiction (GDPR, CCPA, etc.), you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your account and associated data</li>
          <li>Export your data in a portable format</li>
          <li>Object to or restrict certain processing</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p>To exercise any of these rights, contact us at the email below. We will respond within 30 days.</p>

        <h2>6. Data Retention</h2>
        <ul>
          <li>We retain your account and inventory data for as long as your account is active.</li>
          <li>If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required for legal, accounting, or security purposes.</li>
          <li>Activity log entries may be retained for up to 12 months for audit purposes after account deletion.</li>
        </ul>

        <h2>7. Children's Privacy</h2>
        <p>iinwentory is not directed to children under 13 (or under 16 in the EU). We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>

        <h2>8. Permissions Summary (Android &amp; iOS)</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="py-2 pr-4 text-left font-semibold">Permission</th>
                <th class="py-2 text-left font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-gray-100"><td class="py-2 pr-4 font-medium">Camera</td><td class="py-2">Scan barcodes / QR codes, take item photos</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 pr-4 font-medium">Photo library</td><td class="py-2">Let you choose existing photos for items</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 pr-4 font-medium">Biometric / Face ID / Fingerprint</td><td class="py-2">Local app lock (data never leaves device)</td></tr>
              <tr class="border-b border-gray-100"><td class="py-2 pr-4 font-medium">Internet</td><td class="py-2">Sync inventory data with our servers</td></tr>
              <tr><td class="py-2 pr-4 font-medium">Record audio</td><td class="py-2">Declared as a dependency of the camera library; not used by the app</td></tr>
            </tbody>
          </table>
        </div>
        <p>You can revoke any permission at any time in your device's system settings.</p>

        <h2>9. Security</h2>
        <p>We follow industry-standard practices to protect your information, including:</p>
        <ul>
          <li>Encryption in transit (HTTPS/TLS) and at rest</li>
          <li>Strong password hashing</li>
          <li>Row-level security on the database</li>
          <li>Regular security review of dependencies</li>
        </ul>
        <p>No system is perfectly secure. If you discover a vulnerability, please report it to the contact email below.</p>

        <h2>10. International Data Transfers</h2>
        <p>If you access the app from outside the European Union, your data will be transferred to and processed in the EU (where our infrastructure is hosted). By using the app, you consent to this transfer. Where required, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission as the legal basis for such transfers.</p>

        <h2>11. Third-Party Services</h2>
        <p>The app uses the following third-party services. Each has its own privacy policy:</p>
        <ul>
          <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase</a> — authentication, database, and file storage</li>
          <li><a href="https://expo.dev/privacy" target="_blank" rel="noopener noreferrer">Expo / EAS</a> — over-the-air updates and build infrastructure</li>
          <li>Apple App Store / Google Play Store — app distribution and standard platform diagnostics</li>
        </ul>

        <h2>12. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page will reflect the most recent revision. For significant changes, we will notify you in the app or via email. Continued use of the app after changes take effect constitutes acceptance of the revised policy.</p>

        <h2>13. Contact</h2>
        <p>If you have any questions about this Privacy Policy or your data, please contact:</p>
        <p><strong>Email:</strong> <a href="mailto:hello@iinwentory.com">hello@iinwentory.com</a></p>

        <h2>14. Cookies &amp; Similar Technologies</h2>
        <p>The web dashboard uses a small number of strictly necessary technologies to keep you signed in and to remember your preferences:</p>
        <ul>
          <li><strong>Session storage / cookies:</strong> Hold your authentication token so you stay signed in between page loads.</li>
          <li><strong>Local storage:</strong> Caches non-sensitive UI preferences (theme, sidebar state, last-opened folder) on your device.</li>
        </ul>
        <p>We do <strong>not</strong> use advertising cookies, third-party analytics that fingerprint users, cross-site trackers, or social-media pixels. You can clear these at any time from your browser settings; doing so will sign you out.</p>

        <h2>15. Marketing Communications</h2>
        <p>We send transactional emails (account verification, password resets, billing receipts, security alerts) by default — these are necessary for the service and cannot be opted out of while your account is active.</p>
        <p>We will only send product-update or marketing emails if you explicitly opt in. You can unsubscribe at any time using the link in any such email, or by contacting us at the email above. Unsubscribing from marketing emails does not affect transactional emails.</p>

        <h2>16. Automated Decision-Making</h2>
        <p>We do not use your data for automated decision-making or profiling that produces legal or similarly significant effects on you. Low-stock alerts, reorder suggestions, and similar features operate on rules you configure yourself and never share inferences about you with third parties.</p>

        <h2>17. Data Breach Notification</h2>
        <p>In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the relevant supervisory authority within 72 hours of becoming aware of the breach where required by law. Where the breach poses a high risk to you specifically, we will also notify you directly without undue delay, describing the nature of the breach, the data affected, the likely consequences, and the steps we are taking to address it.</p>

        <h2>18. Account Security &amp; Your Responsibilities</h2>
        <p>You are responsible for:</p>
        <ul>
          <li>Keeping your password confidential and using a strong, unique password</li>
          <li>Enabling biometric or device-level lock on shared devices</li>
          <li>Promptly removing team members who no longer need access</li>
          <li>Notifying us immediately at the contact email above if you suspect unauthorized access to your account</li>
        </ul>
        <p>We are not liable for losses arising from credentials shared by you or compromised on your device.</p>

        <h2>19. Legal Bases for Processing (GDPR)</h2>
        <p>If you are in the European Economic Area, United Kingdom, or Switzerland, we rely on the following legal bases under the GDPR:</p>
        <ul>
          <li><strong>Performance of a contract:</strong> To provide the inventory features you signed up for.</li>
          <li><strong>Legitimate interests:</strong> To secure the service, prevent fraud and abuse, and improve product quality. We balance these against your rights and freedoms.</li>
          <li><strong>Consent:</strong> For optional features such as marketing emails. You may withdraw consent at any time.</li>
          <li><strong>Legal obligation:</strong> Where we are required to retain or disclose data by applicable law.</li>
        </ul>

        <h2>20. Supervisory Authority &amp; Complaints</h2>
        <p>If you believe we have processed your personal data unlawfully, you have the right to lodge a complaint with your local data protection supervisory authority. We would, however, appreciate the chance to address your concerns before you contact a regulator — please email us first and we will work with you to resolve the issue.</p>

        <h2>21. California Residents (CCPA / CPRA)</h2>
        <p>If you are a California resident, you have the right to:</p>
        <ul>
          <li>Know what categories of personal information we collect, the sources, and the purposes</li>
          <li>Request access to and deletion of your personal information</li>
          <li>Correct inaccurate personal information</li>
          <li>Limit the use of sensitive personal information</li>
          <li>Not be discriminated against for exercising any of these rights</li>
        </ul>
        <p>We do not "sell" or "share" personal information for cross-context behavioral advertising as those terms are defined under California law.</p>

        <h2>22. Do Not Track</h2>
        <p>Our service does not respond to "Do Not Track" browser signals because there is no industry-wide standard for how to interpret them. Regardless, we do not track users across third-party websites.</p>

        <h2>23. Severability</h2>
        <p>If any provision of this Privacy Policy is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.</p>

        <h2>24. Governing Law</h2>
        <p>This Privacy Policy is governed by the laws of the jurisdiction in which iinwentory is established, without regard to conflict-of-laws principles. Mandatory consumer-protection rights you may have under your local law are not affected.</p>

        <hr class="my-12 border-gray-200" />

        <p class="text-sm text-gray-500">
          iinwentory is an inventory management app for warehouses and businesses, providing barcode scanning, pick lists, and team collaboration features.
        </p>
      </section>
    </article>
  </div>
</template>
