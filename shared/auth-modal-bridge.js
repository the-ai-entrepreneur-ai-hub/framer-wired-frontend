(function () {
  'use strict';

  const CTA_SELECTORS = [
    '[data-auth="cta"]',
    'a[data-auth="login"]',
    'a[data-auth="signup"]',
    'button[data-auth="login"]',
    'button[data-auth="signup"]',
    'a[data-framer-name*="cta" i]',
    'button[data-framer-name*="cta" i]'
  ];

  const CTA_TEXT_MATCHERS = [
    'registrieren',
    'jetzt starten',
    'sign up',
    'signup',
    'login',
    'anmelden',
    'zum dashboard',
    'kostenlos testen'
  ];

  const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const GOOGLE_INITIATE_PATH = '/api/auth/oauth/google/initiate';
  const OBSERVER_DELAY = 80;
  const PASSWORD_MIN_LENGTH = 6;

  function isInsideAuthModal(node) {
    try {
      return !!(node && typeof node.closest === 'function' && (node.closest('.anwalts-auth-modal') || node.closest('.anwalts-auth-overlay')));
    } catch (_) {
      return false;
    }
  }

  const COPY = {
    login: {
      title: 'Willkommen zurück',
      subtitle: 'Melden Sie sich an, um Ihr Kanzlei-Dashboard zu öffnen.',
      submit: 'Anmelden',
      submitBusy: 'Anmelden…',
      footerPrompt: 'Neu bei ANWALTS.AI?',
      footerCta: 'Jetzt registrieren'
    },
    signup: {
      title: 'Konto erstellen',
      subtitle: 'Registrieren Sie sich kostenlos und starten Sie mit ANWALTS.AI.',
      submit: 'Registrieren',
      submitBusy: 'Registrieren…',
      footerPrompt: 'Bereits Kunde?',
      footerCta: 'Jetzt anmelden'
    }
  };

  const boundCtas = new WeakSet();
  let bindTimer = null;

  const state = {
    overlay: null,
    modal: null,
    form: null,
    submitButton: null,
    footerToggle: null,
    footerPrompt: null,
    titleEl: null,
    subtitleEl: null,
    messageEl: null,
    generalErrorEl: null,
    googleButton: null,
    mode: 'login',
    isOpen: false,
    isSubmitting: false,
    redirectTimer: null,
    lastFocused: null,
    focusTrapHandler: null,
    observer: null,
    fields: {},
    fieldErrors: {},
    fieldGroups: {}
  };

  ready(init);

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function init() {
    bindCtas(document);
    // Capture phase keeps Framer overlays from swallowing auth CTAs.
    document.addEventListener('click', handleDocumentClickCapture, true);
    state.observer = new MutationObserver(handleMutations);
    state.observer.observe(document.documentElement, { childList: true, subtree: true });
    exposeBridge();
  }

  function handleMutations(mutations) {
    for (let i = 0; i < mutations.length; i += 1) {
      const mutation = mutations[i];
      if (!mutation.addedNodes || mutation.addedNodes.length === 0) continue;
      let shouldBind = false;
      for (let j = 0; j < mutation.addedNodes.length; j += 1) {
        const node = mutation.addedNodes[j];
        if (node && node.nodeType === 1) {
          shouldBind = true;
          break;
        }
      }
      if (!shouldBind) continue;
      if (bindTimer) window.clearTimeout(bindTimer);
      bindTimer = window.setTimeout(() => bindCtas(document), OBSERVER_DELAY);
      break;
    }
  }

  function bindCtas(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const candidates = new Set();
    for (let i = 0; i < CTA_SELECTORS.length; i += 1) {
      const selector = CTA_SELECTORS[i];
      const found = root.querySelectorAll(selector);
      for (let j = 0; j < found.length; j += 1) {
        const candidate = found[j];
        if (!isInsideAuthModal(candidate)) {
          candidates.add(candidate);
        }
      }
    }

    const clickable = root.querySelectorAll('a, button');
    for (let i = 0; i < clickable.length; i += 1) {
      const node = clickable[i];
      if (!node || boundCtas.has(node) || isInsideAuthModal(node)) continue;
      const text = (node.textContent || '').trim().toLowerCase();
      if (!text) continue;
      for (let k = 0; k < CTA_TEXT_MATCHERS.length; k += 1) {
        if (text.includes(CTA_TEXT_MATCHERS[k])) {
          candidates.add(node);
          break;
        }
      }
    }

    candidates.forEach(bindCtaNode);
  }

  function bindCtaNode(node) {
    if (!node || boundCtas.has(node) || isInsideAuthModal(node)) return;
    boundCtas.add(node);
    try {
      node.dataset.authBound = '1';
    } catch (_) {}
    ensurePointerDefaults(node);
    node.addEventListener('click', (event) => {
      if (event.__anwaltsAuthHandled) return;
      event.preventDefault();
      event.stopPropagation();
      event.__anwaltsAuthHandled = true;
      openAuthModal(deriveMode(node));
    });
  }

  function ensurePointerDefaults(node) {
    try {
      if (node instanceof HTMLElement) {
        const style = window.getComputedStyle(node);
        if (style && style.pointerEvents === 'none') {
          node.style.pointerEvents = 'auto';
        }
      }
    } catch (_) {}
  }

  function handleDocumentClickCapture(event) {
    if (isInsideAuthModal(event?.target)) return;
    const cta = resolveCtaFromEvent(event);
    if (!cta) return;
    event.preventDefault();
    event.stopPropagation();
    event.__anwaltsAuthHandled = true;
    openAuthModal(deriveMode(cta));
  }

  function resolveCtaFromEvent(event) {
    if (!event) return null;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (let i = 0; i < path.length; i += 1) {
      const node = path[i];
      if (isInsideAuthModal(node)) return null;
      if (isBoundCta(node)) return node;
    }
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return null;
    return peekForCta(event.clientX, event.clientY, 5);
  }

  function peekForCta(x, y, maxIterations) {
    let element = document.elementFromPoint(x, y);
    const touched = [];
    const visited = new Set();
    for (let i = 0; i < maxIterations && element && !visited.has(element); i += 1) {
      visited.add(element);
      if (isInsideAuthModal(element)) {
        restorePointerEvents(touched);
        return null;
      }
      if (isBoundCta(element)) {
        restorePointerEvents(touched);
        return element;
      }
      if (!(element instanceof HTMLElement)) break;
      const prev = element.style.pointerEvents;
      touched.push([element, prev]);
      element.style.pointerEvents = 'none';
      element = document.elementFromPoint(x, y);
    }
    restorePointerEvents(touched);
    return null;
  }

  function restorePointerEvents(entries) {
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry && entry[0]) entry[0].style.pointerEvents = entry[1];
    }
  }

  function isBoundCta(node) {
    return !!(node && node.dataset && node.dataset.authBound === '1');
  }

  function deriveMode(node) {
    if (!node) return 'login';
    const attr = (node.getAttribute && node.getAttribute('data-auth-mode')) || '';
    const lowered = attr.toLowerCase();
    if (lowered === 'signup' || lowered === 'register') return 'signup';
    if (lowered === 'login' || lowered === 'signin') return 'login';
    const text = (node.textContent || '').toLowerCase();
    if (text.includes('registr')) return 'signup';
    if (text.includes('sign up')) return 'signup';
    return 'login';
  }

  function exposeBridge() {
    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
    window.addEventListener('message', (event) => {
      if (!event || typeof event.data !== 'object') return;
      if (event.data.type === 'ANWALTS_OPEN_AUTH') openAuthModal(event.data.mode);
      if (event.data.type === 'ANWALTS_CLOSE_AUTH') closeAuthModal();
    });
    window.dispatchEvent(new CustomEvent('anwalts-auth-bridge-ready'));
  }

  function openAuthModal(mode) {
    const normalized = normalizeMode(mode);
    if (typeof window.__anwaltsAuthOpen === 'function') {
      window.__anwaltsAuthOpen(normalized);
      return;
    }
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'ANWALTS_OPEN_AUTH', mode: normalized }, '*');
      } catch (_) {}
    }
    fallbackOpen(normalized);
  }

  function closeAuthModal() {
    if (typeof window.__anwaltsAuthClose === 'function') {
      window.__anwaltsAuthClose();
      return;
    }
    fallbackClose();
  }

  function normalizeMode(value) {
    const lowered = (value || '').toLowerCase();
    return lowered === 'signup' || lowered === 'register' || lowered === 'sign-up' ? 'signup' : 'login';
  }

  function fallbackOpen(mode) {
    ensureModal();
    setMode(mode, true);
    if (state.isOpen) return;
    state.isOpen = true;
    state.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('anwalts-auth-modal-open');
    state.overlay.classList.add('is-open');
    state.overlay.setAttribute('aria-hidden', 'false');
    activateFocusTrap();
    focusInitialField();
  }

  function fallbackClose() {
    if (!state.overlay || !state.isOpen) return;
    state.isOpen = false;
    document.body.classList.remove('anwalts-auth-modal-open');
    state.overlay.classList.remove('is-open');
    state.overlay.setAttribute('aria-hidden', 'true');
    deactivateFocusTrap();
    clearMessage();
    clearErrors();
    if (state.redirectTimer) {
      window.clearTimeout(state.redirectTimer);
      state.redirectTimer = null;
    }
    resetForm();
    if (state.lastFocused && typeof state.lastFocused.focus === 'function') {
      try { state.lastFocused.focus(); } catch (_) {}
    }
    state.lastFocused = null;
  }

  function ensureModal() {
    if (state.overlay) return;
    const overlay = document.createElement('div');
    overlay.className = 'anwalts-auth-overlay';
    overlay.setAttribute('data-mode', state.mode);
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<div class="anwalts-auth-modal" data-auth-dialog role="dialog" aria-modal="true" aria-labelledby="anwalts-auth-title" tabindex="-1">',
      '  <button type="button" class="anwalts-auth-close" data-auth-close aria-label="Schließen"><span aria-hidden="true">&times;</span></button>',
      '  <div class="anwalts-auth-header">',
      '    <h2 class="anwalts-auth-title" id="anwalts-auth-title">Willkommen zurück</h2>',
      '    <p class="anwalts-auth-subtitle" data-auth-subtitle>Melden Sie sich an, um Ihr Kanzlei-Dashboard zu öffnen.</p>',
      '  </div>',
      '  <button type="button" class="anwalts-auth-google" data-auth-google>',
      '    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
      '    <span>Mit Google fortfahren</span>',
      '  </button>',
      '  <div class="anwalts-auth-divider"><span>oder mit E-Mail</span></div>',
      '  <form class="anwalts-auth-form" data-auth-form novalidate>',
      '    <div class="anwalts-auth-field" data-auth-field="name" data-auth-section="signup">',
      '      <label for="anwalts-auth-name">Vollständiger Name</label>',
      '      <input id="anwalts-auth-name" name="name" type="text" autocomplete="name" placeholder="Dr. Max Müller">',
      '      <p class="anwalts-auth-field-error" data-auth-error-for="name" aria-live="polite"></p>',
      '    </div>',
      '    <div class="anwalts-auth-field" data-auth-field="email">',
      '      <label for="anwalts-auth-email">E-Mail-Adresse</label>',
      '      <input id="anwalts-auth-email" name="email" type="email" autocomplete="email" placeholder="kanzlei@example.de" required>',
      '      <p class="anwalts-auth-field-error" data-auth-error-for="email" aria-live="polite"></p>',
      '    </div>',
      '    <div class="anwalts-auth-field" data-auth-field="password">',
      '      <label for="anwalts-auth-password">Passwort</label>',
      '      <input id="anwalts-auth-password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required>',
      '      <p class="anwalts-auth-field-error" data-auth-error-for="password" aria-live="polite"></p>',
      '    </div>',
      '    <div class="anwalts-auth-field" data-auth-field="confirm" data-auth-section="signup">',
      '      <label for="anwalts-auth-confirm">Passwort bestätigen</label>',
      '      <input id="anwalts-auth-confirm" name="confirm" type="password" autocomplete="new-password" placeholder="Passwort bestätigen">',
      '      <p class="anwalts-auth-field-error" data-auth-error-for="confirm" aria-live="polite"></p>',
      '    </div>',
      '    <div class="anwalts-auth-field anwalts-auth-field--checkbox" data-auth-field="terms" data-auth-section="signup">',
      '      <label class="anwalts-auth-checkbox">',
      '        <input type="checkbox" name="terms">',
      '        <span>Ich stimme den <a href="/terms" target="_blank" rel="noopener">AGB</a> und <a href="/privacy" target="_blank" rel="noopener">Datenschutzbestimmungen</a> zu.</span>',
      '      </label>',
      '      <p class="anwalts-auth-field-error" data-auth-error-for="terms" aria-live="polite"></p>',
      '    </div>',
      '    <div class="anwalts-auth-global-error" data-auth-error-general role="alert"></div>',
      '    <div class="anwalts-auth-message" data-auth-message aria-live="polite"></div>',
      '    <button type="submit" class="anwalts-auth-submit" data-auth-submit>Anmelden</button>',
      '  </form>',
      '  <div class="anwalts-auth-footer">',
      '    <span data-auth-footer-prompt>Neu bei ANWALTS.AI?</span>',
      '    <button type="button" data-auth-footer-toggle>Jetzt registrieren</button>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    state.overlay = overlay;
    state.modal = overlay.querySelector('[data-auth-dialog]');
    state.form = overlay.querySelector('[data-auth-form]');
    state.submitButton = overlay.querySelector('[data-auth-submit]');
    state.footerPrompt = overlay.querySelector('[data-auth-footer-prompt]');
    state.footerToggle = overlay.querySelector('[data-auth-footer-toggle]');
    state.titleEl = overlay.querySelector('#anwalts-auth-title');
    state.subtitleEl = overlay.querySelector('[data-auth-subtitle]');
    state.messageEl = overlay.querySelector('[data-auth-message]');
    state.generalErrorEl = overlay.querySelector('[data-auth-error-general]');
    state.googleButton = overlay.querySelector('[data-auth-google]');

    state.fields = {
      name: overlay.querySelector('#anwalts-auth-name'),
      email: overlay.querySelector('#anwalts-auth-email'),
      password: overlay.querySelector('#anwalts-auth-password'),
      confirm: overlay.querySelector('#anwalts-auth-confirm'),
      terms: overlay.querySelector('input[name="terms"]')
    };

    state.fieldErrors = {
      name: overlay.querySelector('[data-auth-error-for="name"]'),
      email: overlay.querySelector('[data-auth-error-for="email"]'),
      password: overlay.querySelector('[data-auth-error-for="password"]'),
      confirm: overlay.querySelector('[data-auth-error-for="confirm"]'),
      terms: overlay.querySelector('[data-auth-error-for="terms"]')
    };

    state.fieldGroups = {
      name: overlay.querySelector('[data-auth-field="name"]'),
      email: overlay.querySelector('[data-auth-field="email"]'),
      password: overlay.querySelector('[data-auth-field="password"]'),
      confirm: overlay.querySelector('[data-auth-field="confirm"]'),
      terms: overlay.querySelector('[data-auth-field="terms"]')
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) fallbackClose();
    });

    const closeButton = overlay.querySelector('[data-auth-close]');
    if (closeButton) closeButton.addEventListener('click', fallbackClose);

    if (state.footerToggle) {
      state.footerToggle.addEventListener('click', () => {
        setMode(state.mode === 'login' ? 'signup' : 'login', true);
      });
    }

    if (state.googleButton) {
      state.googleButton.addEventListener('click', (event) => {
        event.preventDefault();
        initiateGoogleOAuth();
      });
    }

    if (state.form) {
      state.form.addEventListener('submit', handleSubmit);
    }
  }

  function setMode(mode, focus) {
    const normalized = normalizeMode(mode);
    if (state.mode !== normalized) {
      state.mode = normalized;
      clearErrors();
      clearMessage();
    }
    updateModeUI();
    if (state.overlay) state.overlay.setAttribute('data-mode', state.mode);
    if (focus) focusInitialField();
  }

  function updateModeUI() {
    const copy = COPY[state.mode];
    if (state.titleEl) state.titleEl.textContent = copy.title;
    if (state.subtitleEl) state.subtitleEl.textContent = copy.subtitle;
    if (state.submitButton) {
      state.submitButton.textContent = state.isSubmitting ? copy.submitBusy : copy.submit;
    }
    if (state.footerPrompt) state.footerPrompt.textContent = copy.footerPrompt;
    if (state.footerToggle) state.footerToggle.textContent = copy.footerCta;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (state.isSubmitting) return;
    clearMessage();
    clearErrors();

    const values = collectFormValues();
    const validation = validate(values, state.mode);
    applyValidationErrors(validation.fieldErrors);
    if (!validation.valid) {
      if (validation.focusField && state.fields[validation.focusField]) {
        try { state.fields[validation.focusField].focus(); } catch (_) {}
      }
      return;
    }

    setSubmitting(true);
    const action = state.mode === 'login' ? performLogin(values) : performSignup(values);
    action
      .catch((error) => handleAuthError(error, state.mode))
      .finally(() => setSubmitting(false));
  }

  function collectFormValues() {
    return {
      name: state.fields.name ? state.fields.name.value.trim() : '',
      email: state.fields.email ? state.fields.email.value.trim().toLowerCase() : '',
      password: state.fields.password ? state.fields.password.value : '',
      confirm: state.fields.confirm ? state.fields.confirm.value : '',
      terms: state.fields.terms ? !!state.fields.terms.checked : false
    };
  }

  function validate(values, mode) {
    const errors = {};
    let focusField = null;

    if (!values.email || !/.+@.+\..+/.test(values.email)) {
      errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      focusField = focusField || 'email';
    }

    if (!values.password || values.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = 'Passwort benötigt mindestens ' + PASSWORD_MIN_LENGTH + ' Zeichen.';
      focusField = focusField || 'password';
    }

    if (mode === 'signup') {
      if (!values.name) {
        errors.name = 'Bitte geben Sie Ihren vollständigen Namen ein.';
        focusField = focusField || 'name';
      }
      if (!values.confirm || values.confirm !== values.password) {
        errors.confirm = 'Bitte bestätigen Sie Ihr Passwort.';
        focusField = focusField || 'confirm';
      }
      if (!values.terms) {
        errors.terms = 'Bitte akzeptieren Sie die Bedingungen.';
        focusField = focusField || 'terms';
      }
    }

    return { valid: Object.keys(errors).length === 0, fieldErrors: errors, focusField };
  }

  function applyValidationErrors(errors) {
    const keys = Object.keys(state.fieldErrors);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const message = errors && errors[key];
      setFieldError(key, message || '');
    }
  }

  function setFieldError(field, message) {
    const errorEl = state.fieldErrors[field];
    if (errorEl) errorEl.textContent = message || '';
    const group = state.fieldGroups[field];
    if (group) {
      if (message) {
        group.setAttribute('data-invalid', 'true');
      } else {
        group.removeAttribute('data-invalid');
      }
    }
  }

  function clearErrors() {
    applyValidationErrors({});
    setGeneralError('');
  }

  function setGeneralError(message) {
    if (state.generalErrorEl) state.generalErrorEl.textContent = message || '';
  }

  function clearMessage() {
    if (state.messageEl) state.messageEl.textContent = '';
  }

  function setMessage(message) {
    if (state.messageEl) state.messageEl.textContent = message || '';
  }

  function setSubmitting(flag) {
    state.isSubmitting = !!flag;
    const copy = COPY[state.mode];
    if (state.submitButton) {
      state.submitButton.disabled = flag;
      state.submitButton.textContent = flag ? copy.submitBusy : copy.submit;
    }
  }

  async function performLogin(values) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        remember_me: false,
        csrf_token: 'landing-modal'
      })
    });
    const data = await parseJson(response);
    if (response.status >= 400 || (data && (data.error || data.success === false))) {
      throw { status: response.status, data: data || {} };
    }
    const token = data && (data.token || data.access_token);
    if (!token) throw { status: response.status || 500, data: { error: 'Token konnte nicht erstellt werden.' } };
    persistSession(token, data && data.user ? data.user : { email: values.email });
    setMessage('Weiterleitung zum Dashboard …');
    if (state.redirectTimer) window.clearTimeout(state.redirectTimer);
    state.redirectTimer = window.setTimeout(() => {
      window.location.href = '/dashboard';
    }, 400);
  }

  async function performSignup(values) {
    const [firstName, ...rest] = (values.name || '').trim().split(/\s+/);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        first_name: firstName || values.name || 'Landing',
        last_name: rest.join(' ') || 'User',
        title: 'Rechtsanwalt',
        firm_name: 'Landing-Kanzlei',
        terms_accepted: !!values.terms,
        csrf_token: 'landing-modal',
        remember_me: false
      })
    });
    const data = await parseJson(response);
    if (response.status >= 400 || (data && (data.error || data.detail))) {
      throw { status: response.status, data: data || {} };
    }
    return performLogin(values);
  }

  async function initiateGoogleOAuth() {
    if (!state.googleButton) return;
    clearErrors();
    clearMessage();

    state.googleButton.disabled = true;
    try {
      const redirectUri = new URL('/api/auth/oauth/google/callback', window.location.origin).toString();
      const response = await fetch(GOOGLE_INITIATE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ redirect_uri: redirectUri })
      });
      const data = await parseJson(response);
      if (response.status >= 400 || !data || !data.auth_url) {
        throw new Error((data && (data.detail || data.error || data.message)) || 'Google-Anmeldung konnte nicht gestartet werden.');
      }
      window.location.href = data.auth_url;
    } catch (error) {
      const message = error && error.message ? error.message : 'Google-Anmeldung konnte nicht gestartet werden.';
      setGeneralError(message);
      state.googleButton.disabled = false;
    }
  }

  async function parseJson(response) {
    if (!response) return {};
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_) {
      return {};
    }
  }

  function handleAuthError(error, mode) {
    const details = normalizeErrorPayload(error, mode);
    applyValidationErrors(details.fieldErrors);
    if (details.general) setGeneralError(details.general);
  }

  function normalizeErrorPayload(error, mode) {
    const fieldErrors = {};
    let general = '';
    const status = error && typeof error.status === 'number' ? error.status : 0;
    const data = error && error.data ? error.data : {};

    if (data && data.errors && typeof data.errors === 'object') {
      const keys = Object.keys(data.errors);
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const value = data.errors[key];
        if (typeof value === 'string') {
          fieldErrors[key] = value;
        }
      }
    }

    if (data && Array.isArray(data.detail)) {
      for (let i = 0; i < data.detail.length; i += 1) {
        const entry = data.detail[i];
        if (entry && entry.loc && entry.loc.length) {
          const field = entry.loc[entry.loc.length - 1];
          if (typeof field === 'string' && typeof entry.msg === 'string') {
            fieldErrors[field] = entry.msg;
          }
        }
      }
    }

    const message = extractMessage(data);

    if (mode === 'login' && !Object.keys(fieldErrors).length) {
      const msg = message || 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.';
      fieldErrors.email = msg;
      fieldErrors.password = msg;
    }

    if (mode === 'signup' && !Object.keys(fieldErrors).length) {
      if (message && /email/i.test(message)) {
        fieldErrors.email = message;
      } else if (message && /passwort/i.test(message)) {
        fieldErrors.password = message;
      }
    }

    if (!Object.keys(fieldErrors).length && message) {
      general = message;
    } else if (!general && status >= 500) {
      general = 'Der Server ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut.';
    }

    return { fieldErrors, general };
  }

  function extractMessage(data) {
    if (!data) return '';
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
    return '';
  }

  function persistSession(token, user) {
    try {
      window.localStorage.setItem('anwalts_auth_token', token);
      if (user) window.localStorage.setItem('anwalts_user', JSON.stringify(user));
    } catch (_) {}

    const maxAge = 60 * 60 * 24;
    setCookie('sat', token, maxAge);
    setCookie('sid', token, maxAge);
  }

  function setCookie(name, value, maxAge) {
    const base = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + maxAge + '; secure; samesite=None';
    document.cookie = base;
    try {
      const host = window.location.hostname.split('.');
      if (host.length > 2) {
        const domain = '.' + host.slice(-2).join('.');
        document.cookie = base + '; domain=' + domain;
      }
    } catch (_) {}
  }

  function focusInitialField() {
    const target = state.mode === 'signup' ? state.fields.name : state.fields.email;
    if (target && typeof target.focus === 'function') {
      target.focus();
    } else if (state.modal && typeof state.modal.focus === 'function') {
      state.modal.focus();
    }
  }

  function activateFocusTrap() {
    if (state.focusTrapHandler) return;
    state.focusTrapHandler = (event) => {
      if (!state.isOpen || !state.modal) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        fallbackClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(state.modal.querySelectorAll(FOCUSABLE))
        .filter((el) => el && el.offsetParent !== null && !el.hasAttribute('disabled'));
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', state.focusTrapHandler, true);
  }

  function deactivateFocusTrap() {
    if (!state.focusTrapHandler) return;
    document.removeEventListener('keydown', state.focusTrapHandler, true);
    state.focusTrapHandler = null;
  }

  function resetForm() {
    if (state.form && typeof state.form.reset === 'function') {
      state.form.reset();
    }
    const keys = Object.keys(state.fields);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const field = state.fields[key];
      if (field && 'value' in field) field.value = '';
    }
    if (state.fields.terms) state.fields.terms.checked = false;
  }
})();
