import { useEffect } from 'react';

/**
 * Scroll-triggered reveal. Watches `.reveal` elements inside the landing
 * page; when they enter the viewport, adds `.reveal-in`. One observer for
 * the whole page — ported from the marketing site's useReveal composable.
 */
export function useReveal() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );

    const scan = () => {
      document
        .querySelectorAll<HTMLElement>('.reveal:not(.reveal-in)')
        .forEach((el) => observer.observe(el));
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, []);
}
