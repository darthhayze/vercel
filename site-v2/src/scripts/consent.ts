// Only this same-origin module may start analytics; no Google requests precede consent.
const measurementId = 'G-X4CMQSBTM1';
const key = 'analytics-consent';
const google = window as typeof window & { dataLayer: unknown[]; gtag: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean };
google.dataLayer = google.dataLayer || [];
google.gtag = function () { google.dataLayer.push(arguments); };
const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
google.gtag('consent', 'default', denied);
google[`ga-disable-${measurementId}`] = true;
const panel = document.querySelector<HTMLElement>('#analytics-consent')!;
let loaded = false;
function show(open: boolean) {
  panel.hidden = !open;
}
function accept() {
  google[`ga-disable-${measurementId}`] = false;
  google.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
  if (loaded) return;
  loaded = true;
  google.gtag('js', new Date());
  google.gtag('config', measurementId, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: true,
    page_path: location.pathname + location.search,
    page_location: location.href,
    page_title: document.title,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
}
function clearAnalyticsCookies() {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0].trim();
    if (name !== '_ga' && !name.startsWith('_ga_')) continue;
    const parts = location.hostname.split('.');
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (let i = 0; i < parts.length - 1; i++) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${parts.slice(i).join('.')}`;
    }
  }
}
let choice: string | null = null;
try { choice = localStorage.getItem(key); } catch { /* Storage may be disabled; ask on each visit. */ }
if (choice === 'accepted') accept();
show(choice !== 'accepted' && choice !== 'declined');
document.querySelectorAll<HTMLAnchorElement>('[data-analytics-settings]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  show(true);
  panel.querySelector('button')?.focus();
}));
panel.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach((button) => button.addEventListener('click', () => {
  const value = button.dataset.consent!;
  let saved = false;
  try { localStorage.setItem(key, value); saved = true; } catch {
    document.querySelector('[data-consent-status]')!.textContent = 'Your browser could not save this choice. It applies to this page. Clear site data to reset any earlier choice.';
  }
  if (value === 'accepted') accept();
  else {
    google[`ga-disable-${measurementId}`] = true;
    clearAnalyticsCookies();
    // Reload removes Google's running code without sending a denied-mode cookieless ping.
    if (loaded && saved) { location.reload(); return; }
  }
  show(false);
  document.querySelector<HTMLAnchorElement>('[data-analytics-settings]')?.focus({ preventScroll: true });
}));
