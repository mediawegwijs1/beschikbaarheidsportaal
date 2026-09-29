// ==========================================
// DEPRECATION POP-UP (verwijzing naar mwwvakdocent.nl)
// Geforceerde full-screen overlay met geblurde achtergrond;
// alleen te sluiten met de beheerderscode.
// Styling wordt inline geïnjecteerd zodat de pop-up nooit afhankelijk is
// van een (mogelijk oud/gecachet) stylesheet.
// Let op: de code-check is client-side en dient enkel als zachte drempel.
// ==========================================

(function () {
  const NEW_SITE_URL = 'https://mwwvakdocent.nl';
  const ADMIN_CODE = '1115';
  const STORAGE_KEY = 'mww-deprecation-bypass';

  const CSS = `
    html.deprecation-lock, html.deprecation-lock body { overflow: hidden !important; }
    #deprecationOverlay {
      position: fixed !important; inset: 0 !important; top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw; height: 100vh; height: 100dvh;
      z-index: 2147483647 !important;
      display: flex !important; align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box;
      background: rgba(15, 23, 42, 0.55);
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
      font-family: inherit;
      animation: deprecationFade .2s ease-out;
    }
    @keyframes deprecationFade { from { opacity: 0; } to { opacity: 1; } }
    #deprecationOverlay * { box-sizing: border-box; }
    #deprecationOverlay .deprecation-dialog {
      width: 100%; max-width: 440px; max-height: calc(100vh - 32px); overflow-y: auto;
      background: #fff; border-radius: 24px; padding: 32px 28px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,.45);
      text-align: center; color: #0f172a;
    }
    #deprecationOverlay .deprecation-icon {
      width: 56px; height: 56px; margin: 0 auto 16px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      background: #ecfeff; color: #0891b2; font-size: 24px;
    }
    #deprecationOverlay .deprecation-title { margin: 0 0 8px; font-size: 22px; font-weight: 800; }
    #deprecationOverlay .deprecation-text { margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #475569; }
    #deprecationOverlay .deprecation-text strong { color: #0f172a; }
    #deprecationOverlay .deprecation-btn-primary {
      display: block; width: 100%; padding: 14px 16px; border-radius: 14px;
      background: #059669; color: #fff !important; font-weight: 700; font-size: 15px;
      text-decoration: none; box-shadow: 0 10px 20px -8px rgba(5,150,105,.6);
      transition: background .15s;
    }
    #deprecationOverlay .deprecation-btn-primary:hover { background: #047857; }
    #deprecationOverlay .deprecation-btn-link {
      margin-top: 14px; background: none; border: 0; cursor: pointer;
      color: #64748b; font-size: 12px; text-decoration: underline; font-family: inherit;
    }
    #deprecationOverlay .deprecation-btn-link:hover { color: #334155; }
    #deprecationOverlay .deprecation-code-form {
      margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: left;
    }
    #deprecationOverlay .deprecation-code-form[hidden] { display: none !important; }
    #deprecationOverlay .deprecation-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; color: #334155; }
    #deprecationOverlay .deprecation-code-row { display: flex; gap: 8px; }
    #deprecationOverlay .deprecation-input {
      flex: 1; min-width: 0; padding: 10px 12px; font-size: 14px;
      border: 1px solid #cbd5e1; border-radius: 12px; background: #f8fafc; outline: none;
    }
    #deprecationOverlay .deprecation-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.25); background: #fff; }
    #deprecationOverlay .deprecation-btn-secondary {
      padding: 10px 16px; border: 0; border-radius: 12px; cursor: pointer;
      background: #1e293b; color: #fff; font-weight: 700; font-size: 13px; font-family: inherit;
    }
    #deprecationOverlay .deprecation-btn-secondary:hover { background: #0f172a; }
    #deprecationOverlay .deprecation-error { min-height: 1em; margin: 8px 0 0; font-size: 12px; font-weight: 600; color: #e11d48; }
  `;

  function isBypassed() {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function rememberBypass() {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* niet beschikbaar */ }
  }

  function injectStyles() {
    if (document.getElementById('deprecationStyles')) return;
    const style = document.createElement('style');
    style.id = 'deprecationStyles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function showDeprecationPopup() {
    if (isBypassed() || document.getElementById('deprecationOverlay')) return;

    injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'deprecationOverlay';
    overlay.className = 'deprecation-overlay';
    overlay.innerHTML = `
      <div class="deprecation-dialog" role="dialog" aria-modal="true"
           aria-labelledby="deprecationTitle" aria-describedby="deprecationText">
        <div class="deprecation-icon" aria-hidden="true"><i class="fa-solid fa-circle-info"></i></div>
        <h2 id="deprecationTitle" class="deprecation-title">Deze website is verhuisd</h2>
        <p id="deprecationText" class="deprecation-text">
          Deze website wordt niet meer onderhouden. Ga naar onze nieuwe website:
          <strong>mwwvakdocent.nl</strong>
        </p>
        <a id="deprecationGoBtn" class="deprecation-btn-primary" href="${NEW_SITE_URL}">
          Ga naar mwwvakdocent.nl
        </a>
        <button type="button" id="deprecationCloseBtn" class="deprecation-btn-link">
          Sluiten / oude website gebruiken
        </button>
        <form id="deprecationCodeForm" class="deprecation-code-form" hidden novalidate>
          <label for="deprecationCodeInput" class="deprecation-label">Beheerderscode</label>
          <div class="deprecation-code-row">
            <input id="deprecationCodeInput" class="deprecation-input" type="password"
                   inputmode="numeric" autocomplete="off" maxlength="10"
                   aria-describedby="deprecationCodeError" />
            <button type="submit" class="deprecation-btn-secondary">Bevestigen</button>
          </div>
          <p id="deprecationCodeError" class="deprecation-error" role="alert"></p>
        </form>
      </div>
    `;

    // Blokkeer interactie met de onderliggende pagina
    const blocked = [];
    Array.from(document.body.children).forEach(el => {
      if (el.tagName !== 'SCRIPT' && !el.hasAttribute('inert')) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
        blocked.push(el);
      }
    });
    document.body.appendChild(overlay);
    document.documentElement.classList.add('deprecation-lock');

    const dialog = overlay.querySelector('.deprecation-dialog');
    const goBtn = overlay.querySelector('#deprecationGoBtn');
    const closeBtn = overlay.querySelector('#deprecationCloseBtn');
    const form = overlay.querySelector('#deprecationCodeForm');
    const input = overlay.querySelector('#deprecationCodeInput');
    const error = overlay.querySelector('#deprecationCodeError');

    function getFocusable() {
      return Array.from(dialog.querySelectorAll('a[href], button, input'))
        .filter(el => !el.closest('[hidden]'));
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
      } else if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length) {
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
          } else if (!dialog.contains(document.activeElement)) {
            e.preventDefault(); first.focus();
          }
        }
      }
      e.stopImmediatePropagation();
    }

    function onFocusIn(e) {
      if (!overlay.contains(e.target)) goBtn.focus();
    }

    window.addEventListener('keydown', onKeydown, true);
    document.addEventListener('focusin', onFocusIn);

    closeBtn.addEventListener('click', () => {
      form.hidden = false;
      error.textContent = '';
      input.focus();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim() === ADMIN_CODE) {
        rememberBypass();
        window.removeEventListener('keydown', onKeydown, true);
        document.removeEventListener('focusin', onFocusIn);
        blocked.forEach(el => {
          el.removeAttribute('inert');
          el.removeAttribute('aria-hidden');
        });
        document.documentElement.classList.remove('deprecation-lock');
        overlay.remove();
      } else {
        error.textContent = 'Onjuiste code. Probeer het opnieuw.';
        input.value = '';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      }
    });

    goBtn.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showDeprecationPopup);
  } else {
    showDeprecationPopup();
  }
})();
