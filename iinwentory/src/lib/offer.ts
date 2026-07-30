/**
 * Promotional-offer propagation across the signup funnel.
 *
 * A marketing/pricing link carries `?offer=<slug>` (e.g. /pricing?offer=welcome30).
 * A new visitor then bounces through register → onboarding → Stripe checkout, so
 * the slug can't live in the URL the whole way. We stash it in localStorage the
 * moment we see it and read it back at checkout. The server is the real gate
 * (new-users-only, expiry, plan) — a stale stored slug is simply ignored there,
 * so persisting it indefinitely is harmless.
 */
const KEY = 'iinw_offer';

// Normalize so the slug matches both the ?offer= param and a typed promo code.
function normalize(slug: string): string {
  return slug.trim().toLowerCase();
}

/**
 * If the current URL has `?offer=`, store it and return it. Otherwise return
 * whatever was previously stored. Call on any landing/pricing page mount.
 */
export function captureOfferFromUrl(): string | null {
  try {
    const param = new URLSearchParams(window.location.search).get('offer');
    if (param && param.trim()) {
      const slug = normalize(param);
      localStorage.setItem(KEY, slug);
      return slug;
    }
  } catch { /* ignore */ }
  return getStoredOffer();
}

export function getStoredOffer(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function clearStoredOffer(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
