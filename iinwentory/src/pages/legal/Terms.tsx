import LegalLayout from './LegalLayout';

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="June 28, 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of iinwentory (the
        "Service"), operated by iinwentory ("we", "us", or "our"). By creating an account or
        using the Service, you agree to be bound by these Terms. If you do not agree, do not use
        the Service.
      </p>

      <h2>1. Accounts</h2>
      <p>
        You must provide accurate information when creating an account and keep it up to date.
        You are responsible for safeguarding your password and for all activity that occurs under
        your account. Notify us immediately at{' '}
        <a href="mailto:support@iinwentory.com">support@iinwentory.com</a> if you suspect any
        unauthorized use.
      </p>

      <h2>2. Plans, Trials &amp; Billing</h2>
      <ul>
        <li>Paid plans are billed in advance on a monthly or yearly basis through our payment processor (Stripe).</li>
        <li>Free trials, where offered, convert to a paid subscription unless cancelled before the trial ends.</li>
        <li>Fees are non-refundable except where required by law. You can cancel at any time; access continues until the end of the current billing period.</li>
        <li>We may change plan pricing with reasonable notice before your next renewal.</li>
      </ul>

      <h2>3. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose or in violation of any applicable regulation;</li>
        <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems;</li>
        <li>Upload malicious code or interfere with the integrity or performance of the Service;</li>
        <li>Resell, sublicense, or misrepresent the Service as your own.</li>
      </ul>

      <h2>4. Your Data</h2>
      <p>
        You retain all rights to the inventory data and content you submit ("Your Data"). You
        grant us a limited license to host, process, and display Your Data solely to provide and
        improve the Service. Our handling of personal data is described in our{' '}
        <a href="/privacy">Privacy Policy</a>. You may export Your Data at any time.
      </p>

      <h2>5. Availability</h2>
      <p>
        We work to keep the Service available and reliable, but it is provided on an "as is" and
        "as available" basis without warranties of any kind. We may modify, suspend, or
        discontinue features with reasonable notice.
      </p>

      <h2>6. Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or
        terminate your access if you breach these Terms. Upon termination, your right to use the
        Service ends, and we may delete Your Data after a reasonable retention period.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, iinwentory shall not be liable for any indirect,
        incidental, or consequential damages, or for any loss of data or profits, arising from
        your use of the Service. Our total liability is limited to the amount you paid us in the
        twelve months preceding the claim.
      </p>

      <h2>8. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. If we make material changes, we will notify
        you by email or through the Service. Continued use after changes take effect constitutes
        acceptance of the revised Terms.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms? Email us at{' '}
        <a href="mailto:support@iinwentory.com">support@iinwentory.com</a>.
      </p>
    </LegalLayout>
  );
}
