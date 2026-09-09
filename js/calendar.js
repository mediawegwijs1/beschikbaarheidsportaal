// ==========================================
// KALENDER & BESCHIKBAARHEID (Met Optimistic UI)
// ==========================================

async function initCalendarView() {
  document.getElementById('viewLanding').classList.add('hidden');
  document.getElementById('viewPlannerDashboard').classList.add('hidden');
  document.getElementById('landingFooterBar').classList.add('hidden');
  document.getElementById('viewCalendar').classList.remove('hidden');
  document.getElementById('viewCalendar').classList.add('flex');
  
  document.getElementById('headerUserSection').classList.remove('hidden');
  document.getElementById('headerDocentName').innerText = currentDocent.naam;
  document.getElementById('btnHeaderPreferences').classList.remove('hidden');
  document.getElementById('headerRoleBadge').className = "w-2 h-2 rounded-full bg-emerald-500";
  
  document.getElementById('btnHeaderAdmin').classList.toggle('hidden', !currentDocent.isPlanner);

  const isAlleenTour = currentDocent.alleenOnTour === 'Ja' || currentDocent.alleenOnTour === true;
  if (isAlleenTour) {
    document.getElementById('docentCalendarCol').classList.add('hidden');
    document.getElementById('docentOnToursCol').className = "w-full max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col";
  } else {
    document.getElementById('docentCalendarCol').classList.remove('hidden');
    document.getElementById('docentOnToursCol').className = "w-full lg:w-80 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col shrink-0";
  }

  currentCalendarDate = new Date();
  await Promise.all([loadAvailabilityAndRender(), loadDocentOnTours()]);
}

async function loadAvailabilityAndRender() {
  const res = await apiCall("", "GET", { action: "getAvailability", docentId: currentDocent.id, pin: currentPin });
  if (res.success) {
    availabilityCache = {};
    res.availability.forEach(item => {
      const normD = normalizeDateStr(item.datum);
      availabilityCache[normD] = { ...item, datum: normD };
    });
  }
  render5DayCalendar();
}

async function manualRefreshCalendar() {
  const icon = document.getElementById('iconRefresh');
  if (icon) icon.classList.add('fa-spin');
  await Promise.all([loadAvailabilityAndRender(), loadDocentOnTours()]);
  if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 400);
}

function render5DayCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  document.getElementById('calendarMonthTitle').innerText = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(currentCalendarDate);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayIso = normalizeDateStr(now);
  
  const dayOfWeek = now.getDay();
  let daysToThisFriday = (5 - dayOfWeek);
  if (dayOfWeek === 0) daysToThisFriday = 5;
  else if (dayOfWeek === 6) daysToThisFriday = 6;
  
  const thisFriday = new Date(now);
  thisFriday.setDate(now.getDate() + daysToThisFriday);
  
  const targetFriday = new Date(thisFriday);
  targetFriday.setDate(thisFriday.getDate() + 14);
  const end3WeeksIso = normalizeDateStr(targetFriday);

  let hasUnfilledIn3Weeks = false;
  const isAlleenTour = currentDocent && (currentDocent.alleenOnTour === 'Ja' || currentDocent.alleenOnTour === true);

  const diffMonths = (year - now.getFullYear()) * 12 + (month - now.getMonth());
  document.getElementById('btnPrevMonth').disabled = diffMonths <= 0;
  document.getElementById('btnNextMonth').disabled = diffMonths >= 3;

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const grid = document.getElementById('calendarDaysGrid');
  grid.innerHTML = "";

  const leadingEmpty = startDayOfWeek <= 4 ? startDayOfWeek : 0;
  for (let i = 0; i < leadingEmpty; i++) {
    grid.innerHTML += `<div class="h-20 bg-slate-50/50 rounded-xl border border-transparent"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dObj = new Date(year, month, day);
    const dWeek = dObj.getDay();
    if (dWeek === 0 || dWeek === 6) continue;

    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isPast = isoDate < todayIso;
    const isToday = isoDate === todayIso;
    const isInNext3Weeks = isoDate >= todayIso && isoDate <= end3WeeksIso;

    const avail = availabilityCache[isoDate];
    let statusBg = "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300";
    let statusBadge = "";

    if (avail) {
      if (avail.goedkeuring === "IN_BEHANDELING") {
        statusBg = "bg-slate-100 border-slate-300 text-slate-800";
        const transText = avail.vorigeStatus ? `${avail.vorigeStatus} ➔ ${avail.status}` : avail.status;
        statusBadge = `<span class="text-[9px] bg-slate-600 text-white px-1.5 py-0.5 rounded font-bold">⏳ ${transText}</span>`;
      } else if (avail.status === "JA") {
        statusBg = "bg-emerald-100 border-emerald-300 text-emerald-900";
        statusBadge = `<span class="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">🟢 Ja</span>`;
      } else if (avail.status === "MOGELIJK") {
        statusBg = "bg-amber-100 border-amber-300 text-amber-900";
        statusBadge = `<span class="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-bold">🟠 Mogelijk</span>`;
      } else if (avail.status === "NEE") {
        statusBg = "bg-rose-100 border-rose-300 text-rose-900";
        statusBadge = `<span class="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">🔴 Nee</span>`;
      }
    } else if (isInNext3Weeks && !isAlleenTour) {
      hasUnfilledIn3Weeks = true;
      statusBg = "bg-amber-50/70 border-2 border-amber-400 ring-2 ring-amber-300 animate-pulse text-amber-900";
      statusBadge = `<span class="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">⚠️ Invullen</span>`;
    }

    const cell = document.createElement('div');
    if (isPast) {
      cell.className = `h-20 p-2 rounded-2xl border bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed flex flex-col justify-between shadow-none`;
      cell.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-sm">${day}</span>
          <span class="text-[9px] text-slate-400">Verstreken</span>
        </div>
        <div class="truncate opacity-75">${statusBadge}</div>
      `;
    } else {
      const todayStyle = isToday ? 'ring-2 ring-sky-400 ring-offset-1 border-sky-400 bg-sky-50/50' : '';
      cell.className = `h-20 p-2 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${statusBg} ${todayStyle} active:scale-95 shadow-sm`;
      cell.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold text-sm">${day}</span>
          ${isToday ? '<span class="text-[8px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full font-bold">Vandaag</span>' : ''}
        </div>
        <div class="truncate">${statusBadge}</div>
      `;
      cell.onclick = () => openDayPicker(isoDate, dObj);
    }
    grid.appendChild(cell);
  }

  document.getElementById('alertBannerUnfilledDays').classList.toggle('hidden', isAlleenTour || !hasUnfilledIn3Weeks);
}

function changeMonth(delta) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
  render5DayCalendar();
}

function openDayPicker(isoDate, dateObj) {
  selectedDayForPicker = { isoDate: normalizeDateStr(isoDate), dateObj };
  document.getElementById('dayPickerDateTitle').innerText = dateObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('checkApply3Months').checked = false;
  document.getElementById('modalDayPicker').classList.remove('hidden');
}

function closeDayPicker() {
  document.getElementById('modalDayPicker').classList.add('hidden');
}

// OPTIMISTIC UI: Direct weergave updaten, op achtergrond syncen
async function submitDayStatus(status) {
  if (!selectedDayForPicker) return;
  const entries = [];
  const apply3Months = document.getElementById('checkApply3Months').checked;
  const backupCache = JSON.parse(JSON.stringify(availabilityCache)); // Backup voor rollback

  if (apply3Months) {
    const targetDayOfWeek = selectedDayForPicker.dateObj.getDay();
    const start = new Date(selectedDayForPicker.dateObj);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);

    let curr = new Date(start);
    while (curr <= end) {
      if (curr.getDay() === targetDayOfWeek) {
        entries.push({ datum: normalizeDateStr(curr), status: status });
      }
      curr.setDate(curr.getDate() + 1);
    }
  } else {
    entries.push({ datum: selectedDayForPicker.isoDate, status: status });
  }

  // 1. Direct lokale cache updaten (Optimistic UI)
  entries.forEach(entry => {
    const iso = entry.datum;
    const prev = availabilityCache[iso]?.status;
    if (prev === "JA" && status === "NEE") {
      availabilityCache[iso] = { status: status, goedkeuring: "IN_BEHANDELING", vorigeStatus: prev, datum: iso };
    } else {
      availabilityCache[iso] = { status: status, goedkeuring: "GOEDGEKEURD", datum: iso };
    }
  });

  closeDayPicker();
  render5DayCalendar(); // 2. UI onmiddellijk hertekenen

  // 3. Achtergrond Sync naar Google Apps Script
  const res = await apiCall("", "POST", { action: "setAvailability", docentId: currentDocent.id, pin: currentPin, entries });
  
  if (!res || !res.success) {
    console.error("Fout bij opslaan:", res?.error);
    availabilityCache = backupCache; // Rollback bij fout
    render5DayCalendar();
  }
}
