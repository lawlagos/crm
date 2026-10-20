export function scheduleSessionExpiry(expiresAt: string, expired: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = Date.parse(expiresAt);
  function check() { const remaining = deadline - Date.now(); if (!Number.isFinite(remaining) || remaining <= 0) { expired(); return; } timer = setTimeout(check, Math.min(remaining, 60_000)); }
  check(); return () => clearTimeout(timer);
}
