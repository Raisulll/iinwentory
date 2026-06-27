/**
 * Internal CTA destinations for the landing page.
 *
 * The marketing site lived on a separate domain and linked to the app via an
 * absolute `appUrl`. Now that the landing page is part of the app, these are
 * plain in-app routes. `/login` renders the auth screen, which reads
 * `?register=1` + `?plan=` to open the sign-up flow on the chosen tier.
 */
import { useAuth } from '../../store/useAuthStore';

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
      if (!isLoggedIn) return registerUrl(plan);
      // Paid tiers deep-link into checkout; free/unknown just open the tab.
      return plan && plan !== 'free'
        ? `/settings?upgrade=${plan}&cycle=${cycle}`
        : BILLING_URL;
    },
  };
}
