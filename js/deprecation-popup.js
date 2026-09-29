// ==========================================
// DEPRECATION POP-UP (verwijzing naar mwwvakdocent.nl)
// Geforceerde overlay; alleen te sluiten met de beheerderscode.
// Let op: de code-check is client-side en dient enkel als zachte drempel.
// ==========================================

(function () {
  const NEW_SITE_URL = 'https://mwwvakdocent.nl';
  const ADMIN_CODE = '1115';
  const STORAGE_KEY = 'mww-deprecation-bypass';

  function isBypassed() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function rememberBypass() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // sessionStorage niet beschikbaar; overlay sluit alleen voor deze pagina
    }
  }

  function showDeprecationPopup() {
    if (isBypassed() || document.getElementById('deprecationOverlay')) return;

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
      if (el !== overlay && el.tagName !== 'SCRIPT' && !el.hasAttribute('inert')) {
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

    // Escape blokkeren, focus binnen de dialoog houden en andere
    // (globale) sneltoetsen niet laten doorwerken naar de pagina.
    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
      } else if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length) {
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (!dialog.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
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
