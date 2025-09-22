// Lightweight auth modal fallback for static Framer exports
(function(){
  function createStyle(){
    if (document.getElementById('landing-auth-modal-style')) return
    const style = document.createElement('style')
    style.id = 'landing-auth-modal-style'
    style.textContent = [
      '.landing-auth-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,0.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:2147483646;opacity:0;transition:opacity 0.2s ease;}',
      '.landing-auth-overlay[data-open="1"]{display:flex;opacity:1;}',
      '.landing-auth-modal{position:relative;width:100%;max-width:500px;background:#ffffff;color:#0f172a;border-radius:20px;padding:36px 38px 32px;border:1px solid rgba(148,163,184,0.3);box-shadow:0 28px 72px rgba(15,23,42,0.25);font-family:"Inter",system-ui,-apple-system,sans-serif;}',
      '.landing-auth-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(148,163,184,0.35);background:#f8fafc;color:#0f172a;font-size:24px;line-height:34px;cursor:pointer;transition:background 0.12s ease,border-color 0.12s ease;}',
      '.landing-auth-close:hover{background:#e2e8f0;border-color:#94a3b8;}',
      '.landing-auth-modal h2{margin:0 48px 20px 0;font-size:1.9rem;font-weight:600;color:#0f172a;}',
      '.landing-auth-modal p.subline{margin:0 24px 28px 0;font-size:1rem;color:#475569;}',
      '.landing-auth-google{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:20px;padding:12px 16px;border-radius:12px;border:1px solid rgba(203,213,225,0.9);background:#ffffff;color:#0f172a;font-weight:500;font-size:0.95rem;cursor:pointer;transition:background 0.12s ease,box-shadow 0.12s ease;}',
      '.landing-auth-google:hover{background:#f8fafc;box-shadow:0 10px 24px rgba(15,23,42,0.08);}',
      '.landing-auth-google svg{width:20px;height:20px;}',
      '.landing-auth-divider{display:flex;align-items:center;gap:12px;margin-bottom:20px;color:#94a3b8;font-size:0.85rem;}',
      '.landing-auth-divider::before,.landing-auth-divider::after{content:"";flex:1;height:1px;background:rgba(203,213,225,0.9);}',
      '.landing-auth-form{display:grid;gap:16px;}',
      '.landing-auth-label{display:flex;flex-direction:column;font-size:0.9rem;color:#1e293b;gap:8px;}',
      '.landing-auth-input{padding:12px 14px;border-radius:12px;border:1px solid rgba(148,163,184,0.5);background:#ffffff;color:#0f172a;font-size:0.95rem;outline:none;transition:border-color 0.12s ease,box-shadow 0.12s ease;}',
      '.landing-auth-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.2);}',
      '.landing-auth-submit{margin-top:8px;padding:14px 18px;border:none;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-weight:600;font-size:1rem;cursor:pointer;box-shadow:0 18px 36px rgba(99,102,241,0.3);transition:transform 0.15s ease,box-shadow 0.15s ease;}',
      '.landing-auth-submit:hover{transform:translateY(-1px);box-shadow:0 22px 40px rgba(99,102,241,0.45);}',
      '.landing-auth-submit:disabled{opacity:0.6;cursor:not-allowed;box-shadow:none;}',
      '.landing-auth-error{min-height:20px;font-size:0.85rem;color:#dc2626;}',
      '.landing-auth-helper{margin-top:12px;font-size:0.85rem;color:#475569;}',
      '.landing-auth-helper a{color:#6366f1;text-decoration:underline;text-underline-offset:3px;}',
      '.landing-auth-success{font-size:0.95rem;color:#16a34a;margin-top:12px;}',
      '@media(max-width:640px){.landing-auth-modal{padding:28px 24px;border-radius:18px;}}'
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
        '<p class="subline">Melden Sie sich mit Ihren bestehenden ANWALTS.AI Zugangsdaten an oder nutzen Sie Google.</p>',
        '<button type="button" class="landing-auth-google" data-auth-google>',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>',
          '<span>Mit Google anmelden</span>',
        '</button>',
        '<div class="landing-auth-divider"><span>oder mit E-Mail</span></div>',
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
    const googleBtn = overlay.querySelector('[data-auth-google]')
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
          body: JSON.stringify({
            email,
            password,
            remember_me: false,
            csrf_token: 'landing-modal'
          })
        })

        if (!response.ok) {
          throw new Error('Ungültige Zugangsdaten')
        }

        const data = await response.json()
        if (data?.success === false || data?.error) {
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
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        try {
          window.location.href = '/auth/google/authorize'
        } catch (error) {
          console.warn('⚠️ Failed to start Google login', error)
        }
      })
    }
