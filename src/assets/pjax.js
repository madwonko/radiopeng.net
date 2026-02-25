// /assets/pjax.js
(function () {
  const PJAX_SEL = '[data-pjax]';
  const container = document.querySelector(PJAX_SEL);
  if (!container) return;

  function isModifiedEvent(e) {
    return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
  }

  function isSameOrigin(url) {
    try {
      const u = new URL(url, window.location.href);
      return u.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  function shouldIgnoreLink(a, e) {
    if (!a) return true;
    if (a.hasAttribute('download')) return true;
    if (a.getAttribute('target') && a.getAttribute('target') !== '_self') return true;
    if (a.getAttribute('rel')?.includes('external')) return true;
    if (a.hash && a.pathname === window.location.pathname) return true; // same-page anchor
    if (isModifiedEvent(e)) return true;
    if (!isSameOrigin(a.href)) return true;

    const u = new URL(a.href);
    // Skip common non-html assets
    const path = u.pathname.toLowerCase();
    if (/\.(pdf|zip|png|jpg|jpeg|gif|webp|svg|mp3|wav)$/.test(path)) return true;

    return false;
  }

  async function pjaxNavigate(url, { push = true } = {}) {
    container.setAttribute('aria-busy', 'true');

    const res = await fetch(url, {
      headers: { 'X-Requested-With': 'PJAX' }
    });

    if (!res.ok) {
      container.removeAttribute('aria-busy');
      window.location.href = url; // fallback
      return;
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const next = doc.querySelector(PJAX_SEL);
    if (!next) {
      container.removeAttribute('aria-busy');
      window.location.href = url; // fallback
      return;
    }

    // Swap content
    container.innerHTML = next.innerHTML;

    // Update title
    const nextTitle = doc.querySelector('title');
    if (nextTitle) document.title = nextTitle.textContent;

    // Update URL
    if (push) history.pushState({ pjax: true }, '', url);

    // Optional: scroll to top on navigation
    window.scrollTo(0, 0);

    // Tell other scripts “page changed”
    document.dispatchEvent(new CustomEvent('pjax:load', { detail: { url } }));

    container.removeAttribute('aria-busy');
  }

  // Click interception
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (shouldIgnoreLink(a, e)) return;

    e.preventDefault();
    pjaxNavigate(a.href, { push: true }).catch(() => {
      window.location.href = a.href;
    });
  });

  // Back/forward
  window.addEventListener('popstate', () => {
    pjaxNavigate(window.location.href, { push: false }).catch(() => {
      window.location.reload();
    });
  });
})();