/**
 * Shared auth composable for the marketing site.
 * Reads the same session cookie used by the main iinwentory app.
 * This works because both sites share the same backend (localhost:7745).
 */
export function useAuth() {
  const token = useCookie("hb.auth.session");
  const isLoggedIn = computed(() => !!token.value && token.value !== "false");

  return { isLoggedIn };
}
