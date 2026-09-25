/* =========================================================
   SUMANVOLT // GATE 2027 CE COMMAND CENTER
   app.js — state, rendering, countdown, chart, undo, PWA
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. CONSTANTS & PERSONAL PROFILE
  --------------------------------------------------------- */
  const STORAGE_KEY = 'sumanvolt_gate2027_state_v1';
  const GATE_TARGET_DATE = new Date('2027-02-06T09:30:00+05:30'); // first exam day, session 1 (IST)

  const PROFILE = {
    enrollment: 'M346V23'
  };

  const MOTIVATION_LINES = [
    `SUMAN. M346V23 DOESN'T RANK ITSELF. THE GRIND DOESN'T PAUSE. GO.`,
    `70+ IN CE IS A FLOOR, NOT A CEILING. ONE MORE SUBTOPIC.`,
    `NO SHORTCUT TO A GATE RANK. ONLY REPS. LOG THE NEXT ONE.`,
    `WEAK ZONES DON'T FIX THEMSELVES. CHECK THE PLAN TAB AND GO.`,
    `EVERY PYQ SOLVED TODAY IS A MARK BANKED FOR FEBRUARY.`
  ];

  /* ---------------------------------------------------------
     1. SYLLABUS DATA (ordered by weightage, highest first)
  --------------------------------------------------------- */
  const SYLLABUS_DATA = [
    {
      id: 'ge',
      title: 'Geotechnical Engineering',
      weight: '~12–15 marks',
      subtopics: [
        'Soil classification & index properties',
        'Permeability & seepage',
        'Effective stress & consolidation',
        'Shear strength of soils',
        'Bearing capacity of shallow foundations',
        'Deep foundations (piles)',
        'Slope stability',
        'Earth pressure theories'
      ]
    },
    {
      id: 'em',
      title: 'Engineering Mathematics',
      weight: '~13–15 marks',
      subtopics: [
        'Linear algebra',
        'Calculus (single & multivariable)',
        'Ordinary differential equations',
        'Probability & statistics',
        'Numerical methods',
        'Partial differential equations & complex variables'
      ]
    },
    {
      id: 'ga',
      title: 'General Aptitude',
      weight: '~15 marks',
      subtopics: [
        'Verbal ability & reading comprehension',
        'Numerical ability & data interpretation',
        'Quantitative reasoning',
        'Analytical & logical reasoning'
      ]
    },
    {
      id: 'sa',
      title: 'Structural Analysis & Solid Mechanics',
      weight: '~10–12 marks',
      subtopics: [
        'Stress-strain & Mohr\'s circle',
        'SFD & BMD',
        'Deflection of beams',
        'Analysis of trusses',
        'Slope-deflection & moment distribution',
        'Influence lines',
        'RCC design basics (limit state)',
        'Steel design basics'
      ]
    },
    {
      id: 'env',
      title: 'Environmental Engineering',
      weight: '~10–12 marks',
      subtopics: [
        'Water demand & quality parameters',
        'Water treatment unit processes',
        'Wastewater characteristics & BOD/COD',
        'Sewage treatment & disposal',
        'Air pollution & control',
        'Municipal solid waste management'
      ]
    },
    {
      id: 'te',
      title: 'Transportation Engineering',
      weight: '~8–10 marks',
      subtopics: [
        'Highway geometric design',
        'Pavement materials & mix design',
        'Flexible & rigid pavement design',
        'Traffic engineering & studies',
        'Highway construction & maintenance',
        'Railway & airport engineering basics'
      ]
    },
    {
      id: 'fm',
      title: 'Fluid Mechanics & Hydraulics',
      weight: '~8–10 marks',
      subtopics: [
        'Fluid properties & pressure',
        'Fluid kinematics & dynamics',
        'Flow through pipes',
        'Open channel flow',
        'Dimensional analysis & hydraulic machines',
        'Boundary layer theory'
      ]
    },
    {
      id: 'hi',
      title: 'Highway & Irrigation / Hydrology',
      weight: '~6–8 marks',
      subtopics: [
        'Hydrologic cycle & rainfall analysis',
        'Runoff & unit hydrograph',
        'Flood routing & reservoir capacity',
        'Canal design & irrigation methods',
        'Groundwater hydrology'
      ]
    },
    {
      id: 'sv',
      title: 'Surveying',
      weight: '~4–6 marks',
      subtopics: [
        'Levelling & contouring',
        'Theodolite & traversing',
        'Curves (horizontal/vertical)',
        'Total station & GPS basics',
        'Errors & adjustments'
      ]
    },
    {
      id: 'cm',
      title: 'Construction Materials & Management',
      weight: '~4–6 marks',
      subtopics: [
        'Cement, concrete & aggregates',
        'Concrete technology & testing',
        'Bricks, steel & timber',
        'CPM / PERT network analysis',
        'Cost estimation & tendering'
      ]
    }
  ];

  const CHECK_KINDS = ['theory', 'pyq', 'notes', 'revision'];
  const CHECK_LABELS = { theory: 'THEORY', pyq: 'PYQ', notes: 'NOTES', revision: 'REV' };

  /* ---------------------------------------------------------
     2. STATE
  --------------------------------------------------------- */
  function slugify(subjectId, subtopicIndex) {
    return subjectId + '__' + subtopicIndex;
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function buildDefaultState() {
    const syllabus = {};
    SYLLABUS_DATA.forEach((subj) => {
      subj.subtopics.forEach((_, i) => {
        syllabus[slugify(subj.id, i)] = { theory: false, pyq: false, notes: false, revision: false };
      });
    });
    return {
      syllabus,
      mocks: [],
      openSubjects: {},
      plan: {
        date: todayStr(),
        dailyTarget: 50,
        solvedToday: 0,
        tasks: []
      },
      lastSync: Date.now()
    };
  }

  let state = loadState();
  rolloverPlanIfNewDay();

  function rolloverPlanIfNewDay() {
    const today = todayStr();
    if (!state.plan) {
      state.plan = { date: today, dailyTarget: 50, solvedToday: 0, tasks: [] };
      return;
    }
    if (state.plan.date !== today) {
      // Bullet-journal style migration: incomplete tasks carry forward, completed ones clear, counters reset.
      state.plan.tasks = (state.plan.tasks || []).filter((t) => !t.done);
      state.plan.solvedToday = 0;
      state.plan.date = today;
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return buildDefaultState();
      const parsed = JSON.parse(raw);
      const fallback = buildDefaultState();
      // merge to survive schema upgrades (new subtopics/subjects added later)
      return {
        syllabus: Object.assign({}, fallback.syllabus, parsed.syllabus || {}),
        mocks: Array.isArray(parsed.mocks) ? parsed.mocks : [],
        openSubjects: parsed.openSubjects || {},
        plan: parsed.plan && typeof parsed.plan === 'object'
          ? {
              date: parsed.plan.date || todayStr(),
              dailyTarget: typeof parsed.plan.dailyTarget === 'number' ? parsed.plan.dailyTarget : 50,
              solvedToday: typeof parsed.plan.solvedToday === 'number' ? parsed.plan.solvedToday : 0,
              tasks: Array.isArray(parsed.plan.tasks) ? parsed.plan.tasks : []
            }
          : fallback.plan,
        lastSync: parsed.lastSync || Date.now()
      };
    } catch (e) {
      console.error('SUMANVOLT: failed to load state, resetting.', e);
      return buildDefaultState();
    }
  }

  let saveTimer = null;
  function saveState(immediate) {
    setSyncBusy(true);
    const doSave = () => {
      try {
        state.lastSync = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSyncBusy(false);
        updateSyncLabel();
      } catch (e) {
        console.error('SUMANVOLT: save failed', e);
        setSyncBusy(false);
        setSyncLabel('LOCAL SYNC: ERROR', true);
      }
    };
    if (immediate) { doSave(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 250);
  }

  /* ---------------------------------------------------------
     3. UNDO SYSTEM (generic snapshot-based)
  --------------------------------------------------------- */
  let pendingUndo = null; // { snapshot, message, timeoutId }

  function pushUndo(message) {
    // capture a deep snapshot BEFORE the mutating action is applied by caller
    const snapshot = JSON.parse(JSON.stringify(state));
    if (pendingUndo && pendingUndo.timeoutId) clearTimeout(pendingUndo.timeoutId);
    pendingUndo = { snapshot, message };
    showUndoToast(message);
  }

  function showUndoToast(message) {
    const toast = document.getElementById('undo-toast');
    const msg = document.getElementById('undo-message');
    msg.textContent = message;
    toast.classList.remove('hidden');
    if (pendingUndo) {
      pendingUndo.timeoutId = setTimeout(() => {
        toast.classList.add('hidden');
        pendingUndo = null;
      }, 6000);
    }
  }

  document.getElementById('undo-btn').addEventListener('click', () => {
    if (!pendingUndo) return;
    clearTimeout(pendingUndo.timeoutId);
    state = pendingUndo.snapshot;
    pendingUndo = null;
    document.getElementById('undo-toast').classList.add('hidden');
    saveState(true);
    renderAll();
  });

  /* ---------------------------------------------------------
     4. COUNTDOWN
  --------------------------------------------------------- */
  function tickCountdown() {
    const now = new Date();
    let diff = GATE_TARGET_DATE.getTime() - now.getTime();
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    document.getElementById('cd-days').textContent = String(days).padStart(3, '0');
    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0');
    document.getElementById('cd-secs').textContent = String(secs).padStart(2, '0');
  }
  setInterval(tickCountdown, 1000);
  tickCountdown();

  /* ---------------------------------------------------------
     5. MOTIVATION BANNER (rotates)
  --------------------------------------------------------- */
  let motivationIdx = 0;
  function rotateMotivation() {
    const el = document.getElementById('motivation-line');
    el.textContent = MOTIVATION_LINES[motivationIdx % MOTIVATION_LINES.length];
    motivationIdx++;
  }
  rotateMotivation();
  setInterval(rotateMotivation, 9000);

  /* ---------------------------------------------------------
     6. TABS
  --------------------------------------------------------- */
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('is-active');
      if (btn.dataset.tab === 'mocks') drawChart();
      if (btn.dataset.tab === 'plan') renderWeakZones();
    });
  });

  /* ---------------------------------------------------------
     7. SYLLABUS RENDERING
  --------------------------------------------------------- */
  function computeSubjectProgress(subj) {
    let total = 0;
    let done = 0;
    subj.subtopics.forEach((_, i) => {
      const rec = state.syllabus[slugify(subj.id, i)] || {};
      CHECK_KINDS.forEach((kind) => {
        total++;
        if (rec[kind]) done++;
      });
    });
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  function computeGlobalProgress() {
    let total = 0;
    let done = 0;
    SYLLABUS_DATA.forEach((subj) => {
      subj.subtopics.forEach((_, i) => {
        const rec = state.syllabus[slugify(subj.id, i)] || {};
        CHECK_KINDS.forEach((kind) => {
          total++;
          if (rec[kind]) done++;
        });
      });
    });
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  function renderGlobalProgress() {
    const pct = computeGlobalProgress();
    document.getElementById('global-progress-pct').textContent = pct + '%';
    document.getElementById('global-progress-fill').style.width = pct + '%';
  }

  function renderSyllabus() {
    const container = document.getElementById('syllabus-list');
    container.innerHTML = '';

    SYLLABUS_DATA.forEach((subj, subjIndex) => {
      const isOpen = !!state.openSubjects[subj.id];
      const pct = computeSubjectProgress(subj);

      const card = document.createElement('div');
      card.className = 'subject-card' + (isOpen ? ' is-open' : '');
      card.dataset.subjectId = subj.id;

      const head = document.createElement('div');
      head.className = 'subject-card__head';
      head.innerHTML = `
        <div class="subject-card__title-wrap">
          <span class="subject-rank">${String(subjIndex + 1).padStart(2, '0')}</span>
          <span class="subject-title">${subj.title}</span>
          <span class="subject-weight">${subj.weight}</span>
        </div>
        <div class="subject-card__meta">
          <div class="subject-mini-bar"><div class="subject-mini-bar__fill" style="width:${pct}%"></div></div>
          <span class="subject-pct">${pct}%</span>
          <span class="subject-caret">▾</span>
        </div>
      `;
      head.addEventListener('click', () => {
        state.openSubjects[subj.id] = !state.openSubjects[subj.id];
        saveState();
        card.classList.toggle('is-open');
      });

      const body = document.createElement('div');
      body.className = 'subject-card__body';

      subj.subtopics.forEach((name, i) => {
        const key = slugify(subj.id, i);
        const rec = state.syllabus[key] || { theory: false, pyq: false, notes: false, revision: false };

        const row = document.createElement('div');
        row.className = 'subtopic-row';

        const nameEl = document.createElement('div');
        nameEl.className = 'subtopic-name';
        nameEl.textContent = name;
        row.appendChild(nameEl);

        const checkRow = document.createElement('div');
        checkRow.className = 'check-row';

        CHECK_KINDS.forEach((kind) => {
          const wrap = document.createElement('div');
          wrap.className = 'check-wrap';
          const label = document.createElement('span');
          label.className = 'check-label';
          label.textContent = CHECK_LABELS[kind];
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'brut-checkbox';
          cb.dataset.kind = kind;
          cb.checked = !!rec[kind];
          cb.setAttribute('aria-label', name + ' — ' + CHECK_LABELS[kind]);
          cb.addEventListener('change', () => {
            const newVal = cb.checked;
            const shortName = name.slice(0, 26) + (name.length > 26 ? '…' : '');
            pushUndo((newVal ? 'CHECKED ' : 'UNCHECKED ') + '"' + shortName + '" · ' + CHECK_LABELS[kind]);

            state.syllabus[key] = state.syllabus[key] || { theory: false, pyq: false, notes: false, revision: false };
            state.syllabus[key][kind] = newVal;
            saveState();
            renderGlobalProgress();
            updateSubjectCardInPlace(card, subj);
          });
          wrap.appendChild(label);
          wrap.appendChild(cb);
          checkRow.appendChild(wrap);
        });

        row.appendChild(checkRow);
        body.appendChild(row);
      });

      card.appendChild(head);
      card.appendChild(body);
      container.appendChild(card);
    });
  }

  function updateSubjectCardInPlace(card, subj) {
    const pct = computeSubjectProgress(subj);
    card.querySelector('.subject-mini-bar__fill').style.width = pct + '%';
    card.querySelector('.subject-pct').textContent = pct + '%';
  }

  /* ---------------------------------------------------------
     8. MOCKS
  --------------------------------------------------------- */
  function mockPct(m) {
    if (!m.total || m.total <= 0) return 0;
    return Math.round((m.marks / m.total) * 1000) / 10;
  }

  function renderMockList() {
    const container = document.getElementById('mock-list');
    container.innerHTML = '';
    if (state.mocks.length === 0) {
      container.innerHTML = '<div class="mock-empty">NO MOCKS LOGGED YET.</div>';
      return;
    }
    const sorted = [...state.mocks].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'mock-row';
      row.innerHTML = `
        <div class="mock-row__info">
          <span class="mock-row__name">${escapeHtml(m.name)}</span>
          <span class="mock-row__meta">${escapeHtml(m.date)} · ${m.marks}/${m.total}${m.notes ? ' · ' + escapeHtml(m.notes) : ''}</span>
        </div>
        <div class="mock-row__score">
          <span class="mock-row__pct">${mockPct(m)}%</span>
          <button class="mock-row__del" data-id="${m.id}" aria-label="Delete ${escapeHtml(m.name)}">✕</button>
        </div>
      `;
      row.querySelector('.mock-row__del').addEventListener('click', () => {
        pushUndo('DELETED MOCK "' + m.name.slice(0, 24) + (m.name.length > 24 ? '…' : '') + '"');
        state.mocks = state.mocks.filter((x) => x.id !== m.id);
        saveState();
        renderMockList();
        drawChart();
      });
      container.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  document.getElementById('mock-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('mock-name').value.trim();
    const date = document.getElementById('mock-date').value;
    const marks = parseFloat(document.getElementById('mock-marks').value);
    const total = parseFloat(document.getElementById('mock-total').value);
    const notes = document.getElementById('mock-notes').value.trim();

    if (!name || !date || isNaN(marks) || isNaN(total) || total <= 0) return;

    state.mocks.push({
      id: 'mock_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name, date, marks, total, notes
    });
    saveState();
    renderMockList();
    drawChart();
    e.target.reset();
  });

  /* ---------------------------------------------------------
     9. CANVAS LINE CHART (no libraries)
  --------------------------------------------------------- */
  function drawChart() {
    const canvas = document.getElementById('mock-canvas');
    const emptyEl = document.getElementById('chart-empty');
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 900;
    const cssHeight = 360;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const sorted = [...state.mocks].sort((a, b) => new Date(a.date) - new Date(b.date));

    document.getElementById('mock-avg').textContent = sorted.length
      ? 'AVG: ' + (sorted.reduce((s, m) => s + mockPct(m), 0) / sorted.length).toFixed(1) + '%'
      : 'AVG: —';

    if (sorted.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    const padding = { top: 24, right: 20, bottom: 40, left: 46 };
    const plotW = cssWidth - padding.left - padding.right;
    const plotH = cssHeight - padding.top - padding.bottom;

    // axes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + plotH);
    ctx.lineTo(padding.left + plotW, padding.top + plotH);
    ctx.stroke();

    // gridlines + y labels (0,25,50,75,100)
    ctx.font = '700 11px "Space Mono", monospace';
    ctx.fillStyle = '#000000';
    [0, 25, 50, 75, 100].forEach((val) => {
      const y = padding.top + plotH - (val / 100) * plotH;
      ctx.strokeStyle = '#EDEDED';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
      ctx.stroke();
      ctx.fillText(val + '%', 6, y + 4);
    });

    // points
    const n = sorted.length;
    const points = sorted.map((m, i) => {
      const x = n === 1 ? padding.left + plotW / 2 : padding.left + (i / (n - 1)) * plotW;
      const y = padding.top + plotH - (Math.min(mockPct(m), 100) / 100) * plotH;
      return { x, y, m };
    });

    // line
    ctx.strokeStyle = '#FF5757';
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // points + labels
    points.forEach((p, i) => {
      ctx.fillStyle = '#CCFF00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = '700 11px "Space Mono", monospace';
      const label = mockPct(p.m) + '%';
      ctx.textAlign = 'center';
      ctx.fillText(label, p.x, p.y - 14);

      // x axis date label (skip crowding on many points)
      if (n <= 12 || i % Math.ceil(n / 12) === 0) {
        ctx.save();
        ctx.translate(p.x, padding.top + plotH + 16);
        ctx.font = '400 10px "Space Mono", monospace';
        ctx.fillText(shortDate(p.m.date), 0, 0);
        ctx.restore();
      }
    });
    ctx.textAlign = 'left';
  }

  function shortDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  window.addEventListener('resize', debounce(() => {
    if (document.getElementById('tab-mocks').classList.contains('is-active')) drawChart();
  }, 200));

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* ---------------------------------------------------------
     10. PLAN TOMORROW — weak-zone prioritization + daily
         question target + task migration (bullet-journal style)
  --------------------------------------------------------- */
  function getWeakestSubjects(n) {
    return [...SYLLABUS_DATA]
      .map((subj) => ({ subj, pct: computeSubjectProgress(subj) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, n);
  }

  function renderWeakZones() {
    const container = document.getElementById('weak-zones-list');
    container.innerHTML = '';
    getWeakestSubjects(3).forEach(({ subj, pct }) => {
      const chip = document.createElement('div');
      chip.className = 'weak-zone-chip';
      chip.textContent = subj.title;
      const span = document.createElement('span');
      span.textContent = pct + '%';
      chip.appendChild(span);
      container.appendChild(chip);
    });
  }

  function populateTaskSubjectSelect() {
    const select = document.getElementById('task-subject');
    select.innerHTML = '';
    SYLLABUS_DATA.forEach((subj) => {
      const opt = document.createElement('option');
      opt.value = subj.id;
      opt.textContent = subj.title;
      select.appendChild(opt);
    });
  }

  function renderPlanTarget() {
    const target = Math.max(0, state.plan.dailyTarget || 0);
    const solved = Math.max(0, state.plan.solvedToday || 0);
    const pct = target === 0 ? 0 : Math.min(100, Math.round((solved / target) * 100));
    document.getElementById('target-pct').textContent = pct + '%';
    document.getElementById('target-fill').style.width = pct + '%';
    document.getElementById('solved-count').textContent = solved;
    document.getElementById('daily-target').value = target;
  }

  function subjectTitleById(id) {
    const s = SYLLABUS_DATA.find((x) => x.id === id);
    return s ? s.title : id;
  }

  function renderTaskList() {
    const container = document.getElementById('task-list');
    container.innerHTML = '';
    const tasks = state.plan.tasks || [];
    const done = tasks.filter((t) => t.done).length;
    document.getElementById('task-count').textContent = done + '/' + tasks.length;

    if (tasks.length === 0) {
      container.innerHTML = '<div class="task-empty">NO TASKS QUEUED. ADD ONE ABOVE — WEAK ZONES FIRST.</div>';
      return;
    }

    tasks.forEach((task) => {
      const row = document.createElement('div');
      row.className = 'task-row' + (task.done ? ' is-done' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'task-row__check';
      cb.checked = !!task.done;
      cb.setAttribute('aria-label', 'Mark task done: ' + task.label);
      cb.addEventListener('change', () => {
        const newVal = cb.checked;
        pushUndo((newVal ? 'COMPLETED ' : 'REOPENED ') + 'TASK "' + task.label.slice(0, 26) + '"');
        task.done = newVal;
        saveState();
        renderTaskList();
      });

      const info = document.createElement('div');
      info.className = 'task-row__info';
      const labelEl = document.createElement('div');
      labelEl.className = 'task-row__label';
      labelEl.textContent = task.label;
      const metaEl = document.createElement('div');
      metaEl.className = 'task-row__meta';
      metaEl.textContent = subjectTitleById(task.subject) + ' · ' + CHECK_LABELS[task.kind];
      info.appendChild(labelEl);
      info.appendChild(metaEl);

      const delBtn = document.createElement('button');
      delBtn.className = 'task-row__del';
      delBtn.setAttribute('aria-label', 'Delete task ' + task.label);
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        pushUndo('DELETED TASK "' + task.label.slice(0, 26) + '"');
        state.plan.tasks = state.plan.tasks.filter((t) => t.id !== task.id);
        saveState();
        renderTaskList();
      });

      row.appendChild(cb);
      row.appendChild(info);
      row.appendChild(delBtn);
      container.appendChild(row);
    });
  }

  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const subject = document.getElementById('task-subject').value;
    const kind = document.getElementById('task-kind').value;
    const label = document.getElementById('task-label').value.trim();
    if (!subject || !label) return;
    state.plan.tasks.push({
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      subject, kind, label, done: false
    });
    saveState();
    renderTaskList();
    e.target.reset();
  });

  document.getElementById('daily-target').addEventListener('change', (e) => {
    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
    state.plan.dailyTarget = val;
    saveState();
    renderPlanTarget();
  });

  function adjustSolved(delta) {
    state.plan.solvedToday = Math.max(0, (state.plan.solvedToday || 0) + delta);
    saveState();
    renderPlanTarget();
  }
  document.getElementById('solved-plus').addEventListener('click', () => adjustSolved(1));
  document.getElementById('solved-plus5').addEventListener('click', () => adjustSolved(5));
  document.getElementById('solved-minus').addEventListener('click', () => adjustSolved(-1));

  /* ---------------------------------------------------------
     11. SYNC MENU: force sync / export / import / reset
  --------------------------------------------------------- */
  const syncBtn = document.getElementById('sync-btn');
  const syncMenu = document.getElementById('sync-menu');
  const syncDot = document.getElementById('sync-dot');
  const syncLabel = document.getElementById('sync-label');

  syncBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    syncMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!syncMenu.contains(e.target) && e.target !== syncBtn) syncMenu.classList.add('hidden');
  });

  function setSyncBusy(busy) {
    syncDot.classList.toggle('is-busy', busy);
  }
  function setSyncLabel(text) {
    syncLabel.textContent = text;
  }
  function updateSyncLabel() {
    const d = new Date(state.lastSync);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setSyncLabel('SYNCED ' + hh + ':' + mm);
  }

  document.getElementById('sync-force').addEventListener('click', () => {
    syncMenu.classList.add('hidden');
    setSyncBusy(true);
    setSyncLabel('SYNCING…');
    setTimeout(() => {
      saveState(true);
    }, 500);
  });

  document.getElementById('sync-export').addEventListener('click', () => {
    syncMenu.classList.add('hidden');
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sumanvolt-gate2027-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const importFileInput = document.getElementById('import-file');
  document.getElementById('sync-import').addEventListener('click', () => {
    syncMenu.classList.add('hidden');
    importFileInput.click();
  });
  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        pushUndo('IMPORTED BACKUP (PREVIOUS STATE SAVED)');
        const fallback = buildDefaultState();
        state = {
          syllabus: Object.assign({}, fallback.syllabus, parsed.syllabus || {}),
          mocks: Array.isArray(parsed.mocks) ? parsed.mocks : [],
          openSubjects: parsed.openSubjects || {},
          plan: parsed.plan && typeof parsed.plan === 'object'
            ? {
                date: parsed.plan.date || todayStr(),
                dailyTarget: typeof parsed.plan.dailyTarget === 'number' ? parsed.plan.dailyTarget : 50,
                solvedToday: typeof parsed.plan.solvedToday === 'number' ? parsed.plan.solvedToday : 0,
                tasks: Array.isArray(parsed.plan.tasks) ? parsed.plan.tasks : []
              }
            : fallback.plan,
          lastSync: Date.now()
        };
        rolloverPlanIfNewDay();
        saveState(true);
        renderAll();
      } catch (err) {
        alert('IMPORT FAILED: invalid JSON file.');
      }
    };
    reader.readAsText(file);
    importFileInput.value = '';
  });

  /* ---------------------------------------------------------
     12. CONFIRM MODAL (used for destructive reset)
  --------------------------------------------------------- */
  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmBody = document.getElementById('confirm-body');
  let confirmCallback = null;

  function openConfirm(title, body, onOk) {
    confirmTitle.textContent = title;
    confirmBody.textContent = body;
    confirmCallback = onOk;
    confirmModal.classList.remove('hidden');
  }
  document.getElementById('confirm-cancel').addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    confirmCallback = null;
  });
  document.getElementById('confirm-ok').addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  document.getElementById('sync-reset').addEventListener('click', () => {
    syncMenu.classList.add('hidden');
    openConfirm(
      'RESET ALL DATA?',
      'This wipes syllabus progress, mock logs and tomorrow\'s plan on this device. This action can still be undone once via the UNDO toast immediately after.',
      () => {
        pushUndo('RESET ALL DATA');
        state = buildDefaultState();
        saveState(true);
        renderAll();
      }
    );
  });

  /* ---------------------------------------------------------
     13. PWA INSTALL PROMPT
  --------------------------------------------------------- */
  let deferredPrompt = null;
  const installBanner = document.getElementById('install-banner');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem('sumanvolt_install_dismissed') && !isStandalone()) {
      installBanner.classList.remove('hidden');
    }
  });

  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      installBanner.classList.add('hidden');
    }
    deferredPrompt = null;
  });

  document.getElementById('install-dismiss').addEventListener('click', () => {
    installBanner.classList.add('hidden');
    localStorage.setItem('sumanvolt_install_dismissed', '1');
  });

  window.addEventListener('appinstalled', () => {
    installBanner.classList.add('hidden');
    deferredPrompt = null;
  });

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  /* ---------------------------------------------------------
     14. SERVICE WORKER REGISTRATION
  --------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('SUMANVOLT: service worker registration failed', err);
      });
    });
  }

  /* ---------------------------------------------------------
     15. INIT
  --------------------------------------------------------- */
  function renderAll() {
    renderGlobalProgress();
    renderSyllabus();
    renderMockList();
    drawChart();
    renderWeakZones();
    renderPlanTarget();
    renderTaskList();
    updateSyncLabel();
  }

  populateTaskSubjectSelect();
  renderAll();
  updateSyncLabel();
  saveState(true); // persist any day-rollover migration from init

})();
