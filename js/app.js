// ==========================================
// BOOTSTRAP, PROFIEL, PLANNER & ADMIN LOGICA (V2.1.1)
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
  startClock();
  detectAppVersion();
  loadDocentenList();
  loadSchoolsDatabase();
  setupGlobalKeydown();
  initAllDatepickers();
  registerServiceWorker();
});

// Leest de actieve Service Worker-cache uit en toont het versienummer linksonder
async function detectAppVersion() {
  const label = document.getElementById('appVersionLabel');
  if (!label) return;

  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      const activeCache = keys.find(k => k.startsWith('mediawegwijs-'));
      if (activeCache) {
        label.innerText = activeCache.replace('mediawegwijs-', '').toUpperCase();
        return;
      }
    } catch (e) {
      console.warn("Kon cache-versie niet uitlezen", e);
    }
  }
  label.innerText = "V2.1.1";
}

// Automatische reload bij een nieuwe Service Worker cache-update
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        }
      });
    }).catch(err => console.warn('SW registratie overgeslagen:', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

function initFlatpickrInstance(el, customOpts = {}) {
  if (!el) return null;
  return flatpickr(el, {
    locale: "nl",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d-m-Y",
    firstDayOfWeek: 1,
    disable: [
      function(date) {
        return (date.getDay() === 0 || date.getDay() === 6);
      }
    ],
    ...customOpts
  });
}

function initAllDatepickers() {
  initFlatpickrInstance(document.getElementById('inputPlanDate'));
  initFlatpickrInstance(document.getElementById('inputOtStart'));
  initFlatpickrInstance(document.getElementById('inputOtEind'));
}

function startClock() {
  const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  const update = () => {
    const now = new Date();
    const dayName = days[now.getDay()];
    const dayNum = now.getDate();
    const monthName = months[now.getMonth()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('liveClock');
    if (clockEl) clockEl.innerText = `${dayName} ${dayNum} ${monthName}, ${hours}:${minutes}`;
  };
  update();
  setInterval(update, 1000);
}

function handleClockClick() {
  clockClicks++;
  clearTimeout(clockTimer);
  clockTimer = setTimeout(() => { clockClicks = 0; }, 2000);

  if (clockClicks >= 5) {
    clockClicks = 0;
    localStorage.clear();
    sessionStorage.clear();
    alert("🔄 Cache & data geleegd! Pagina wordt vernieuwd.");
    window.location.href = window.location.pathname + '?t=' + Date.now();
  }
}

function openPatchNotesModal() { document.getElementById('modalPatchNotes').classList.remove('hidden'); }
function closePatchNotesModal() { document.getElementById('modalPatchNotes').classList.add('hidden'); }

async function loadDocentenList() {
  const loadingBanner = document.getElementById('loadingStatusBanner');
  const gridContainer = document.getElementById('docentenGridContainer');

  if (loadingBanner) loadingBanner.classList.remove('hidden');
  if (gridContainer) gridContainer.classList.add('hidden');

  const res = await apiCall("", "GET", { action: "getDocentenList" });
  if (res.success) docentenCache = res.docenten;

  if (loadingBanner) loadingBanner.classList.add('hidden');
  if (gridContainer) gridContainer.classList.remove('hidden');
  renderDocentenButtons(docentenCache);
}

async function loadSchoolsDatabase() {
  const res = await apiCall("", "GET", { action: "getSchoolsList" });
  if (res.success && res.schools) schoolsCache = res.schools;
}

function filterDocenten() {
  const input = document.getElementById('docentSearchInput').value.toLowerCase().trim();
  if (input.length === 0) {
    renderDocentenButtons(docentenCache);
    return;
  }
  renderDocentenButtons(docentenCache.filter(d => d.naam.toLowerCase().includes(input)));
}

function renderDocentenButtons(list) {
  const container = document.getElementById('docentenButtonsGrid');
  if (!container) return;
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center w-full">Geen namen gevonden</div>`;
    return;
  }

  list.forEach(docent => {
    const btn = document.createElement('button');
    btn.type = "button";
    const isPlanner = docent.isPlanner;
    btn.className = `font-semibold text-xs md:text-sm px-3.5 py-2.5 rounded-xl border transition active:scale-95 shadow-sm ${
      isPlanner 
        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200' 
        : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 border-slate-200/80'
    }`;
    btn.innerHTML = `${docent.naam} ${isPlanner ? '<span class="text-[10px] text-amber-600 ml-1 font-bold">(Planner)</span>' : ''}`;
    btn.onclick = () => selectDocent(docent);
    container.appendChild(btn);
  });
}

function setupGlobalKeydown() {
  document.addEventListener('keydown', (e) => {
    const modalPin = document.getElementById('modalPin');
    if (modalPin && !modalPin.classList.contains('hidden')) {
      if (e.key >= '0' && e.key <= '9') pressPinKey(e.key);
      else if (e.key === 'Backspace') deletePinKey();
      else if (e.key === 'Escape') closePinModal();
    }
  });
}

function selectDocent(docent) {
  document.getElementById('docentSearchInput').value = docent.naam;
  currentDocent = { ...docent };

  if (docent.needsPinSetup) {
    openPinModal("Kies een 4-cijferige pincode", "Onthoud deze goed voor volgende keer", async (pin) => {
      showPinLoading(true);
      const res = await apiCall("", "POST", { action: "setInitialPin", docentId: docent.id, newPin: pin });
      showPinLoading(false);

      if (res.success) {
        currentPin = pin;
        currentDocent.needsPinSetup = false;
        closePinModal();
        if (currentDocent.isPlanner) initPlannerView();
        else openProfileModal(false);
      } else {
        showPinError(res.error || "Fout bij instellen.");
      }
    });
  } else {
    openPinModal("Voer je pincode in", `Welkom terug, ${docent.naam}`, async (pin) => {
      showPinLoading(true);
      const res = await apiCall("", "GET", { action: "getDocentData", docentId: docent.id, pin: pin });
      showPinLoading(false);

      if (res.success) {
        currentPin = pin;
        currentDocent = { ...currentDocent, ...res.docent };
        closePinModal();

        if (currentDocent.isPlanner) {
          initPlannerView();
        } else if (!currentDocent.onboardingKlaar) {
          openProfileModal(false);
        } else {
          initCalendarView();
        }
      } else {
        showPinError("Onjuiste pincode. Probeer opnieuw.");
      }
    });
  }
}

function openPinModal(title, subtitle, callback) {
  enteredPin = "";
  pinCallback = callback;
  document.getElementById('pinModalTitle').innerText = title;
  document.getElementById('pinModalSubtitle').innerText = subtitle;
  document.getElementById('pinErrorMsg').classList.add('hidden');
  showPinLoading(false);
  updatePinDots();
  document.getElementById('modalPin').classList.remove('hidden');
}

function closePinModal() {
  document.getElementById('modalPin').classList.add('hidden');
  enteredPin = "";
  showPinLoading(false);
}

function showPinLoading(isLoading) {
  document.getElementById('pinKeypadContainer').classList.toggle('hidden', isLoading);
  document.getElementById('pinLoadingSpinner').classList.toggle('hidden', !isLoading);
  document.getElementById('pinLoadingSpinner').classList.toggle('flex', isLoading);
}

function pressPinKey(digit) {
  if (enteredPin.length < 4) {
    enteredPin += digit;
    updatePinDots();
    if (enteredPin.length === 4 && pinCallback) {
      setTimeout(() => pinCallback(enteredPin), 60);
    }
  }
}

function deletePinKey() {
  if (enteredPin.length > 0) {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDots();
  }
}

function clearPinKey() {
  enteredPin = "";
  updatePinDots();
}

function updatePinDots() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, index) => {
    if (index < enteredPin.length) {
      dot.classList.add('bg-slate-900', 'border-slate-900');
      dot.classList.remove('bg-transparent', 'border-slate-300');
    } else {
      dot.classList.remove('bg-slate-900', 'border-slate-900');
      dot.classList.add('bg-transparent', 'border-slate-300');
    }
  });
}

function showPinError(msg) {
  const el = document.getElementById('pinErrorMsg');
  el.innerText = msg;
  el.classList.remove('hidden');
  enteredPin = "";
  updatePinDots();
}

// ==========================================
// ONBOARDING & VOORKEUREN
// ==========================================

function toggleOnboardingRegularFields() {
  const isAlleenTour = document.querySelector('input[name="alleenOnTour"]:checked')?.value === 'Ja';
  document.getElementById('wrapperRegularQuestions').style.display = isAlleenTour ? 'none' : 'block';
}

function getMonthLabelForRange(vanStr, totStr) {
  if (!vanStr || !totStr) return "";
  const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  const d1 = new Date(vanStr);
  const d2 = new Date(totStr);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "";

  const m1 = months[d1.getMonth()];
  const m2 = months[d2.getMonth()];
  return m1 === m2 ? `${m1} '${String(d1.getFullYear()).slice(-2)}` : `${m1} - ${m2} '${String(d2.getFullYear()).slice(-2)}`;
}

function openProfileModal(isEdit = false) {
  const modal = document.getElementById('modalOnboarding');
  const form = document.getElementById('onboardingForm');
  const title = document.getElementById('onboardingTitle');
  const subtitle = document.getElementById('onboardingSubtitle');
  const btnCancel = document.getElementById('btnCancelProfile');

  form.reset();
  const todayIso = normalizeDateStr(new Date());

  if (isEdit) {
    title.innerText = "Voorkeuren Aanpassen";
    subtitle.innerText = "Pas je actieve periodes en instellingen aan.";
    btnCancel.classList.remove('hidden');
    
    if (currentDocent) {
      setRadioGroup('alleenOnTour', currentDocent.alleenOnTour || "Nee");
      document.getElementById('obWerkDagen').value = currentDocent.werkDagenPwk || "3 dagen";
      setRadioGroup('rijbewijs', currentDocent.rijbewijs || "Ja");
      setRadioGroup('auto', currentDocent.auto || "Ja");
      
      ghostPeriodesData = (currentDocent.vastePeriodes || [])
        .filter(p => !p.tot || p.tot >= todayIso)
        .map(p => ({ ...p, active: true }));
    }
  } else {
    title.innerText = "Welkom! Even kennismaken 👋";
    subtitle.innerText = "Geef je voorkeuren door voor het schooljaar.";
    btnCancel.classList.add('hidden');
    setRadioGroup('alleenOnTour', "Nee");
    ghostPeriodesData = [];
  }

  renderGhostPeriodes();
  toggleOnboardingRegularFields();
  modal.classList.remove('hidden');
}

function closeOnboardingModal() {
  document.getElementById('modalOnboarding').classList.add('hidden');
}

function renderGhostPeriodes() {
  const container = document.getElementById('periodesGhostContainer');
  container.innerHTML = "";

  const rows = [...ghostPeriodesData];
  if (rows.length === 0 || rows[rows.length - 1].active) {
    rows.push({ active: false, van: "", tot: "", dagen: [], isNew: true, id: 'PER-' + Utilities_randomId() });
  }

  rows.forEach((p, idx) => {
    const isAct = p.active;
    const monthBadgeText = getMonthLabelForRange(p.van, p.tot);
    const isPendingDelete = p.status === "PENDING_DELETE";
    const isPendingEdit = p.status === "PENDING_EDIT";

    const div = document.createElement('div');
    div.className = `p-3.5 rounded-2xl border transition ${isAct ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-100/70 border-slate-200 opacity-60'} space-y-2.5`;

    let statusBadge = "";
    if (isPendingDelete) {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 animate-pulse">⏳ Verwijdering in behandeling</span>`;
    } else if (isPendingEdit) {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 animate-pulse">⏳ Wijziging in behandeling</span>`;
    }

    div.innerHTML = `
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div class="flex items-center gap-2">
          <input type="checkbox" onchange="toggleGhostRow(${idx}, this.checked)" ${isAct ? 'checked' : ''} ${p.id && !p.isNew ? 'disabled' : ''} class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
          <span class="font-extrabold text-xs text-slate-800">Periode ${idx + 1}</span>
          ${monthBadgeText ? `<span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">${monthBadgeText}</span>` : ''}
          ${statusBadge}
        </div>

        ${isAct && p.id && !p.isNew ? `
          <div class="flex items-center gap-1">
            ${(!isPendingDelete && !isPendingEdit) ? `
              <button type="button" onclick="requestEditPeriod('${p.id}')" class="text-slate-500 hover:text-amber-600 p-1 rounded-lg hover:bg-slate-100 transition" title="Wijziging aanvragen"><i class="fa-solid fa-pencil text-xs"></i></button>
              <button type="button" onclick="requestDeletePeriod('${p.id}')" class="text-slate-500 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-100 transition" title="Verwijdering aanvragen"><i class="fa-solid fa-trash-can text-xs"></i></button>
            ` : ''}
          </div>
        ` : (isAct ? `
          <button type="button" onclick="deleteLocalGhostRow(${idx})" class="text-rose-500 hover:text-rose-700 p-1 transition" title="Verwijder vak"><i class="fa-solid fa-trash-can text-xs"></i></button>
        ` : '')}
      </div>

      <div class="grid grid-cols-2 gap-2 ${isAct && !isPendingDelete ? '' : 'pointer-events-none opacity-50'}">
        <div>
          <span class="text-[10px] font-bold text-slate-500 block mb-1">Van datum:</span>
          <input type="text" id="ghostVan_${idx}" value="${p.van || ''}" placeholder="Kies datum" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer" />
        </div>
        <div>
          <span class="text-[10px] font-bold text-slate-500 block mb-1">Tot en met:</span>
          <input type="text" id="ghostTot_${idx}" value="${p.tot || ''}" placeholder="Kies datum" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer" />
        </div>
      </div>

      <div class="pt-1 flex flex-wrap items-center justify-between gap-1.5 ${isAct && !isPendingDelete ? '' : 'pointer-events-none opacity-50'}">
        <span class="text-[11px] font-bold text-slate-500">Vaste dagen:</span>
        <div class="flex items-center gap-1">
          ${['Ma', 'Di', 'Wo', 'Do', 'Vr'].map(d => `
            <label class="text-xs font-bold px-2.5 py-1 rounded-lg border transition ${isAct ? 'cursor-pointer' : ''} ${(p.dagen || []).includes(d) ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 hover:bg-slate-200 text-slate-700 border-slate-200'}">
              <input type="checkbox" onchange="toggleGhostDay(${idx}, '${d}', this.checked)" ${(p.dagen || []).includes(d) ? 'checked' : ''} ${isAct ? '' : 'disabled'} class="hidden" /> ${d}
            </label>
          `).join('')}
        </div>
      </div>
    `;
    container.appendChild(div);

    initFlatpickrInstance(document.getElementById(`ghostVan_${idx}`), {
      defaultDate: p.van || null,
      onChange: (selectedDates, dateStr) => {
        updateGhostRowData(idx, 'van', dateStr);
      }
    });

    initFlatpickrInstance(document.getElementById(`ghostTot_${idx}`), {
      defaultDate: p.tot || null,
      onChange: (selectedDates, dateStr) => {
        updateGhostRowData(idx, 'tot', dateStr);
      }
    });
  });
}

function toggleGhostRow(idx, checked) {
  if (idx >= ghostPeriodesData.length) {
    ghostPeriodesData.push({ active: checked, van: "", tot: "", dagen: [], isNew: true, id: 'PER-' + Utilities_randomId() });
  } else {
    ghostPeriodesData[idx].active = checked;
  }
  renderGhostPeriodes();
}

function updateGhostRowData(idx, key, val) {
  if (ghostPeriodesData[idx]) {
    ghostPeriodesData[idx][key] = val;
    renderGhostPeriodes();
  }
}

function toggleGhostDay(idx, day, checked) {
  if (ghostPeriodesData[idx]) {
    let arr = ghostPeriodesData[idx].dagen || [];
    if (checked && !arr.includes(day)) arr.push(day);
    else if (!checked) arr = arr.filter(d => d !== day);
    ghostPeriodesData[idx].dagen = arr;
    renderGhostPeriodes();
  }
}

function deleteLocalGhostRow(idx) {
  ghostPeriodesData.splice(idx, 1);
  renderGhostPeriodes();
}

async function requestDeletePeriod(periodId) {
  if (!confirm("Weet je zeker dat je een aanvraag wilt indienen om deze hele vaste periode te verwijderen?")) return;
  const res = await apiCall("", "POST", { action: "requestPeriodAction", docentId: currentDocent.id, pin: currentPin, actionType: "REQUEST_DELETE", periodId: periodId });
  if (res.success) {
    alert("Aanvraag verstuurd ter goedkeuring van de planner.");
    const p = (currentDocent.vastePeriodes || []).find(x => x.id === periodId);
    if (p) p.status = "PENDING_DELETE";
    renderGhostPeriodes();
  } else {
    alert("Fout: " + res.error);
  }
}

async function requestEditPeriod(periodId) {
  const p = (currentDocent.vastePeriodes || []).find(x => x.id === periodId);
  if (!p) return;

  const newVan = prompt("Nieuwe startdatum (YYYY-MM-DD):", p.van);
  if (!newVan) return;
  const newTot = prompt("Nieuwe einddatum (YYYY-MM-DD):", p.tot);
  if (!newTot) return;

  const res = await apiCall("", "POST", { action: "requestPeriodAction", docentId: currentDocent.id, pin: currentPin, actionType: "REQUEST_EDIT", periodId: periodId, periodData: { van: newVan, tot: newTot, dagen: p.dagen } });
  if (res.success) {
    alert("Wijzigingsaanvraag verstuurd naar de planner.");
    p.status = "PENDING_EDIT";
    renderGhostPeriodes();
  } else {
    alert("Fout: " + res.error);
  }
}

function generateDatesFromGhostPeriodes(periodes) {
  const entries = [];
  const dayNamesMap = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
  const seenDates = new Set();

  periodes.forEach(p => {
    if (!p.active || !p.van || !p.tot || !p.dagen || p.dagen.length === 0 || p.status === 'PENDING_DELETE') return;

    let curr = new Date(p.van);
    const end = new Date(p.tot);

    while (curr <= end) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dayShort = dayNamesMap[dayOfWeek];
        if (p.dagen.includes(dayShort)) {
          const iso = normalizeDateStr(curr);
          if (!seenDates.has(iso)) {
            seenDates.add(iso);
            entries.push({ datum: iso, status: "JA", forceApproved: true });
          }
        }
      }
      curr.setDate(curr.getDate() + 1);
    }
  });

  return entries;
}

async function handleOnboardingSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveOnboarding');
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Opslaan...`;
  btn.disabled = true;

  const isAlleenTour = getRadioGroup('alleenOnTour') === 'Ja';
  
  const activePeriodes = ghostPeriodesData
    .filter(p => p.active && p.van && p.tot)
    .map(p => ({
      id: p.id || 'PER-' + Utilities_randomId(),
      active: true,
      van: p.van,
      tot: p.tot,
      dagen: p.dagen || [],
      status: p.status || 'ACTIVE'
    }));

  const payloadData = {
    alleenOnTour: isAlleenTour ? 'Ja' : 'Nee',
    werkDagenPwk: isAlleenTour ? '' : document.getElementById('obWerkDagen').value,
    vastePeriodes: isAlleenTour ? [] : activePeriodes,
    rijbewijs: getRadioGroup('rijbewijs'),
    auto: getRadioGroup('auto')
  };

  const dateEntries = !isAlleenTour ? generateDatesFromGhostPeriodes(activePeriodes) : [];

  const res = await apiCall("", "POST", {
    action: "submitOnboarding",
    docentId: currentDocent.id,
    pin: currentPin,
    formData: payloadData,
    entries: dateEntries
  });

  btn.innerHTML = `Opslaan`;
  btn.disabled = false;

  if (res.success) {
    currentDocent = { ...currentDocent, ...payloadData, onboardingKlaar: true };
    
    dateEntries.forEach(entry => {
      availabilityCache[entry.datum] = { datum: entry.datum, status: "JA", goedkeuring: "GOEDGEKEURD" };
    });

    closeOnboardingModal();
    initCalendarView();
  } else {
    alert("Fout bij opslaan: " + res.error);
  }
}

function getRadioGroup(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}
function setRadioGroup(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

// ==========================================
// PLANNER DASHBOARD FUNCTIES
// ==========================================

async function initPlannerView() {
  document.getElementById('viewLanding').classList.add('hidden');
  document.getElementById('viewCalendar').classList.add('hidden');
  document.getElementById('landingFooterBar').classList.add('hidden');
  document.getElementById('viewPlannerDashboard').classList.remove('hidden');
  document.getElementById('viewPlannerDashboard').classList.add('flex');
  
  document.getElementById('headerUserSection').classList.remove('hidden');
  document.getElementById('headerDocentName').innerText = `${currentDocent.naam} (Planner)`;
  document.getElementById('btnHeaderPreferences').classList.add('hidden');
  document.getElementById('headerRoleBadge').className = "w-2 h-2 rounded-full bg-amber-500 animate-pulse";
  document.getElementById('btnHeaderAdmin').classList.remove('hidden');

  plannerCurrentDate = new Date();
  setPlannerViewMode('3weeks');
  await loadAdminData();
}

function toggleFilterOnlyGaten() {
  filterOnlyGaten = !filterOnlyGaten;
  const btn = document.getElementById('btnFilterOnlyGaten');
  const text = document.getElementById('textFilterOnlyGaten');

  if (filterOnlyGaten) {
    btn.className = "w-full py-1.5 px-2 rounded-xl border border-rose-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition bg-rose-500 text-white shadow-sm";
    text.innerText = "Filter actief (Alleen gaten)";
  } else {
    btn.className = "w-full py-1.5 px-2 rounded-xl border border-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition bg-white text-slate-700 hover:bg-slate-100 shadow-sm";
    text.innerText = "Toon alleen open gaten";
  }
  renderPlannerGrid();
}

function setPlannerViewMode(mode) {
  plannerViewMode = mode;
  document.getElementById('btnPlanView3Weeks').className = mode === '3weeks' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
  document.getElementById('btnPlanViewMonth').className = mode === 'month' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
  document.getElementById('btnPlanViewWeek').className = mode === 'week' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
  renderPlannerGrid();
}

function changePlannerPeriod(delta) {
  if (plannerViewMode === 'month') {
    plannerCurrentDate.setMonth(plannerCurrentDate.getMonth() + delta);
  } else if (plannerViewMode === 'week') {
    plannerCurrentDate.setDate(plannerCurrentDate.getDate() + (delta * 7));
  } else {
    plannerCurrentDate.setDate(plannerCurrentDate.getDate() + (delta * 21));
  }
  renderPlannerGrid();
}

function renderPlannerGrid() {
  const grid = document.getElementById('plannerDaysGrid');
  grid.innerHTML = "";

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayIso = normalizeDateStr(now);

  if (plannerViewMode === '3weeks') {
    const curr = new Date(plannerCurrentDate);
    const distanceToMonday = (curr.getDay() + 6) % 7;
    const startMonday = new Date(curr);
    startMonday.setDate(curr.getDate() - distanceToMonday);

    const endFriday = new Date(startMonday);
    endFriday.setDate(startMonday.getDate() + 25);

    const optD = { day: 'numeric', month: 'short' };
    document.getElementById('plannerPeriodTitle').innerText = `${startMonday.toLocaleDateString('nl-NL', optD)} - ${endFriday.toLocaleDateString('nl-NL', optD)}`;

    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 5; d++) {
        const dayDate = new Date(startMonday);
        dayDate.setDate(startMonday.getDate() + (w * 7) + d);
        const isoDate = normalizeDateStr(dayDate);
        renderPlannerDayCell(grid, isoDate, `${dayDate.getDate()} ${dayDate.toLocaleDateString('nl-NL', { month: 'short' })}`, isoDate === todayIso);
      }
    }
  } else if (plannerViewMode === 'month') {
    const year = plannerCurrentDate.getFullYear();
    const month = plannerCurrentDate.getMonth();
    document.getElementById('plannerPeriodTitle').innerText = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(plannerCurrentDate);

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;
    const leadingEmpty = startDayOfWeek <= 4 ? startDayOfWeek : 0;

    for (let i = 0; i < leadingEmpty; i++) grid.innerHTML += `<div class="h-28 bg-slate-50/50 rounded-xl border border-transparent"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dObj = new Date(year, month, day);
      if (dObj.getDay() === 0 || dObj.getDay() === 6) continue;
      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      renderPlannerDayCell(grid, isoDate, day, isoDate === todayIso);
    }
  } else {
    const curr = new Date(plannerCurrentDate);
    const distanceToMonday = (curr.getDay() + 6) % 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - distanceToMonday);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const optD = { day: 'numeric', month: 'short' };
    document.getElementById('plannerPeriodTitle').innerText = `${monday.toLocaleDateString('nl-NL', optD)} - ${friday.toLocaleDateString('nl-NL', optD)}`;

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const isoDate = normalizeDateStr(dayDate);
      renderPlannerDayCell(grid, isoDate, `${dayDate.getDate()} ${dayDate.toLocaleDateString('nl-NL', { month: 'short' })}`, isoDate === todayIso);
    }
  }
}

function renderPlannerDayCell(container, isoDate, label, isToday = false) {
  const normalizedIso = normalizeDateStr(isoDate);
  let plans = (adminData.planning || []).filter(p => normalizeDateStr(p.datum) === normalizedIso);

  if (filterOnlyGaten) {
    plans = plans.filter(p => (p.toegewezenDocentIDs || []).length < p.aantalNodig);
  }

  const cell = document.createElement('div');
  const todayStyle = isToday ? 'ring-2 ring-sky-400 ring-offset-1 border-sky-400 bg-sky-50/40' : '';
  cell.className = `h-32 md:h-36 p-2 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 ${todayStyle} transition flex flex-col justify-between overflow-hidden`;

  let plansHtml = "";
  plans.forEach(plan => {
    const assignedCount = (plan.toegewezenDocentIDs || []).length;
    const total = plan.aantalNodig;
    const isComplete = assignedCount >= total;
    const isPartial = assignedCount > 0 && assignedCount < total;

    let badgeStyle = isComplete ? "bg-emerald-50 border-emerald-200 text-emerald-900" : (isPartial ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-rose-50 border-rose-200 text-rose-900 animate-pulse");

    plansHtml += `
      <div onclick="event.stopPropagation(); openSlotManagerModal('PLANNING', '${plan.planningId}')" class="p-1.5 rounded-lg border text-[10px] cursor-pointer transition flex items-center justify-between ${badgeStyle}">
        <span class="font-extrabold truncate flex-1">🏫 ${plan.schoolNaam}</span>
        <span class="font-extrabold px-1.5 py-0.2 rounded text-[9px] ${isComplete ? 'bg-emerald-600 text-white' : (isPartial ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white')}">${assignedCount}/${total}</span>
      </div>
    `;
  });

  cell.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="font-extrabold text-xs text-slate-700 flex items-center gap-1">
        <span>${label}</span>
        ${isToday ? '<span class="text-[8px] bg-sky-500 text-white px-1 py-0.2 rounded-full font-bold">Vandaag</span>' : ''}
      </span>
      <button onclick="quickAddSchoolToDate('${normalizedIso}')" title="School inplannen" class="w-5 h-5 rounded-md bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center text-[10px] text-slate-500"><i class="fa-solid fa-plus"></i></button>
    </div>
    <div class="flex-1 overflow-y-auto custom-scrollbar space-y-1 my-1">
      ${plansHtml || (filterOnlyGaten ? '<span class="text-[10px] text-slate-300 block text-center pt-3">-</span>' : '<span class="text-[10px] text-slate-300 block text-center pt-3">Geen lessen</span>')}
    </div>
  `;
  container.appendChild(cell);
}

function quickAddSchoolToDate(isoDate) {
  const norm = normalizeDateStr(isoDate);
  const input = document.getElementById('inputPlanDate');
  
  if (input && input._flatpickr) {
    input._flatpickr.setDate(norm, true);
  } else if (input) {
    input.value = norm;
  }
  
  openAddSchoolPlanningModal(true);
}

function renderPlannerGatenSidebar() {
  const container = document.getElementById('plannerGatenList');
  if (!container) return;
  container.innerHTML = "";

  const schoolQuery = (document.getElementById('filterGatenSchool')?.value || '').toLowerCase().trim();
  const periodFilter = document.getElementById('filterGatenPeriod')?.value || 'all';
  const typeFilter = document.getElementById('filterGatenType')?.value || 'all';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let gaten = (adminData.planning || []).filter(p => {
    const assigned = (p.toegewezenDocentIDs || []).length;
    const total = p.aantalNodig;
    if (assigned >= total) return false;

    if (schoolQuery && !p.schoolNaam.toLowerCase().includes(schoolQuery)) return false;
    if (typeFilter === 'empty' && assigned > 0) return false;
    if (typeFilter === 'partial' && assigned === 0) return false;

    const pDate = new Date(p.datum + "T00:00:00");
    const diffDays = Math.round((pDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return false;

    if (periodFilter === 'week' && diffDays > 7) return false;
    if (periodFilter === '1m' && diffDays > 30) return false;
    if (periodFilter === '2m' && diffDays > 60) return false;
    if (periodFilter === '3m' && diffDays > 90) return false;

    return true;
  });

  const badgeGaten = document.getElementById('badgeGatenCount');
  if (badgeGaten) badgeGaten.innerText = gaten.length;

  if (gaten.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">Geen openstaande gaten gevonden.</div>`;
    return;
  }

  gaten.sort((a, b) => a.datum.localeCompare(b.datum));

  gaten.forEach(g => {
    const assigned = (g.toegewezenDocentIDs || []).length;
    const total = g.aantalNodig;
    const div = document.createElement('div');
    div.className = "p-2.5 bg-rose-50/60 hover:bg-rose-100/80 rounded-xl border border-rose-200 text-xs cursor-pointer transition flex items-center justify-between";
    div.onclick = () => openSlotManagerModal('PLANNING', g.planningId);

    div.innerHTML = `
      <div class="truncate">
        <div class="font-extrabold text-slate-900 truncate">🏫 ${g.schoolNaam}</div>
        <div class="text-[10px] text-slate-500">📅 ${formatDateNl(g.datum, true)}</div>
      </div>
      <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white">${assigned}/${total}</span>
    `;
    container.appendChild(div);
  });
}

function openAddSchoolPlanningModal(isQuickAdd = false) {
  document.getElementById('inputPlanAantalNodig').value = 1;
  const input = document.getElementById('inputPlanDate');
  
  if (!isQuickAdd && input) {
    if (input._flatpickr) input._flatpickr.clear();
    else input.value = '';
  }

  const select = document.getElementById('selectSchoolName');
  select.innerHTML = "";
  const filtered = (schoolsCache || []).filter(s => s.categorie === "Regulier");
  filtered.sort((a, b) => getCleanSortName(a.naam).localeCompare(getCleanSortName(b.naam)));
  filtered.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.naam;
    opt.innerText = s.naam;
    select.appendChild(opt);
  });
  document.getElementById('modalAddSchoolPlanning').classList.remove('hidden');
}

function closeAddSchoolModal() { document.getElementById('modalAddSchoolPlanning').classList.add('hidden'); }

async function handleAddSchoolPlanningSubmit(e) {
  e.preventDefault();
  const datum = normalizeDateStr(document.getElementById('inputPlanDate').value);
  const schoolNaam = document.getElementById('selectSchoolName').value;
  const aantalNodig = document.getElementById('inputPlanAantalNodig').value;
  const btn = document.getElementById('btnAddSchoolSubmit');

  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Inplannen...`;
  btn.disabled = true;

  await apiCall("", "POST", { action: "adminSavePlanning", adminPin: ADMIN_SECRET, planningData: { datum, schoolNaam, categorie: "Regulier", aantalNodig } });

  btn.innerHTML = `Inplannen`;
  btn.disabled = false;
  closeAddSchoolModal();
  await loadAdminData();
}

// ==========================================
// ADMIN DASHBOARD & OVERZICHTEN
// ==========================================

function openAdminPinModal() {
  openPinModal("Admin Toegang", "Voer de master admincode in", (pin) => {
    if (pin === ADMIN_SECRET) {
      closePinModal();
      openAdminDashboard();
    } else showPinError("Ongeldige admincode.");
  });
}

async function openAdminDashboard() {
  document.getElementById('modalAdmin').classList.remove('hidden');
  await loadAdminData();
}

function closeAdminModal() { document.getElementById('modalAdmin').classList.add('hidden'); }

async function loadAdminData() {
  const res = await apiCall("", "GET", { action: "getAdminOverview", adminPin: ADMIN_SECRET });
  if (res.success) {
    adminData = res;
    if (adminData.planning) adminData.planning.forEach(p => p.datum = normalizeDateStr(p.datum));
    if (adminData.availability) adminData.availability.forEach(a => a.datum = normalizeDateStr(a.datum));
    if (res.schools) schoolsCache = res.schools;
    
    renderAdminPlanning();
    renderAdminApprovals();
    renderAdminUnfilledDocenten();
    renderAdminDocenten();
    renderAdminScholenTab();
    
    if (currentDocent && currentDocent.isPlanner) {
      renderPlannerGrid();
      renderPlannerOnToursList();
      renderPlannerGatenSidebar();
    }
  }
}

async function adminManualRefresh(btn) {
  const icon = btn.querySelector('i');
  if (icon) icon.classList.add('fa-spin');
  btn.disabled = true;
  await loadAdminData();
  setTimeout(() => {
    if (icon) icon.classList.remove('fa-spin');
    btn.disabled = false;
  }, 400);
}

function switchAdminTab(tab) {
  document.getElementById('adminTabPlanning').classList.toggle('hidden', tab !== 'planning');
  document.getElementById('adminTabApprovals').classList.toggle('hidden', tab !== 'approvals');
  document.getElementById('adminTabUnfilled').classList.toggle('hidden', tab !== 'unfilled');
  document.getElementById('adminTabDocenten').classList.toggle('hidden', tab !== 'docenten');
  document.getElementById('adminTabScholen').classList.toggle('hidden', tab !== 'scholen');

  document.getElementById('tabBtnPlanning').className = tab === 'planning' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
  document.getElementById('tabBtnApprovals').className = tab === 'approvals' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
  document.getElementById('tabBtnUnfilled').className = tab === 'unfilled' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
  document.getElementById('tabBtnDocenten').className = tab === 'docenten' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
  document.getElementById('tabBtnScholen').className = tab === 'scholen' ? 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-sm transition' : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition';
}

function renderAdminPlanning() {
  const container = document.getElementById('adminPlanningGrid');
  container.innerHTML = "";
  if (!adminData.planning || adminData.planning.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400 bg-white rounded-2xl border text-xs">Nog geen reguliere scholen gepland.</div>`;
    return;
  }

  adminData.planning.forEach(plan => {
    const assigned = plan.toegewezenDocentIDs || [];
    const total = plan.aantalNodig || 1;
    const isComplete = assigned.length >= total;

    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${formatDateNl(plan.datum, true)}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'}">${assigned.length}/${total} Slots</span>
        </div>
        <h4 class="font-bold text-slate-800 text-sm mb-1">🏫 ${plan.schoolNaam}</h4>
      </div>
      <div class="flex gap-2 pt-2 border-t border-slate-100">
        <button onclick="openSlotManagerModal('PLANNING', '${plan.planningId}')" class="flex-1 text-xs py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition">Slots Beheren</button>
        <button onclick="deletePlanning(this, '${plan.planningId}')" class="text-xs px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderAdminApprovals() {
  const container = document.getElementById('adminApprovalsList');
  container.innerHTML = "";

  const pendingDays = (adminData.availability || []).filter(a => a.goedkeuring === "IN_BEHANDELING");
  const pendingPeriods = adminData.pendingPeriodRequests || [];
  const badge = document.getElementById('badgeOpenApprovals');

  const totalCount = pendingDays.length + pendingPeriods.length;
  if (badge) {
    badge.innerText = totalCount;
    badge.classList.toggle('hidden', totalCount === 0);
  }

  if (totalCount === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 bg-white rounded-2xl border text-xs">Geen openstaande wijzigingsverzoeken.</div>`;
    return;
  }

  if (pendingPeriods.length > 0) {
    container.innerHTML += `<h4 class="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] mb-2">Vaste Periode Verzoeken:</h4>`;
    pendingPeriods.forEach(req => {
      const isDel = req.status === "PENDING_DELETE";
      const card = document.createElement('div');
      card.className = `p-4 bg-white rounded-2xl border-2 ${isDel ? 'border-rose-200' : 'border-amber-200'} shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs`;
      card.innerHTML = `
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-extrabold text-slate-900 text-sm">${req.docentNaam}</span>
            <span class="font-bold px-2 py-0.5 rounded-md text-[10px] ${isDel ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">${isDel ? '🗑️ Verwijderingsverzoek' : '✏️ Wijzigingsverzoek'}</span>
          </div>
          <div class="text-slate-700 font-medium">${isDel ? `Periode wissen: <strong>${formatPeriodNl(req.periode.van, req.periode.tot)} (${(req.periode.dagen || []).join(', ')})</strong>` : `Gewijzigd naar: <strong>${formatPeriodNl(req.periode.pendingVan, req.periode.pendingTot)}</strong>`}</div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="approvePeriodRequest('${req.docentId}', '${req.periodId}', true)" class="px-3.5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"><i class="fa-solid fa-check mr-1"></i> Akkoord</button>
          <button onclick="approvePeriodRequest('${req.docentId}', '${req.periodId}', false)" class="px-3.5 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs"><i class="fa-solid fa-xmark mr-1"></i> Afwijzen</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  if (pendingDays.length > 0) {
    container.innerHTML += `<h4 class="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] mt-4 mb-2">Losse Dagwijzigingen:</h4>`;
    pendingDays.forEach(item => {
      const docent = adminData.docenten.find(d => d.id === item.docentId);
      const docName = docent ? docent.naam : item.docentId;
      const trans = item.vorigeStatus ? `${item.vorigeStatus} ➔ ${item.status}` : item.status;

      const card = document.createElement('div');
      card.className = "p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs";
      card.innerHTML = `
        <div>
          <div class="flex items-center gap-2 mb-1"><span class="font-extrabold text-slate-900">${docName}</span><span class="font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">${trans}</span></div>
          <div class="text-slate-600">📅 Datum: <strong class="text-slate-800">${formatDateNl(item.datum, true)}</strong></div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="approveAvailability(this, '${item.recordId}', true)" class="px-3.5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"><i class="fa-solid fa-check mr-1"></i> Akkoord</button>
          <button onclick="approveAvailability(this, '${item.recordId}', false)" class="px-3.5 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs"><i class="fa-solid fa-xmark mr-1"></i> Afwijzen</button>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

async function approvePeriodRequest(docentId, periodId, approved) {
  await apiCall("", "POST", { action: "adminApprovePeriodRequest", adminPin: ADMIN_SECRET, docentId, periodId, approved });
  await loadAdminData();
}

function toggleDocFilter(type) {
  if (type === 'tour') docFilterTour = !docFilterTour;
  if (type === 'rijbewijs') docFilterRijbewijs = !docFilterRijbewijs;
  if (type === 'auto') docFilterAuto = !docFilterAuto;

  document.getElementById('filterDocTour').className = docFilterTour ? 'px-2.5 py-1.5 rounded-lg border font-bold text-white bg-sky-600 border-sky-600 shadow-sm' : 'px-2.5 py-1.5 rounded-lg border font-bold text-slate-600 bg-slate-50 border-slate-300';
  document.getElementById('filterDocRijbewijs').className = docFilterRijbewijs ? 'px-2.5 py-1.5 rounded-lg border font-bold text-white bg-emerald-600 border-emerald-600 shadow-sm' : 'px-2.5 py-1.5 rounded-lg border font-bold text-slate-600 bg-slate-50 border-slate-300';
  document.getElementById('filterDocAuto').className = docFilterAuto ? 'px-2.5 py-1.5 rounded-lg border font-bold text-white bg-indigo-600 border-indigo-600 shadow-sm' : 'px-2.5 py-1.5 rounded-lg border font-bold text-slate-600 bg-slate-50 border-slate-300';

  renderAdminDocenten();
}

function renderAdminDocenten() {
  const tbody = document.getElementById('adminDocentenTableBody');
  tbody.innerHTML = "";

  const reguliereScholen = (schoolsCache || []).filter(s => s.categorie === 'Regulier');
  reguliereScholen.sort((a, b) => getCleanSortName(a.naam).localeCompare(getCleanSortName(b.naam)));

  let list = adminData.docenten || [];
  if (docFilterTour) list = list.filter(d => d.alleenOnTour);
  if (docFilterRijbewijs) list = list.filter(d => d.rijbewijs === 'Ja');
  if (docFilterAuto) list = list.filter(d => d.auto === 'Ja');

  list.forEach(docent => {
    const tr = document.createElement('tr');
    const vasteScholenArr = docent.vasteScholen || [];
    let vasteScholenHtml = `
      <div class="flex flex-wrap items-center gap-1 max-w-[200px]">
        ${vasteScholenArr.map(s => `
          <span class="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-bold text-[10px] flex items-center gap-1">
            <span>${s}</span>
            <button onclick="removeVasteSchoolFromDocent('${docent.id}', '${s}')" class="text-indigo-500 hover:text-rose-600">✕</button>
          </span>
        `).join('')}
        <select onchange="addVasteSchoolToDocent('${docent.id}', this.value); this.value='';" class="p-1 bg-slate-100 border border-slate-300 rounded text-[10px] font-semibold">
          <option value="">➕ Koppel</option>
          ${reguliereScholen.filter(s => !vasteScholenArr.includes(s.naam)).map(s => `<option value="${s.naam}">${s.naam}</option>`).join('')}
        </select>
      </div>
    `;

    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-800">${docent.naam}</td>
      <td class="p-3"><span class="text-[10px] px-2 py-0.5 rounded font-bold ${docent.isPlanner ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}">${docent.isPlanner ? 'Planner' : 'Vakdocent'}</span></td>
      <td class="p-3">${docent.isPlanner ? '-' : vasteScholenHtml}</td>
      <td class="p-3 text-[10px]"><span class="${docent.alleenOnTour ? 'text-sky-600 font-bold' : 'text-slate-500'}">✈️ ${docent.alleenOnTour ? 'Alleen Tour' : 'Regulier'}</span></td>
      <td class="p-3">
        <select onchange="updateDocentSkill(this, '${docent.id}', this.value)" class="bg-slate-100 border border-slate-300 rounded-lg p-1 font-bold text-xs">
          <option value="N1" ${docent.skillLevel === 'N1' ? 'selected' : ''}>N1</option>
          <option value="N2" ${docent.skillLevel === 'N2' ? 'selected' : ''}>N2</option>
          <option value="N3" ${docent.skillLevel === 'N3' ? 'selected' : ''}>N3</option>
        </select>
      </td>
      <td class="p-3">${docent.hasPin ? '<span class="text-emerald-700 font-bold">Ja</span>' : '<span class="text-amber-600 font-bold">Nee</span>'}</td>
      <td class="p-3 text-center"><button onclick="openDocentPreferencesModal('${docent.id}')" class="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-xl border border-slate-300 font-bold">Voorkeuren</button></td>
      <td class="p-3 text-center"><button onclick="openAdminDocentCalendar('${docent.id}')" class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1.5 rounded-xl border border-emerald-200">Agenda</button></td>
      <td class="p-3 text-right"><button onclick="resetDocentPin(this, '${docent.id}')" class="text-xs bg-rose-50 text-rose-600 px-2 py-1 rounded-lg border border-rose-200">Reset PIN</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdminScholenTab() {
  const tbody = document.getElementById('adminScholenTableBody');
  tbody.innerHTML = "";
  const query = (document.getElementById('inputSearchAdminSchools')?.value || '').toLowerCase().trim();
  let schools = schoolsCache || [];
  if (query) schools = schools.filter(s => s.naam.toLowerCase().includes(query) || (s.locatie || '').toLowerCase().includes(query));

  schools.sort((a, b) => getCleanSortName(a.naam).localeCompare(getCleanSortName(b.naam)));
  schools.forEach(school => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3 font-bold text-slate-800">🏫 ${school.naam}</td>
      <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${school.categorie === 'On tour' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'}">${school.categorie}</span></td>
      <td class="p-3 text-slate-600">${school.locatie || '-'}</td>
      <td class="p-3 text-right"><button onclick="openSchoolHistoryModal('${school.naam}')" class="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl border border-indigo-200">Historie</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// TAB: NIET-INGEVULDE DOCENTEN (3 WEKEN)
// ==========================================

function getUpcoming3WeeksWorkdays() {
  const workdays = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  let daysToFriday = (5 - dayOfWeek);
  if (dayOfWeek === 0) daysToFriday = 5;
  else if (dayOfWeek === 6) daysToFriday = 6;

  const targetFriday = new Date(now);
  targetFriday.setDate(now.getDate() + daysToFriday + 14);

  let curr = new Date(now);
  while (curr <= targetFriday) {
    if (curr.getDay() >= 1 && curr.getDay() <= 5) {
      workdays.push(normalizeDateStr(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }
  return workdays;
}

function renderAdminUnfilledDocenten() {
  const container = document.getElementById('adminUnfilledDocentenList');
  if (!container) return;
  container.innerHTML = "";

  const workdays = getUpcoming3WeeksWorkdays();
  const unfilledTeachers = [];

  const regularDocs = (adminData.docenten || []).filter(d => !d.isPlanner && d.alleenOnTour !== 'Ja');

  regularDocs.forEach(doc => {
    const docAvailMap = {};
    (adminData.availability || []).forEach(a => {
      if (a.docentId === doc.id) {
        docAvailMap[normalizeDateStr(a.datum)] = a.status;
      }
    });

    const missingDays = workdays.filter(dateIso => !docAvailMap[dateIso]);
    if (missingDays.length > 0) {
      unfilledTeachers.push({
        docent: doc,
        missingCount: missingDays.length,
        missingDays: missingDays
      });
    }
  });

  const badge = document.getElementById('badgeUnfilledDocenten');
  if (badge) {
    badge.innerText = unfilledTeachers.length;
    badge.classList.toggle('hidden', unfilledTeachers.length === 0);
  }

  if (unfilledTeachers.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 bg-white rounded-2xl border text-xs">Iedereen heeft de komende 3 weken volledig ingevuld! 🎉</div>`;
    return;
  }

  unfilledTeachers.sort((a, b) => b.missingCount - a.missingCount);

  unfilledTeachers.forEach(item => {
    const card = document.createElement('div');
    card.className = "p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs";

    const daysBadges = item.missingDays.slice(0, 5).map(d => `<span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">${formatDateNl(d, true)}</span>`).join(' ');
    const extraCount = item.missingDays.length > 5 ? `<span class="text-slate-400 font-bold text-[10px]">+${item.missingDays.length - 5} meer</span>` : '';

    card.innerHTML = `
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="font-extrabold text-slate-900 text-sm">${item.docent.naam}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">${item.missingCount} dagen open</span>
        </div>
        <div class="flex flex-wrap items-center gap-1 mt-1.5">
          <span class="text-slate-500 font-medium mr-1">Openstaand:</span>
          ${daysBadges} ${extraCount}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="openAdminDocentCalendar('${item.docent.id}')" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5">
          <i class="fa-regular fa-calendar-check"></i> <span>Agenda openen</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function copyUnfilledDocentenNames() {
  const workdays = getUpcoming3WeeksWorkdays();
  const regularDocs = (adminData.docenten || []).filter(d => !d.isPlanner && d.alleenOnTour !== 'Ja');
  const names = [];

  regularDocs.forEach(doc => {
    const docAvailMap = {};
    (adminData.availability || []).forEach(a => {
      if (a.docentId === doc.id) docAvailMap[normalizeDateStr(a.datum)] = a.status;
    });
    if (workdays.some(dateIso => !docAvailMap[dateIso])) {
      names.push(doc.naam);
    }
  });

  if (names.length === 0) {
    alert("Iedereen is compleet ingevuld!");
    return;
  }

  navigator.clipboard.writeText(names.join(', ')).then(() => {
    alert(`📋 ${names.length} namen gekopieerd naar klembord:\n\n${names.join(', ')}`);
  });
}

async function addVasteSchoolToDocent(docentId, schoolNaam) {
  if (!schoolNaam) return;
  const doc = (adminData.docenten || []).find(d => d.id === docentId);
  if (doc) {
    let arr = doc.vasteScholen || [];
    if (!arr.includes(schoolNaam)) arr.push(schoolNaam);
    doc.vasteScholen = arr;
    renderAdminDocenten();
    await apiCall("", "POST", { action: "adminUpdateDocent", adminPin: ADMIN_SECRET, docentId, vasteScholen: arr });
  }
}

async function removeVasteSchoolFromDocent(docentId, schoolNaam) {
  const doc = (adminData.docenten || []).find(d => d.id === docentId);
  if (doc) {
    let arr = (doc.vasteScholen || []).filter(s => s !== schoolNaam);
    doc.vasteScholen = arr;
    renderAdminDocenten();
    await apiCall("", "POST", { action: "adminUpdateDocent", adminPin: ADMIN_SECRET, docentId, vasteScholen: arr });
  }
}

async function deletePlanning(btn, id) {
  if (confirm("Weet je zeker dat je deze les wilt verwijderen?")) {
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
    await apiCall("", "POST", { action: "adminDeletePlanning", adminPin: ADMIN_SECRET, planningId: id });
    await loadAdminData();
  }
}

async function approveAvailability(btn, recordId, approved) {
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
  btn.disabled = true;
  await apiCall("", "POST", { action: "adminApproveAvailability", adminPin: ADMIN_SECRET, recordId, approved });
  await loadAdminData();
}

async function updateDocentSkill(selectEl, docentId, skillLevel) {
  selectEl.disabled = true;
  await apiCall("", "POST", { action: "adminUpdateDocent", adminPin: ADMIN_SECRET, docentId, skillLevel });
  selectEl.disabled = false;
}

async function resetDocentPin(btn, docentId) {
  if (confirm("Pincode wissen?")) {
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
    btn.disabled = true;
    await apiCall("", "POST", { action: "adminUpdateDocent", adminPin: ADMIN_SECRET, docentId, resetPin: true });
    await loadAdminData();
  }
}

// Planner Agenda & Losse Dagen
function openAdminDocentCalendar(docentId) {
  viewingAdminDocent = (adminData.docenten || []).find(d => d.id === docentId);
  if (!viewingAdminDocent) return;
  adminDocentCalDate = new Date();
  document.getElementById('adminDocentCalTitle').innerText = `Agenda van ${viewingAdminDocent.naam}`;
  renderAdminDocentCalendar();
  document.getElementById('modalAdminDocentCalendar').classList.remove('hidden');
}

function closeAdminDocentCalendar() { 
  document.getElementById('modalAdminDocentCalendar').classList.add('hidden'); 
  viewingAdminDocent = null; 
}

function changeAdminDocentMonth(delta) { 
  adminDocentCalDate.setMonth(adminDocentCalDate.getMonth() + delta); 
  renderAdminDocentCalendar(); 
}

function renderAdminDocentCalendar() {
  const year = adminDocentCalDate.getFullYear();
  const month = adminDocentCalDate.getMonth();
  document.getElementById('adminDocentCalMonthTitle').innerText = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(adminDocentCalDate);
  const now = new Date(); now.setHours(0,0,0,0); const todayIso = normalizeDateStr(now);
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDayOfWeek = firstDayOfMonth.getDay() - 1; if (startDayOfWeek === -1) startDayOfWeek = 6;
  const grid = document.getElementById('adminDocentCalDaysGrid'); grid.innerHTML = "";

  for (let i = 0; i < (startDayOfWeek <= 4 ? startDayOfWeek : 0); i++) grid.innerHTML += `<div class="h-20 bg-slate-50/50 rounded-xl border border-transparent"></div>`;

  const docAvailMap = {};
  (adminData.availability || []).forEach(av => { if (av.docentId === viewingAdminDocent.id) docAvailMap[normalizeDateStr(av.datum)] = av; });

  for (let day = 1; day <= daysInMonth; day++) {
    const dObj = new Date(year, month, day);
    if (dObj.getDay() === 0 || dObj.getDay() === 6) continue;
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = isoDate === todayIso;
    const avail = docAvailMap[isoDate];
    const assignedPlan = (adminData.planning || []).find(p => normalizeDateStr(p.datum) === isoDate && (p.toegewezenDocentIDs || []).includes(viewingAdminDocent.id));

    let statusBg = "bg-slate-50 border-slate-200 text-slate-600";
    let badgeHtml = "<span class='text-[10px] text-slate-400'>Geen opgave</span>";

    if (avail) {
      if (avail.goedkeuring === "IN_BEHANDELING") { statusBg = "bg-amber-50 border-amber-300"; badgeHtml = `<span class="text-[9px] bg-amber-500 text-white font-bold px-1 rounded">⏳ In Behandeling</span>`; }
      else if (avail.status === "JA") { statusBg = "bg-emerald-100 border-emerald-300"; badgeHtml = `<span class="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">🟢 Ja</span>`; }
      else if (avail.status === "MOGELIJK") { statusBg = "bg-amber-100 border-amber-300"; badgeHtml = `<span class="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-bold">🟠 Mogelijk</span>`; }
      else if (avail.status === "NEE") { statusBg = "bg-rose-100 border-rose-300"; badgeHtml = `<span class="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">🔴 Nee</span>`; }
    }

    const cell = document.createElement('div');
    cell.className = `h-20 p-1.5 rounded-xl border flex flex-col justify-between ${statusBg} ${isToday ? 'ring-2 ring-sky-400' : ''} text-xs cursor-pointer`;
    cell.innerHTML = `<div class="flex justify-between font-bold"><span>${day}</span>${isToday ? '<span class="text-[8px] bg-sky-500 text-white px-1 rounded">Vandaag</span>' : ''}</div><div class="truncate">${badgeHtml} ${assignedPlan ? `<div class="text-[9px] bg-slate-800 text-white px-1 rounded mt-1">🏫 ${assignedPlan.schoolNaam}</div>` : ''}</div>`;
    cell.onclick = () => openAdminDayActionModal(isoDate, dObj);
    grid.appendChild(cell);
  }
}

function openAdminDayActionModal(isoDate, dateObj) {
  selectedAdminDayAction = { docentId: viewingAdminDocent.id, isoDate, dateObj };
  document.getElementById('adminDayActionTitle').innerText = `${viewingAdminDocent.naam} - ${dateObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  const select = document.getElementById('selectAdminDayOpenSchools');
  select.innerHTML = '<option value="">-- Kies open school op datum --</option>';
  (adminData.planning || []).filter(p => normalizeDateStr(p.datum) === isoDate && (p.toegewezenDocentIDs || []).length < p.aantalNodig).forEach(p => {
    const opt = document.createElement('option'); opt.value = p.planningId; opt.innerText = p.schoolNaam; select.appendChild(opt);
  });
  document.getElementById('modalAdminDayAction').classList.remove('hidden');
}

function closeAdminDayActionModal() { 
  document.getElementById('modalAdminDayAction').classList.add('hidden'); 
  selectedAdminDayAction = null; 
}

async function submitAdminDirectStatus(status) {
  if (!selectedAdminDayAction) return;
  await apiCall("", "POST", { action: "adminDirectSetDocentAvailability", adminPin: ADMIN_SECRET, docentId: selectedAdminDayAction.docentId, datum: selectedAdminDayAction.isoDate, status });
  closeAdminDayActionModal();
  await loadAdminData();
  renderAdminDocentCalendar();
}

async function submitAdminDirectSchoolAssign() {
  const planningId = document.getElementById('selectAdminDayOpenSchools').value;
  if (!planningId) return;
  const plan = (adminData.planning || []).find(p => p.planningId === planningId);
  if (plan) {
    const assigned = [...(plan.toegewezenDocentIDs || [])];
    if (!assigned.includes(selectedAdminDayAction.docentId)) {
      assigned.push(selectedAdminDayAction.docentId);
      await apiCall("", "POST", { action: "adminUpdatePlanningAssignments", adminPin: ADMIN_SECRET, planningId: plan.planningId, toegewezenDocentIds: assigned });
    }
  }
  closeAdminDayActionModal();
  await loadAdminData();
  renderAdminDocentCalendar();
}

function openDocentPreferencesModal(docentId) {
  const doc = (adminData.docenten || []).find(d => d.id === docentId);
  if (!doc) return;
  document.getElementById('docPrefModalTitle').innerText = `Voorkeuren: ${doc.naam}`;
  const container = document.getElementById('docPrefModalContent');
  const todayIso = normalizeDateStr(new Date());
  const periodesHtml = (doc.vastePeriodes || []).map((p, i) => `
    <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
      <div><strong>Periode ${i + 1}: ${formatPeriodNl(p.van, p.tot)}</strong><div>Dagen: ${(p.dagen || []).join(', ') || 'Geen'}</div></div>
      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.tot && p.tot < todayIso ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}">${p.tot && p.tot < todayIso ? 'Verlopen' : 'Actief'}</span>
    </div>
  `).join('') || '<span class="text-slate-400 italic">Geen vaste periodes geregistreerd.</span>';

  container.innerHTML = `
    <div class="grid grid-cols-2 gap-2 mb-3 text-xs">
      <div class="p-2.5 bg-slate-50 rounded-xl border">Werkdagen: <strong>${doc.werkDagenPwk || '-'}</strong></div>
      <div class="p-2.5 bg-slate-50 rounded-xl border">Alleen On Tour: <strong>${doc.alleenOnTour ? 'Ja' : 'Nee'}</strong></div>
      <div class="p-2.5 bg-slate-50 rounded-xl border">Rijbewijs: <strong>${doc.rijbewijs}</strong></div>
      <div class="p-2.5 bg-slate-50 rounded-xl border">Auto: <strong>${doc.auto}</strong></div>
    </div>
    <div class="space-y-1.5">${periodesHtml}</div>
  `;
  document.getElementById('modalDocentPreferences').classList.remove('hidden');
}

function closeDocentPreferencesModal() { 
  document.getElementById('modalDocentPreferences').classList.add('hidden'); 
}

function openSchoolHistoryModal(schoolNaam) {
  document.getElementById('schoolHistoryModalTitle').innerText = `Geschiedenis: ${schoolNaam}`;
  const container = document.getElementById('schoolHistoryContentList');
  container.innerHTML = "";
  const nowIso = normalizeDateStr(new Date());
  const pastPlans = (adminData.planning || []).filter(p => p.schoolNaam === schoolNaam && normalizeDateStr(p.datum) < nowIso);

  if (pastPlans.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Geen voorgaande lessen geregistreerd.</div>`;
  } else {
    pastPlans.forEach(p => {
      const docNames = (p.toegewezenDocentIDs || []).map(id => (adminData.docenten.find(d => d.id === id)?.naam || id)).join(', ');
      container.innerHTML += `<div class="p-2.5 bg-slate-50 border rounded-xl text-xs mb-1.5 flex justify-between"><div>📅 <strong>${formatDateNl(p.datum, true)}</strong><div class="text-slate-500">${docNames || 'Geen docent'}</div></div><span class="font-bold text-emerald-800">${p.status}</span></div>`;
    });
  }
  document.getElementById('modalSchoolHistory').classList.remove('hidden');
}

function closeSchoolHistoryModal() { 
  document.getElementById('modalSchoolHistory').classList.add('hidden'); 
}

function logout() {
  currentDocent = null;
  currentPin = "";
  document.getElementById('viewCalendar').classList.add('hidden');
  document.getElementById('viewCalendar').classList.remove('flex');
  document.getElementById('viewPlannerDashboard').classList.add('hidden');
  document.getElementById('viewPlannerDashboard').classList.remove('flex');
  document.getElementById('viewLanding').classList.remove('hidden');
  document.getElementById('landingFooterBar').classList.remove('hidden');
  document.getElementById('headerUserSection').classList.add('hidden');
  document.getElementById('docentSearchInput').value = "";
  renderDocentenButtons(docentenCache);
}
