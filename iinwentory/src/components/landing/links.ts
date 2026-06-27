/**
 * Internal CTA destinations for the landing page.
 *
 * The marketing site lived on a separate domain and linked to the app via an
 * absolute `appUrl`. Now that the landing page is part of the app, these are
 * plain in-app routes. `/login` renders the auth screen, which reads
 * `?register=1` + `?plan=` to open the sign-up flow on the chosen tier.
 */
export const SIGN_IN_URL = '/login';
export const APP_URL = '/dashboard';

export function registerUrl(plan?: string): string {
  return plan ? `/login?register=1&plan=${plan}` : '/login?register=1';
}
