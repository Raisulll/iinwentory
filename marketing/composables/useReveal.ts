// Lightweight scroll-triggered reveal.
// Watches all `.reveal` elements; when they enter the viewport, adds `.reveal-in`.
// One observer per page, no per-component setup needed.

let observer: IntersectionObserver | null = null;

export function useReveal() {
  onMounted(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      const targets = document.querySelectorAll<HTMLElement>(".reveal:not(.reveal-in)");
      if (!targets.length) return;

      if (!observer) {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add("reveal-in");
                observer?.unobserve(entry.target);
              }
            }
          },
          { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
        );
      }
      targets.forEach((el) => observer!.observe(el));
    };

    apply();
    // Re-scan after route changes / dynamic content
    const mo = new MutationObserver(apply);
    mo.observe(document.body, { childList: true, subtree: true });

    onUnmounted(() => {
      mo.disconnect();
      observer?.disconnect();
      observer = null;
    });
  });
}
