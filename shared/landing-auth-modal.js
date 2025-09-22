// Lightweight auth modal fallback for static Framer exports
(function(){
  function createStyle(){
    if (document.getElementById('landing-auth-modal-style')) return
    const style = document.createElement('style')
    style.id = 'landing-auth-modal-style'
    style.textContent = [
      '.landing-auth-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:2147483646;opacity:0;transition:opacity 0.2s ease;}',
      '.landing-auth-overlay[data-open="1"]{display:flex;opacity:1;}',
      '.landing-auth-modal{position:relative;width:100%;max-width:480px;background:rgba(9,16,29,0.92);color:#e2e8f0;border-radius:18px;padding:32px 32px 28px;border:1px solid rgba(148,163,184,0.35);box-shadow:0 32px 80px rgba(8,15,31,0.55);font-family:"Inter",system-ui,-apple-system,sans-serif;}',
      '.landing-auth-close{position:absolute;top:14px;right:16px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(30,41,59,0.65);color:#e2e8f0;font-size:24px;line-height:34px;cursor:pointer;transition:background 0.12s ease;}',
      '.landing-auth-close:hover{background:rgba(51,65,85,0.85);}',
      '.landing-auth-modal h2{margin:0 48px 20px 0;font-size:1.75rem;font-weight:600;}',
      '.landing-auth-modal p.subline{margin:0 48px 24px 0;font-size:0.95rem;color:#94a3b8;}',
      '.landing-auth-form{display:grid;gap:16px;}',
      '.landing-auth-label{display:flex;flex-direction:column;font-size:0.85rem;color:#cbd5f5;gap:6px;}',
      '.landing-auth-input{padding:12px 14px;border-radius:12px;border:1px solid rgba(148,163,184,0.35);background:rgba(15,23,42,0.65);color:#e2e8f0;font-size:0.95rem;outline:none;transition:border-color 0.12s ease,box-shadow 0.12s ease;}',
      '.landing-auth-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.25);}',
      '.landing-auth-submit{margin-top:8px;padding:14px 18px;border:none;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-weight:600;font-size:1rem;cursor:pointer;box-shadow:0 18px 35px rgba(99,102,241,0.35);transition:transform 0.15s ease,box-shadow 0.15s ease;}',
      '.landing-auth-submit:hover{transform:translateY(-1px);box-shadow:0 22px 40px rgba(99,102,241,0.45);}',
      '.landing-auth-submit:disabled{opacity:0.6;cursor:not-allowed;box-shadow:none;}',
      '.landing-auth-error{min-height:20px;font-size:0.85rem;color:#f87171;}',
      '.landing-auth-helper{margin-top:12px;font-size:0.85rem;color:#94a3b8;}',
      '.landing-auth-helper a{color:#c4cfff;text-decoration:underline;text-underline-offset:3px;}',
      '.landing-auth-success{font-size:0.95rem;color:#34d399;margin-top:12px;}',
      '@media(max-width:640px){.landing-auth-modal{padding:28px 22px;border-radius:16px;}}'
    ].join('')
    document.head.appendChild(style)
  }

  function ensureModal(){
    createStyle()
    let overlay = document.getElementById('landing-auth-overlay')
    if (overlay) return overlay

    overlay = document.createElement('div')
    overlay.id = 'landing-auth-overlay'
    overlay.className = 'landing-auth-overlay'
    overlay.innerHTML = [
      '<div class="landing-auth-modal" role="dialog" aria-modal="true">',
        '<button type="button" class="landing-auth-close" aria-label="Schließen">×</button>',
        '<h2>Willkommen zurück</h2>',
        '<p class="subline">Melden Sie sich mit Ihren Zugangsdaten an, um Ihr Dashboard zu öffnen.</p>',
        '<form class="landing-auth-form" novalidate>',
          '<label class="landing-auth-label">E-Mail-Adresse<input required name="email" type="email" class="landing-auth-input" placeholder="kanzlei@example.de" autocomplete="email"></label>',
          '<label class="landing-auth-label">Passwort<input required name="password" type="password" class="landing-auth-input" placeholder="••••••••" autocomplete="current-password"></label>',
          '<div class="landing-auth-error" role="alert" aria-live="assertive"></div>',
          '<button type="submit" class="landing-auth-submit">Anmelden</button>',
          '<div class="landing-auth-success" aria-live="polite"></div>',
        '</form>',
        '<p class="landing-auth-helper">Noch kein Zugang? <a href="/register">Jetzt registrieren</a></p>',
      '</div>'
    ].join('')

    document.body.appendChild(overlay)

    const modal = overlay.querySelector('.landing-auth-modal')
    const closeBtn = overlay.querySelector('.landing-auth-close')
    const form = overlay.querySelector('form')
    const emailInput = overlay.querySelector('input[name="email"]')
    const passwordInput = overlay.querySelector('input[name="password"]')
    const errorBox = overlay.querySelector('.landing-auth-error')
    const successBox = overlay.querySelector('.landing-auth-success')

    function close(){
      overlay.removeAttribute('data-open')
      overlay.style.opacity = '0'
      setTimeout(() => { overlay.style.display = 'none' }, 180)
    }

    function open(){
      overlay.style.display = 'flex'
      requestAnimationFrame(() => {
        overlay.setAttribute('data-open', '1')
        overlay.style.opacity = '1'
      })
      setTimeout(() => emailInput && emailInput.focus(), 120)
    }

    overlay.addEventListener('click', (evt) => {
      if (evt.target === overlay) close()
    })
    closeBtn?.addEventListener('click', close)
    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'Escape' && overlay.getAttribute('data-open') === '1') close()
    })

    form?.addEventListener('submit', async (evt) => {
      evt.preventDefault()
      errorBox.textContent = ''
      successBox.textContent = ''

      const email = (emailInput?.value || '').trim()
      const password = (passwordInput?.value || '').trim()

      if (!email || !password) {
        errorBox.textContent = 'Bitte E-Mail und Passwort eingeben.'
        return
      }

      const submitButton = form.querySelector('.landing-auth-submit')
      if (submitButton) submitButton.disabled = true

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        })

        if (!response.ok) {
          throw new Error('Ungültige Zugangsdaten')
        }

        const data = await response.json()
        if (data?.success === false) {
          throw new Error(data?.error?.message || 'Login fehlgeschlagen')
        }

        try {
          const token = data?.token || data?.tokens?.access_token
          if (token) {
            localStorage.setItem('anwalts_auth_token', token)
            localStorage.setItem('access_token', token)
          }
          if (data?.user) {
            localStorage.setItem('anwalts_user', JSON.stringify(data.user))
          }
        } catch(_){}

        successBox.textContent = 'Erfolgreich angemeldet – weiter zum Dashboard...'
        setTimeout(() => {
          close()
          window.location.href = '/dashboard'
        }, 600)
      } catch (error) {
        errorBox.textContent = error?.message || 'Login fehlgeschlagen. Bitte erneut versuchen.'
      } finally {
        if (submitButton) submitButton.disabled = false
      }
    })

    overlay.__open = open
    overlay.__close = close
    return overlay
  }

  function ready(){
    if (typeof window.__ensureLandingAuthModal !== 'function') {
      window.__ensureLandingAuthModal = ensureModal
    }
    if (typeof window.openAuthModal !== 'function') {
      window.openAuthModal = function(){ ensureModal().__open() }
    }
    if (typeof window.closeAuthModal !== 'function') {
      window.closeAuthModal = function(){ ensureModal().__close() }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready)
  } else {
    ready()
  }
})()
