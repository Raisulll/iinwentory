/**
 * Internal CTA destinations for the landing page.
 *
 * The marketing site lived on a separate domain and linked to the app via an
 * absolute `appUrl`. Now that the landing page is part of the app, these are
 * plain in-app routes. `/login` renders the auth screen, which reads
 * `?register=1` + `?plan=` to open the sign-up flow on the chosen tier.
 */
import { useAuth } from '../../store/useAuthStore';
import { getStoredOffer } from '../../lib/offer';

export const SIGN_IN_URL = '/login';
export const APP_URL = '/dashboard';

// Settings ▸ Billing & Plan. Settings reads `?billing` to open that tab; only
// the values `success`/`cancelled` trigger a banner, so `billing=1` is a safe
// "just open the tab" deep link.
export const BILLING_URL = '/settings?billing=1';

export function registerUrl(plan?: string): string {
  return plan ? `/login?register=1&plan=${plan}` : '/login?register=1';
}

/**
 * Auth-aware CTA destinations for the landing page. Logged-out visitors are
 * sent to sign-up; logged-in users are sent to Settings ▸ Billing & Plan
 * (paid-plan CTAs deep-link straight into Stripe checkout) instead of being
 * bounced through the onboarding flow.
 */
export function useCtaLinks() {
  const { isLoggedIn } = useAuth();

  return {
    isLoggedIn,
    // Generic "Start free trial / Get started" CTA.
    getStarted: isLoggedIn ? BILLING_URL : registerUrl(),
    // Where the footer / nav "Launch app" link should go.
    launchApp: isLoggedIn ? APP_URL : registerUrl(),
    /** Plan-specific pricing CTA. */
    planHref(plan?: string, cycle: 'monthly' | 'yearly' = 'yearly'): string {
      // A captured ?offer= rides along so the discount reaches checkout. For
      // logged-out visitors it's already in localStorage (read at onboarding
      // checkout); logged-in users get it in the URL for Settings to pick up.
      if (!isLoggedIn) return registerUrl(plan);
      if (!plan || plan === 'free') return BILLING_URL;
      const offer = getStoredOffer();
      const offerParam = offer ? `&offer=${encodeURIComponent(offer)}` : '';
      return `/settings?upgrade=${plan}&cycle=${cycle}${offerParam}`;
    },
  };
}
