// Auth Modal Bridge – binds CTA clicks to the landing auth modal
(function(){
  const CTA_SELECTORS = [
    'a[data-framer-name*="cta" i]',
    'button[data-framer-name*="cta" i]',
    'a[data-auth="cta"]',
    'button[data-auth="cta"]',
    'a[data-auth="login"]',
    'button[data-auth="login"]',
    'a[data-auth="signup"]',
    'button[data-auth="signup"]'
  ];

  const CTA_TEXT_MATCHERS = [
    'jetzt testen',
    'registrieren',
    'kostenlos testen',
    'anmelden',
    'login',
    'sign up',
    'demo vereinbaren',
    'zum dashboard'
  ];

  const processed = new WeakSet();

  console.log('🔗 Loading auth modal bridge...');

  function ensureModalFunctions() {
    if (typeof window.__ensureLandingAuthModal === 'function' && typeof window.openAuthModal === 'function') {
      return true;
    }
    if (typeof window.__ensureLandingAuthModal !== 'function') {
      return false;
    }
    try {
      window.__ensureLandingAuthModal();
      return typeof window.openAuthModal === 'function';
    } catch (error) {
      console.warn('⚠️ Failed to boot landing auth modal', error);
      return false;
    }
  }

  function openModal(mode) {
    if (!ensureModalFunctions()) {
      console.warn('⚠️ Auth modal functions not ready');
      return false;
    }
    try {
      window.openAuthModal(mode);
      return true;
    } catch (error) {
      console.warn('⚠️ openAuthModal threw', error);
      return false;
    }
  }

  function elementMatchesCta(node) {
    if (!node) return false;
    if (processed.has(node)) return true;
    for (let i = 0; i < CTA_SELECTORS.length; i += 1) {
      if (node.matches && node.matches(CTA_SELECTORS[i])) {
        processed.add(node);
        return true;
      }
    }
    const text = (node.textContent || '').trim().toLowerCase();
    for (let j = 0; j < CTA_TEXT_MATCHERS.length; j += 1) {
      if (text.includes(CTA_TEXT_MATCHERS[j])) {
        processed.add(node);
        return true;
      }
    }
    return false;
  }

  function deriveMode(node) {
    if (!node) return 'login';
    const attr = (node.getAttribute('data-auth-mode') || '').toLowerCase();
    if (attr === 'signup' || attr === 'register') return 'signup';
    if (attr === 'login' || attr === 'signin') return 'login';
    const text = (node.textContent || '').toLowerCase();
    if (text.includes('registr')) return 'signup';
    if (text.includes('sign up')) return 'signup';
    return 'login';
  }

  function isFramerRedirect(node) {
    if (!node || !node.href) return false;
    const href = node.href;
    return href.includes('framer.link') || href.includes('framerusercontent.com') || href.includes('framer.com');
  }

  function handleClick(event) {
    const target = event.target && (event.target.closest ? event.target.closest('a, button') : null);
    if (!target) return;
    if (!elementMatchesCta(target) && !isFramerRedirect(target)) return;

    event.preventDefault();
    event.stopPropagation();

    const mode = deriveMode(target);
    console.log('🪄 Auth CTA intercepted (mode: ' + mode + ')', target);
    if (!openModal(mode)) {
      console.warn('⚠️ Failed to open auth modal for CTA');
    }
  }

  function bindExisting() {
    const root = document;
    CTA_SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach((node) => processed.add(node));
    });
  }

  function observeMutations() {
    try {
      const observer = new MutationObserver((mutations) => {
        let needsBind = false;
        for (let i = 0; i < mutations.length; i += 1) {
          const mutation = mutations[i];
          if (!mutation.addedNodes) continue;
          for (let j = 0; j < mutation.addedNodes.length; j += 1) {
            const node = mutation.addedNodes[j];
            if (!node || node.nodeType !== 1) continue;
            const element = node.matches ? node : null;
            if ((element && elementMatchesCta(element)) || node.querySelector) {
              needsBind = true;
              break;
            }
          }
          if (needsBind) break;
        }
        if (needsBind) bindExisting();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (error) {
      console.warn('⚠️ Failed to observe CTA mutations', error);
    }
  }

  function init() {
    ensureModalFunctions();
    bindExisting();
    observeMutations();
    document.addEventListener('click', handleClick, true);
    console.log('✅ Auth modal bridge ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
