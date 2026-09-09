// ==========================================
// ON TOURS & SLOT MANAGER (V2.1.1)
// ==========================================

async function loadDocentOnTours() {
  const res = await apiCall("", "GET", { action: "getOnToursOverview", docentId: currentDocent.id });
  if (res && res.success) {
    currentActiveOnTours = res.tours || [];
  } else {
    currentActiveOnTours = [];
  }
  renderDocentOnToursSidebar();
}

function calculateDeadlineStatus(startDatumStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startDate = new Date(startDatumStr + "T00:00:00");
  const deadlineDate = new Date(startDate.getTime() - (28 * 24 * 60 * 60 * 1000));
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { isClosed: true, label: "Gesloten", colorClass: "text-slate-500 bg-slate-100 border border-slate-200" };
  } else if (diffDays <= 7) {
    return { isClosed: false, label: `Nog ${diffDays} ${diffDays === 1 ? 'dag' : 'dgn'}`, colorClass: "text-rose-700 bg-rose-50 border border-rose-200 animate-pulse" };
  } else if (diffDays <= 30) {
    const wkn = Math.ceil(diffDays / 7);
    return { isClosed: false, label: `Nog ${wkn} ${wkn === 1 ? 'wk' : 'wkn'}`, colorClass: "text-amber-800 bg-amber-50 border border-amber-200" };
  } else {
    const mnd = Math.round(diffDays / 30);
    return { isClosed: false, label: `Nog ${mnd} mnd`, colorClass: "text-sky-800 bg-sky-50 border border-sky-200" };
  }
}

function renderDocentOnToursSidebar() {
  const container = document.getElementById('docentOnToursList');
  container.innerHTML = "";
  document.getElementById('countOnToursDocent').innerText = currentActiveOnTours.length;

  if (currentActiveOnTours.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400 p-4 text-center">Geen actieve On Tours ingepland.</div>`;
    return;
  }

  currentActiveOnTours.forEach(tour => {
    const dl = calculateDeadlineStatus(tour.startDatum);
    const myReg = tour.myRegistration;
    let badgeStatus = '<span class="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">⚪ Niet ingevuld</span>';

    if (myReg) {
      if (myReg.status === "HELE_WEEK") badgeStatus = '<span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">🟢 Hele week</span>';
      else if (myReg.status === "DEELS") badgeStatus = `<span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">🟠 Deels</span>`;
      else if (myReg.status === "NEE") badgeStatus = '<span class="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">🔴 Niet</span>';
    }

    const card = document.createElement('div');
    card.className = "p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition cursor-pointer shadow-sm flex flex-col justify-between";
    card.onclick = () => openOnTourRegisterModal(tour, dl);

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-[11px] font-extrabold text-slate-900 truncate">${tour.schoolNaam}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${dl.colorClass}">${dl.label}</span>
        </div>
        <div class="text-[11px] text-slate-500 flex items-center gap-1.5 mb-2">
          <i class="fa-regular fa-calendar text-[10px]"></i>
          <span>${formatPeriodNl(tour.startDatum, tour.eindDatum)}</span>
          ${tour.locatie ? `<span class="text-slate-400">• 📍 ${tour.locatie}</span>` : ''}
          ${tour.isBuitenland ? `<span class="text-sky-600 font-bold">🌍 ${tour.land}</span>` : ''}
        </div>
      </div>
      <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between">
        <span class="text-[10px] text-slate-400 font-semibold">Jouw status:</span>
        ${badgeStatus}
      </div>
    `;
    container.appendChild(card);
  });
}

function openOnTourRegisterModal(tour, dl) {
  if (dl.isClosed) {
    alert("De inschrijftermijn voor deze On Tour is gesloten (minder dan 4 weken voor aanvang). Neem bij spoed contact op met de planner.");
    return;
  }
  selectedTourForRegistration = tour;
  document.getElementById('otRegSchoolTitle').innerText = tour.schoolNaam;
  document.getElementById('otRegDatesLoc').innerText = `${formatPeriodNl(tour.startDatum, tour.eindDatum)} ${tour.locatie ? `• 📍 ${tour.locatie}` : ''} ${tour.isBuitenland ? `• 🌍 ${tour.land}` : ''}`;
  document.getElementById('otRegDeadlinetxt').innerText = dl.label;
  document.getElementById('otRegDeadlinetxt').className = `text-xs font-bold px-2 py-0.5 rounded-md ${dl.colorClass}`;

  renderOtRegistrationDayBlocks(tour);

  const myReg = tour.myRegistration;
  if (myReg) setOnTourChoice(myReg.status, myReg.gekozenDagen);
  else setOnTourChoice('HELE_WEEK');

  document.getElementById('modalOnTourRegister').classList.remove('hidden');
}

function renderOtRegistrationDayBlocks(tour) {
  const container = document.getElementById('otDaysContainer');
  container.innerHTML = "";
  selectedOtDays = {};

  const dayNamesMap = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
  let c = new Date(tour.startDatum);
  const eDate = new Date(tour.eindDatum);

  while (c <= eDate) {
    if (c.getDay() >= 1 && c.getDay() <= 5) {
      const dName = dayNamesMap[c.getDay()];
      selectedOtDays[dName] = false;

      const div = document.createElement('div');
      div.id = `otDay_${dName}`;
      div.onclick = () => toggleOtSingleDay(dName);
      div.className = "p-2.5 rounded-xl border transition cursor-default font-bold text-xs";
      div.innerText = dName;
      container.appendChild(div);
    }
    c.setDate(c.getDate() + 1);
  }
}

function closeOnTourRegisterModal() { document.getElementById('modalOnTourRegister').classList.add('hidden'); }

function setOnTourChoice(choice, customDays = null) {
  activeOtChoice = choice;
  const days = Object.keys(selectedOtDays);

  document.getElementById('btnOtChoiceJa').className = choice === 'HELE_WEEK' ? 'py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm' : 'py-2.5 rounded-xl bg-white border font-bold text-xs';
  document.getElementById('btnOtChoiceNee').className = choice === 'NEE' ? 'py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm' : 'py-2.5 rounded-xl bg-white border font-bold text-xs';
  document.getElementById('btnOtChoiceDeels').className = choice === 'DEELS' ? 'py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-sm' : 'py-2.5 rounded-xl bg-white border font-bold text-xs';

  if (choice === 'HELE_WEEK') {
    days.forEach(d => { selectedOtDays[d] = true; updateOtDayBlockUi(d, true, false); });
  } else if (choice === 'NEE') {
    days.forEach(d => { selectedOtDays[d] = false; updateOtDayBlockUi(d, false, false); });
  } else if (choice === 'DEELS') {
    days.forEach(d => {
      selectedOtDays[d] = customDays ? customDays.includes(d) : false;
      updateOtDayBlockUi(d, selectedOtDays[d], true);
    });
  }
}

function toggleOtSingleDay(d) {
  if (activeOtChoice !== 'DEELS') return;
  selectedOtDays[d] = !selectedOtDays[d];
  updateOtDayBlockUi(d, selectedOtDays[d], true);
}

function updateOtDayBlockUi(day, isGreen, isClickable) {
  const el = document.getElementById(`otDay_${day}`);
  if (!el) return;
  el.className = `p-2.5 rounded-xl border font-bold transition ${isGreen ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`;
}

async function submitOnTourRegistration() {
  if (!selectedTourForRegistration) return;
  const btn = document.getElementById('btnSubmitOtReg');
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
  btn.disabled = true;

  const chosen = Object.keys(selectedOtDays).filter(d => selectedOtDays[d]);
  const payload = {
    tourId: selectedTourForRegistration.tourId,
    status: activeOtChoice,
    gekozenDagen: chosen,
    startDatum: selectedTourForRegistration.startDatum,
    eindDatum: selectedTourForRegistration.eindDatum
  };

  selectedTourForRegistration.myRegistration = { status: activeOtChoice, gekozenDagen: chosen };
  closeOnTourRegisterModal();
  renderDocentOnToursSidebar();

  btn.innerHTML = `Indienen`;
  btn.disabled = false;

  const res = await apiCall("", "POST", { action: "submitOnTourRegistration", docentId: currentDocent.id, pin: currentPin, registration: payload });
  if (!res.success) alert("Melding: " + (res.error || "Fout bij opslaan."));
  await loadDocentOnTours();
}

// ==========================================
// SLOT MANAGER MET ROBUUSTE MATCHER & DATUMNOTATIE
// ==========================================

function openSlotManagerModal(type, id, selectedDayFilter = null) {
  let item = null;
  if (type === 'PLANNING') {
    item = (adminData.planning || []).find(p => String(p.planningId).trim() === String(id).trim());
  } else {
    item = (adminData.onTours || []).find(t => String(t.tourId).trim() === String(id).trim());
  }

  if (!item) {
    console.error("Geen item gevonden voor ID:", id);
    return;
  }
  
  currentSlotTarget = { type, item, selectedDayFilter };
  emergencyOverrideAllDocents = false;

  document.getElementById('slotModalTypeBadge').innerText = type === 'PLANNING' ? 'Reguliere School' : 'On Tour';
  document.getElementById('slotModalTypeBadge').className = type === 'PLANNING' ? 'text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full' : 'text-xs bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full';
  
  const assignedCount = type === 'PLANNING' ? (item.toegewezenDocentIDs || []).length : 0;
  const totalSlots = item.aantalNodig || 1;
  const progressBadge = document.getElementById('slotModalProgressBadge');
  if (progressBadge) {
    progressBadge.innerText = `${assignedCount}/${totalSlots} Bezet`;
    progressBadge.className = `text-xs font-bold px-2 py-0.5 rounded-full ${assignedCount >= totalSlots ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`;
  }

  document.getElementById('slotModalTitle').innerText = item.schoolNaam;
  document.getElementById('slotModalSubtitle').innerText = type === 'PLANNING' 
    ? `Datum: ${formatDateNl(item.datum, true)}` 
    : `Periode: ${formatPeriodNl(item.startDatum, item.eindDatum)} ${item.locatie ? `• 📍 ${item.locatie}` : ''}`;

  const overrideBtn = document.getElementById('btnEmergencyOverride');
  if (type === 'ONTOUR') {
    overrideBtn.classList.remove('hidden');
    overrideBtn.className = "text-[11px] px-2.5 py-1 rounded-xl border font-bold transition flex items-center gap-1 bg-slate-100 hover:bg-amber-100 text-slate-700 border-slate-300";
    overrideBtn.innerHTML = `<i class="fa-solid fa-unlock-keyhole"></i> <span>Nood Override: Toon alle docenten</span>`;
  } else {
    overrideBtn.classList.add('hidden');
  }

  renderPinnedVasteDocentSection();
  renderSlotManagerSlots();
  renderSlotManagerCandidates();

  const modal = document.getElementById('modalSlotManager');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeSlotManagerModal() {
  const modal = document.getElementById('modalSlotManager');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  currentSlotTarget = null;
  emergencyOverrideAllDocents = false;
}

function toggleEmergencyOverride() {
  emergencyOverrideAllDocents = !emergencyOverrideAllDocents;
  const btn = document.getElementById('btnEmergencyOverride');
  if (emergencyOverrideAllDocents) {
    btn.className = "text-[11px] px-2.5 py-1 rounded-xl border font-bold transition flex items-center gap-1 bg-amber-500 text-white border-amber-600 shadow-sm";
    btn.innerHTML = `<i class="fa-solid fa-unlock"></i> <span>🔓 Nood Override Actief (Alle Docenten)</span>`;
  } else {
    btn.className = "text-[11px] px-2.5 py-1 rounded-xl border font-bold transition flex items-center gap-1 bg-slate-100 hover:bg-amber-100 text-slate-700 border-slate-300";
    btn.innerHTML = `<i class="fa-solid fa-unlock-keyhole"></i> <span>Nood Override: Toon alle docenten</span>`;
  }
  renderSlotManagerCandidates();
}

function renderPinnedVasteDocentSection() {
  const container = document.getElementById('pinnedVasteDocentContainer');
  container.innerHTML = "";
  if (currentSlotTarget.type !== 'PLANNING') { container.classList.add('hidden'); return; }

  const item = currentSlotTarget.item;
  const vasteDocenten = (adminData.docenten || []).filter(d => (d.vasteScholen || []).includes(item.schoolNaam));
  if (vasteDocenten.length === 0) { container.classList.add('hidden'); return; }

  container.classList.remove('hidden');
  const targetDate = normalizeDateStr(item.datum);
  const assignedIds = item.toegewezenDocentIDs || [];
  const totalSlots = item.aantalNodig || 1;
  const isFull = assignedIds.length >= totalSlots;

  vasteDocenten.forEach(doc => {
    const avail = (adminData.availability || []).find(a => a.docentId === doc.id && normalizeDateStr(a.datum) === targetDate);
    let statusBadge = `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px]">⚪ Niet ingevuld</span>`;
    const isNee = avail && avail.status === "NEE";

    if (avail) {
      if (avail.status === "JA") statusBadge = `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">🟢 Ja</span>`;
      else if (avail.status === "MOGELIJK") statusBadge = `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">🟠 Mogelijk</span>`;
      else if (avail.status === "NEE") statusBadge = `<span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">🔴 Nee</span>`;
    }

    const isAlreadyIn = assignedIds.includes(doc.id);
    const isDisabled = isAlreadyIn || isNee || isFull;

    let btnText = "Koppelen";
    let btnClass = "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm";

    if (isAlreadyIn) {
      btnText = "Al Gekoppeld";
      btnClass = "px-3 py-1.5 bg-slate-200 text-slate-500 font-bold rounded-xl text-xs cursor-not-allowed";
    } else if (isNee) {
      btnText = "Niet Beschikbaar";
      btnClass = "px-3 py-1.5 bg-rose-100 text-rose-400 font-bold rounded-xl text-xs cursor-not-allowed border border-rose-200";
    } else if (isFull) {
      btnText = "Slots Vol";
      btnClass = "px-3 py-1.5 bg-slate-200 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed";
    }

    const cardClass = isNee 
      ? "p-3 bg-slate-100/90 border-2 border-slate-200 rounded-2xl flex items-center justify-between gap-3 opacity-60" 
      : "p-3 bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl flex items-center justify-between gap-3";

    const card = document.createElement('div');
    card.className = cardClass;
    card.innerHTML = `
      <div>
        <div class="flex items-center gap-1.5 mb-0.5">
          <span class="text-[10px] ${isNee ? 'bg-slate-400' : 'bg-indigo-600'} text-white font-extrabold px-2 py-0.5 rounded-full">⭐ Vaste Docent</span>
          <span class="font-extrabold text-xs ${isNee ? 'text-slate-500 line-through' : 'text-slate-900'}">${doc.naam}</span>
        </div>
        <div class="text-[11px] text-slate-600">Status: ${statusBadge}</div>
      </div>
      <button onclick="assignDocentToNextSlot('${doc.id}')" ${isDisabled ? 'disabled' : ''} class="${btnClass}">${btnText}</button>
    `;
    container.appendChild(card);
  });
}

function renderSlotManagerSlots() {
  const container = document.getElementById('slotRowsContainer');
  container.innerHTML = "";
  const item = currentSlotTarget.item;

  if (currentSlotTarget.type === 'PLANNING') {
    document.getElementById('slotSectionHeaderTitle').innerText = "Toegewezen Lesgevers Slots:";
    const assigned = item.toegewezenDocentIDs || [];
    const total = item.aantalNodig || 1;

    for (let s = 0; s < total; s++) {
      const docId = assigned[s];
      const doc = docId ? adminData.docenten.find(d => d.id === docId) : null;
      const row = document.createElement('div');
      row.className = "p-2 bg-white rounded-xl border flex items-center justify-between text-xs";

      if (doc) {
        row.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-[10px]">${s + 1}</span>
            <span class="font-extrabold text-slate-800">${doc.naam}</span>
          </div>
          <button onclick="unassignDocentFromSlot('${doc.id}')" class="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-2 py-1 rounded-lg border border-rose-200 transition"><i class="fa-solid fa-xmark mr-1"></i> Ontkoppel</button>
        `;
      } else {
        row.innerHTML = `
          <div class="flex items-center gap-2 text-slate-400">
            <span class="w-5 h-5 rounded-full bg-slate-100 text-slate-400 font-extrabold flex items-center justify-center text-[10px]">${s + 1}</span>
            <span class="italic">Open Slot</span>
          </div>
        `;
      }
      container.appendChild(row);
    }
  } else {
    document.getElementById('slotSectionHeaderTitle').innerText = "Lesgever Slots & Dag-Dekking:";
    const dayNamesMap = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
    const tourDays = [];
    let c = new Date(item.startDatum);
    const eDate = new Date(item.eindDatum);
    while (c <= eDate) {
      if (c.getDay() >= 1 && c.getDay() <= 5) tourDays.push({ iso: normalizeDateStr(c), name: dayNamesMap[c.getDay()] });
      c.setDate(c.getDate() + 1);
    }

    const totalSlots = item.aantalNodig || 1;
    const slotsArray = item.slotAssignments || [];

    for (let s = 0; s < totalSlots; s++) {
      const slotObj = slotsArray.find(x => x.slotIndex === s) || { slotIndex: s, dayDocents: {} };
      const slotCard = document.createElement('div');
      slotCard.className = "p-3 bg-white rounded-2xl border space-y-2";

      let chipsHtml = "";
      tourDays.forEach(td => {
        const docId = slotObj.dayDocents ? slotObj.dayDocents[td.iso] : null;
        const doc = docId ? adminData.docenten.find(d => d.id === docId) : null;

        if (doc) {
          chipsHtml += `
            <div class="flex items-center gap-1.5 p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs">
              <span class="font-extrabold">${td.name}:</span><span class="font-semibold truncate max-w-[90px]">${doc.naam}</span>
              <button onclick="unassignOnTourDaySlot(${s}, '${td.iso}')" class="text-rose-500 hover:text-rose-700 font-bold ml-1">✕</button>
            </div>
          `;
        } else {
          const isSelected = currentSlotTarget.selectedDayFilter && currentSlotTarget.selectedDayFilter.slotIndex === s && currentSlotTarget.selectedDayFilter.dayIso === td.iso;
          chipsHtml += `
            <button onclick="selectOnTourDayGapFilter(${s}, '${td.iso}', '${td.name}')" class="p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 ${isSelected ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 shadow-sm' : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'}">
              <span>${td.name}: GAT ➕</span>
            </button>
          `;
        }
      });

      slotCard.innerHTML = `<div class="font-extrabold text-xs text-slate-800 mb-1">Lesgever Slot ${s + 1}</div><div class="flex flex-wrap gap-1.5">${chipsHtml}</div>`;
      container.appendChild(slotCard);
    }
  }
}

function selectOnTourDayGapFilter(slotIndex, dayIso, dayName) {
  if (currentSlotTarget.selectedDayFilter && currentSlotTarget.selectedDayFilter.slotIndex === slotIndex && currentSlotTarget.selectedDayFilter.dayIso === dayIso) {
    currentSlotTarget.selectedDayFilter = null;
  } else {
    currentSlotTarget.selectedDayFilter = { slotIndex, dayIso, dayName };
  }
  renderSlotManagerSlots();
  renderSlotManagerCandidates();
}

function renderSlotManagerCandidates() {
  const listJaEl = document.getElementById('listSlotCandJa');
  const listAltEl = document.getElementById('listSlotCandAlt');
  const wrapperAlt = document.getElementById('wrapperSlotCandAlt');
  listJaEl.innerHTML = ""; 
  listAltEl.innerHTML = "";

  const item = currentSlotTarget.item;
  const rankMap = { N1: 1, N2: 2, N3: 3 };
  const listJa = []; 
  const listAlt = [];

  if (currentSlotTarget.type === 'PLANNING') {
    document.getElementById('candidateFilterHeaderTitle').innerText = "Kies een beschikbare docent:";
    document.getElementById('labelSlotCandJa').innerText = "🟢 Beschikbaar (N1 ➔ N3)";
    wrapperAlt.classList.remove('hidden');
    
    const targetDate = normalizeDateStr(item.datum);
    const dayAvail = (adminData.availability || []).filter(a => normalizeDateStr(a.datum) === targetDate && a.goedkeuring === "GOEDGEKEURD");
    const assigned = item.toegewezenDocentIDs || [];

    dayAvail.forEach(av => {
      const doc = adminData.docenten.find(d => d.id === av.docentId);
      if (doc && !doc.isPlanner && !assigned.includes(doc.id)) {
        if (av.status === "JA") listJa.push(doc);
        else if (av.status === "MOGELIJK") listAlt.push(doc);
      }
    });
    listJa.sort((a, b) => (rankMap[a.skillLevel] || 3) - (rankMap[b.skillLevel] || 3));
    listAlt.sort((a, b) => (rankMap[a.skillLevel] || 3) - (rankMap[b.skillLevel] || 3));
    renderSlotCandidateButtons(listJaEl, listJa);
    renderSlotCandidateButtons(listAltEl, listAlt);

  } else {
    const filter = currentSlotTarget.selectedDayFilter;
    if (emergencyOverrideAllDocents) {
      document.getElementById('candidateFilterHeaderTitle').innerText = "🔓 Nood Override Actief: Toon alle docenten:";
      document.getElementById('labelSlotCandJa').innerText = "Alle Docenten";
      wrapperAlt.classList.add('hidden');
      const allDocs = (adminData.docenten || []).filter(d => !d.isPlanner);
      allDocs.sort((a, b) => (rankMap[a.skillLevel] || 3) - (rankMap[b.skillLevel] || 3));
      renderSlotCandidateButtons(listJaEl, allDocs);
      listJa.push(...allDocs);
    } else {
      wrapperAlt.classList.remove('hidden');
      document.getElementById('candidateFilterHeaderTitle').innerText = filter ? `Kandidaten voor Slot ${filter.slotIndex + 1} op ${filter.dayName}:` : "Klik op een GAT (bijv. Wo) om te filteren:";
      document.getElementById('labelSlotCandJa').innerText = "🟢 Hele Week Ingeschreven";
      
      const tourIns = (adminData.onTourInschrijvingen || []).filter(i => i.tourId === item.tourId);
      tourIns.forEach(ins => {
        const doc = adminData.docenten.find(d => d.id === ins.docentId);
        if (doc && !doc.isPlanner) {
          const daysArr = ins.gekozenDagen ? ins.gekozenDagen.split(", ") : [];
          if (ins.status === "HELE_WEEK") listJa.push(doc);
          else if (ins.status === "DEELS" && (!filter || daysArr.includes(filter.dayName))) listAlt.push({ ...doc, matchedDays: daysArr.join(', ') });
        }
      });
      const sortFn = (a, b) => {
        if (a.alleenOnTour && !b.alleenOnTour) return -1;
        if (!a.alleenOnTour && b.alleenOnTour) return 1;
        return (rankMap[a.skillLevel] || 3) - (rankMap[b.skillLevel] || 3);
      };
      listJa.sort(sortFn); 
      listAlt.sort(sortFn);
      renderSlotCandidateButtons(listJaEl, listJa);
      renderSlotCandidateButtons(listAltEl, listAlt);
    }
  }

  const cntJa = document.getElementById('countSlotCandJa');
  const cntAlt = document.getElementById('countSlotCandAlt');
  if (cntJa) cntJa.innerText = listJa.length;
  if (cntAlt) cntAlt.innerText = listAlt.length;
}

function renderSlotCandidateButtons(container, list) {
  if (list.length === 0) { container.innerHTML = `<div class="text-[11px] text-slate-400 p-2">Geen kandidaten gevonden.</div>`; return; }
  list.forEach(doc => {
    const div = document.createElement('div');
    div.className = "p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border flex items-center justify-between text-xs";
    div.innerHTML = `
      <div>
        <div class="font-bold flex items-center gap-1"><span>${doc.naam}</span>${doc.alleenOnTour ? '<span class="text-[9px] bg-amber-100 text-amber-900 px-1 rounded">⭐ Tour Specialist</span>' : ''}</div>
        <div class="text-[10px] text-slate-500">Skill: ${doc.skillLevel} ${doc.matchedDays ? `<strong class="text-amber-700">(${doc.matchedDays})</strong>` : ''}</div>
      </div>
      <button onclick="assignDocentToNextSlot('${doc.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition">Koppel</button>
    `;
    container.appendChild(div);
  });
}

async function assignDocentToNextSlot(docentId) {
  const item = currentSlotTarget.item;
  if (currentSlotTarget.type === 'PLANNING') {
    const assigned = [...(item.toegewezenDocentIDs || [])];
    if (assigned.length >= item.aantalNodig || assigned.includes(docentId)) return;
    assigned.push(docentId);
    item.toegewezenDocentIDs = assigned;
    renderSlotManagerSlots();
    renderSlotManagerCandidates();
    await apiCall("", "POST", { action: "adminUpdatePlanningAssignments", adminPin: ADMIN_SECRET, planningId: item.planningId, toegewezenDocentIds: assigned });
  } else {
    const filter = currentSlotTarget.selectedDayFilter;
    let slotsArray = item.slotAssignments || [];
    const targetSlotIdx = filter ? filter.slotIndex : 0;
    let slotObj = slotsArray.find(x => x.slotIndex === targetSlotIdx);
    if (!slotObj) { slotObj = { slotIndex: targetSlotIdx, dayDocents: {} }; slotsArray.push(slotObj); }

    const tourIns = (adminData.onTourInschrijvingen || []).find(i => i.tourId === item.tourId && i.docentId === docentId);
    const dayNamesMap = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
    let c = new Date(item.startDatum);
    const eDate = new Date(item.eindDatum);

    if (filter) {
      slotObj.dayDocents[filter.dayIso] = docentId;
    } else {
      while (c <= eDate) {
        if (c.getDay() >= 1 && c.getDay() <= 5) {
          const dName = dayNamesMap[c.getDay()];
          const iso = normalizeDateStr(c);
          if (emergencyOverrideAllDocents || (tourIns && (tourIns.status === "HELE_WEEK" || (tourIns.gekozenDagen || "").includes(dName)))) {
            if (!slotObj.dayDocents[iso]) slotObj.dayDocents[iso] = docentId;
          }
        }
        c.setDate(c.getDate() + 1);
      }
    }
    item.slotAssignments = slotsArray;
    renderSlotManagerSlots();
    renderSlotManagerCandidates();
    await apiCall("", "POST", { action: "updateOnTourSlotAssignments", adminPin: ADMIN_SECRET, tourId: item.tourId, slotAssignments: slotsArray });
  }
  await loadAdminData();
}

async function unassignDocentFromSlot(docentId) {
  const item = currentSlotTarget.item;
  item.toegewezenDocentIDs = (item.toegewezenDocentIDs || []).filter(id => id !== docentId);
  renderSlotManagerSlots();
  renderSlotManagerCandidates();
  await apiCall("", "POST", { action: "adminUpdatePlanningAssignments", adminPin: ADMIN_SECRET, planningId: item.planningId, toegewezenDocentIds: item.toegewezenDocentIDs });
  await loadAdminData();
}

async function unassignOnTourDaySlot(slotIndex, dayIso) {
  const item = currentSlotTarget.item;
  let slotObj = (item.slotAssignments || []).find(x => x.slotIndex === slotIndex);
  if (slotObj && slotObj.dayDocents) delete slotObj.dayDocents[dayIso];
  renderSlotManagerSlots();
  renderSlotManagerCandidates();
  await apiCall("", "POST", { action: "updateOnTourSlotAssignments", adminPin: ADMIN_SECRET, tourId: item.tourId, slotAssignments: item.slotAssignments });
  await loadAdminData();
}

function renderPlannerOnToursList() {
  const container = document.getElementById('plannerOnToursList');
  if (!container) return;
  container.innerHTML = "";

  const tours = adminData.onTours || [];
  if (tours.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">Geen actieve On Tours ingepland.</div>`;
    return;
  }

  tours.forEach(tour => {
    const card = document.createElement('div');
    card.className = "p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm text-xs cursor-pointer transition flex flex-col justify-between space-y-2";
    card.onclick = () => openSlotManagerModal('ONTOUR', tour.tourId);

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-extrabold text-slate-900 truncate">${tour.schoolNaam}</span>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${tour.status === 'BEZET' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'}">${tour.status}</span>
      </div>
      <div class="text-slate-500 text-[11px]">
        📅 ${formatPeriodNl(tour.startDatum, tour.eindDatum)} ${tour.locatie ? `• 📍 ${tour.locatie}` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}
