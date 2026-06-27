import LegalLayout from './LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 28, 2026">
      <p>
        This Privacy Policy explains how iinwentory ("we", "us", or "our") collects, uses, and
        protects your information when you use our inventory management service (the "Service").
        By using the Service, you agree to the practices described here.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account information</strong> — your name, email address, and password (stored hashed).</li>
        <li><strong>Organization &amp; inventory data</strong> — the items, folders, photos, quantities, and related content you add.</li>
        <li><strong>Billing information</strong> — handled by our payment processor (Stripe); we do not store full card numbers.</li>
        <li><strong>Usage &amp; device data</strong> — log data such as IP address, browser type, and actions taken, used to operate and secure the Service.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide, maintain, and improve the Service;</li>
        <li>To authenticate you and secure your account;</li>
        <li>To process payments and manage subscriptions;</li>
        <li>To send transactional emails (e.g. password resets, low-stock alerts, billing notices);</li>
        <li>To respond to support requests and communicate important updates.</li>
      </ul>

      <h2>3. How We Share Information</h2>
      <p>
        We do not sell your personal data. We share information only with service providers who
        help us operate the Service (such as cloud hosting, our database provider, our email
        provider, and Stripe for payments), and only to the extent needed to provide the Service.
        We may disclose information if required by law.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. If you delete your account, we
        delete or anonymize your personal data within a reasonable period, except where we are
        required to retain it for legal or accounting purposes.
      </p>

      <h2>5. Security</h2>
      <p>
        We use industry-standard measures to protect your data, including encryption in transit,
        hashed passwords, and role-scoped access controls. No method of transmission or storage is
        100% secure, but we work continuously to safeguard your information.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        Depending on your location, you may have the right to access, correct, export, or delete
        your personal data. You can manage most data directly in the app, or contact us to make a
        request. We will respond within the timeframe required by applicable law.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use essential cookies and local storage to keep you signed in and remember your
        preferences. We do not use them for third-party advertising.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. If we make material changes, we will
        notify you by email or through the Service. The "Last updated" date above reflects the
        latest revision.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about your privacy or this policy? Email us at{' '}
        <a href="mailto:support@iinwentory.com">support@iinwentory.com</a>.
      </p>
    </LegalLayout>
  );
}
