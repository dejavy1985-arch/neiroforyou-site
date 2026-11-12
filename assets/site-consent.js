/* One origin-wide consent state. No analytics code runs before permission. */
(() => {
  'use strict';
  const key = 'neiroforyou_cookie_consent', counter = 110840076;
  const banner = document.querySelector('[data-cookie-banner]');
  const dialog = document.querySelector('[data-consent-dialog]');
  let choice = read(), opener;
  function read() { try { return localStorage.getItem(key); } catch { return null; } }
  function hideBanner() {
    if (banner) banner.hidden = true;
    document.documentElement.classList.remove('cookie-banner-visible');
  }
  function start() {
    if (choice !== 'accepted' || window.__neiroForYouMetrikaLoaded) return;
    window.__neiroForYouMetrikaLoaded = true;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js'; document.head.append(script);
    window.ym(counter, 'init', {clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});
  }
  function save(value) {
    const wasRunning = window.__neiroForYouMetrikaLoaded;
    choice = value;
    try { localStorage.setItem(key, value); } catch { /* Remain fail-closed on next navigation. */ }
    hideBanner();
    if (value === 'rejected' && wasRunning) {
      // Destroy event collectors now, then reload without the third-party script.
      try { window.ym(counter, 'destruct'); } catch {}
      window.location.reload(); return;
    }
    start();
  }
  if (choice === 'accepted') { hideBanner(); start(); }
  else if (choice === 'rejected') hideBanner();
  else if (banner) { banner.hidden = false; document.documentElement.classList.add('cookie-banner-visible'); }
  document.querySelector('[data-cookie-accept]')?.addEventListener('click', () => save('accepted'));
  document.querySelector('[data-cookie-decline]')?.addEventListener('click', () => save('rejected'));
  document.querySelectorAll('[data-cookie-settings]').forEach(button => button.addEventListener('click', () => {
    if (!dialog) return;
    opener = button;
    dialog.querySelector('[name="analytics"]').checked = choice === 'accepted';
    dialog.querySelector('[data-consent-status]').textContent = choice === 'accepted' ? 'Сейчас аналитика разрешена.' : choice === 'rejected' ? 'Сейчас аналитика отключена.' : 'Выбор пока не сохранён. Аналитика отключена.';
    dialog.showModal();
    dialog.querySelector('[name="analytics"]').focus();
  }));
  dialog?.querySelector('[data-consent-form]').addEventListener('submit', event => {
    event.preventDefault(); const allowed = dialog.querySelector('[name="analytics"]').checked;
    dialog.close(); save(allowed ? 'accepted' : 'rejected');
  });
  dialog?.querySelector('[data-consent-close]').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => opener?.focus());
  dialog?.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('input,button,a[href]')].filter(el => !el.disabled);
    const first=items[0], last=items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-metrika-goal]');
    if (target && choice === 'accepted' && typeof window.ym === 'function') window.ym(counter, 'reachGoal', target.dataset.metrikaGoal);
  });
  // Another tab can revoke permission while this document is open.
  window.addEventListener('storage', event => {
    if (event.key === key && event.newValue !== choice) {
      if (event.newValue === 'rejected' && window.__neiroForYouMetrikaLoaded) { choice='rejected'; try { window.ym(counter,'destruct'); } catch {} location.reload(); }
      else { choice=event.newValue; if (choice) hideBanner(); start(); }
    }
  });
})();
