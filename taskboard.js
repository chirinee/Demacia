/* =====================================================
   DEMACIA — taskboard.js
   Kanban style ClickUp : colonnes, cartes, drag-drop,
   panneau de détail, datepicker, ajout groupe/tâche.
===================================================== */

let tbColumns = [
    { id: 'todo',       label: 'À FAIRE',   color: '#7c828d', tasks: [
        { id: 'tb1', name: 'Préparer check-list finale', assignee: 'Lila', dateStart: demoDate('2026-06-28'), dateEnd: demoDate('2026-06-30'), priority: 'normal', time: '2h', tags: 'Jour J', subtasks: 0, desc: '' }
    ]},
    { id: 'inprogress', label: 'EN COURS',  color: '#5fccff', tasks: [
        { id: 'tb2', name: 'Valider le traiteur', assignee: 'Sarah', dateStart: demoDate('2026-06-23'), dateEnd: demoDate('2026-06-25'), priority: 'urgent', time: '1h', tags: 'Logistique', subtasks: 1, desc: 'Contacter Maison Lefèvre, confirmer menu 150 personnes.' }
    ]},
    { id: 'review',     label: 'REVUE',     color: '#a855f7', tasks: [] },
    { id: 'done',       label: 'ACHEVÉ',    color: '#22c55e', tasks: [
        { id: 'tb3', name: 'Réservation salle', assignee: 'Sarah', dateStart: demoDate('2026-06-01'), dateEnd: demoDate('2026-06-05'), priority: 'normal', time: '', tags: '', subtasks: 0, desc: 'Contrat signé.' }
    ]}
];

let tbDragSrc       = null;
let tbCurrentTask   = null;
let tbPendingDelete = null;
let tbPickerTarget  = null;
let tbDpYear  = 2026;
let tbDpMonth = 3;
let tbSelectedColor = '#7c828d';

// Filtres taskboard
let tbFilter = { priority: '', assignee: '', text: '' };
// État du menu colonne actif
let tbColMenuOpen = null;
// Suppression de colonne en attente
let tbPendingColDelete = null;

/* ─── Recherche permanente en haut du taskboard ─── */
function onTaskboardSearch(value) {
    tbFilter.text = (value || '').trim();
    const clear = document.getElementById('tb-search-clear');
    if (clear) clear.classList.toggle('hidden', !tbFilter.text);

    // Synchroniser avec le bouton "Filtrer" pour cohérence visuelle
    const btn   = document.getElementById('tb-filter-btn');
    const label = document.getElementById('tb-filter-label');
    const filterClear = document.getElementById('tb-filter-clear');
    if (tbFilterActive()) {
        btn?.classList.add('active');
        if (label) {
            const parts = [];
            if (tbFilter.priority) parts.push(tbFilter.priority);
            if (tbFilter.assignee) parts.push(tbFilter.assignee);
            if (tbFilter.text)     parts.push('"' + tbFilter.text + '"');
            label.textContent = 'Filtré : ' + parts.join(' · ');
        }
        filterClear?.classList.remove('hidden');
    } else {
        btn?.classList.remove('active');
        if (label) label.textContent = 'Filtrer';
        filterClear?.classList.add('hidden');
    }

    renderBoard();
    updateSearchCount();
}

function clearTaskboardSearch() {
    tbFilter.text = '';
    const input = document.getElementById('tb-search-input');
    if (input) input.value = '';
    const clear = document.getElementById('tb-search-clear');
    if (clear) clear.classList.add('hidden');
    onTaskboardSearch('');
}

function updateSearchCount() {
    const counter = document.getElementById('tb-search-count');
    if (!counter) return;
    if (tbFilter.text) {
        let total = 0;
        tbColumns.forEach(c => {
            c.tasks.forEach(t => {
                if (tbColMatchesFilter(t)) total++;
            });
        });
        counter.textContent = total + ' résultat' + (total !== 1 ? 's' : '');
        counter.classList.remove('hidden');
    } else {
        counter.textContent = '';
        counter.classList.add('hidden');
    }
}

function tbColMatchesFilter(task) {
    if (tbFilter.priority && task.priority !== tbFilter.priority) return false;
    if (tbFilter.assignee && (task.assignee || '').toLowerCase().indexOf(tbFilter.assignee.toLowerCase()) === -1) return false;
    if (tbFilter.text) {
        const txt = tbFilter.text.toLowerCase();
        const hay = ((task.name || '') + ' ' + (task.tags || '') + ' ' + (task.desc || '')).toLowerCase();
        if (hay.indexOf(txt) === -1) return false;
    }
    return true;
}

function tbFilterActive() {
    return !!(tbFilter.priority || tbFilter.assignee || tbFilter.text);
}

function renderBoard() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;
    board.innerHTML = '';
    tbColumns.forEach(col => board.appendChild(buildCol(col)));

    if (canDo('taskboard.addGroup')) {
        const ghost = document.createElement('button');
        ghost.className = 'add-col-ghost';
        ghost.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter un groupe`;
        ghost.addEventListener('click', openGroupModal);
        board.appendChild(ghost);
    }
}

function buildCol(col) {
    const el = document.createElement('div');
    el.className = 'k-col';
    el.dataset.colId = col.id;

    // Comptage des tâches visibles selon filtre
    const visibleTasks = col.tasks.filter(tbColMatchesFilter);

    const head = document.createElement('div');
    head.className = 'k-col-head';
    head.style.background = col.color;
    head.innerHTML = `
        <div class="k-col-head-left">
            <span class="k-col-name">${col.label}</span>
            <span class="k-col-count">${visibleTasks.length}${tbFilterActive() && visibleTasks.length !== col.tasks.length ? '/' + col.tasks.length : ''}</span>
        </div>
        <div class="k-col-btns">
            ${canDo('taskboard.addTask') ? `<button class="col-plus-btn" data-col="${col.id}" title="Ajouter">+</button>` : ''}
            ${canDo('taskboard.addGroup') ? `<button class="col-more-btn" data-col="${col.id}" title="Options">⋯</button>` : ''}
        </div>`;
    el.appendChild(head);

    const body = document.createElement('div');
    body.className = 'k-col-body';
    body.dataset.colId = col.id;
    visibleTasks.forEach(t => body.appendChild(buildCard(t, col)));
    el.appendChild(body);

    if (canDo('taskboard.addTask')) {
        body.appendChild(buildAddForm(col.id));
        const foot = document.createElement('div');
        foot.className = 'k-col-foot';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-task';
        addBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter une tâche`;
        addBtn.addEventListener('click', () => openAddForm(col.id));
        foot.appendChild(addBtn);
        el.appendChild(foot);
    }

    // Drag & drop
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drag-over');
        if (!tbDragSrc || tbDragSrc.colId === col.id) return;
        const src = tbColumns.find(c => c.id === tbDragSrc.colId);
        const idx = src.tasks.findIndex(t => t.id === tbDragSrc.taskId);
        if (idx === -1) return;
        const task = src.tasks.splice(idx, 1)[0];
        col.tasks.push(task);

        // Si passage en "done" : notif
        if (col.id === 'done') {
            addNotification({ title: `Tâche « ${task.name} » achevée`, level: 'success', silent: true, audience: ['sarah','lila'] });
            showToast({ title: 'Tâche achevée', message: task.name, level: 'success', duration: 2000 });
        }

        tbDragSrc = null;
        renderBoard();
        refreshDashboard();
    });

    const plusBtn = head.querySelector('.col-plus-btn');
    if (plusBtn) plusBtn.addEventListener('click', e => { e.stopPropagation(); openAddForm(col.id); });

    const moreBtn = head.querySelector('.col-more-btn');
    if (moreBtn) moreBtn.addEventListener('click', e => {
        e.stopPropagation();
        openColumnMenu(col.id, moreBtn);
    });

    return el;
}

/* ═══════════════════════════════════════════════════
   MENU ⋯ D'UNE COLONNE (renommer, couleur, supprimer)
═══════════════════════════════════════════════════ */

function openColumnMenu(colId, anchorEl) {
    // Fermer tout menu existant
    closeColumnMenu();

    const col = tbColumns.find(c => c.id === colId);
    if (!col) return;

    const menu = document.createElement('div');
    menu.className = 'col-menu';
    menu.id = 'col-menu-active';
    menu.innerHTML = `
        <button class="col-menu-item" data-action="rename">
            <span>✏️</span> Renommer le groupe
        </button>
        <button class="col-menu-item" data-action="color">
            <span>🎨</span> Changer la couleur
        </button>
        <div class="col-menu-sep"></div>
        <button class="col-menu-item danger" data-action="delete">
            <span>🗑️</span> Supprimer le groupe
        </button>
    `;

    document.body.appendChild(menu);
    tbColMenuOpen = colId;

    // Positionnement
    const rect = anchorEl.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = rect.right - menuRect.width;
    let top  = rect.bottom + 6;
    if (left < 8) left = 8;
    if (top + menuRect.height + 8 > window.innerHeight) {
        top = rect.top - menuRect.height - 6;
    }
    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';

    menu.querySelectorAll('.col-menu-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            closeColumnMenu();
            if (action === 'rename') renameColumn(colId);
            else if (action === 'color') recolorColumn(colId);
            else if (action === 'delete') deleteColumn(colId);
        });
    });
}

function closeColumnMenu() {
    const existing = document.getElementById('col-menu-active');
    if (existing) existing.remove();
    tbColMenuOpen = null;
}

function renameColumn(colId) {
    const col = tbColumns.find(c => c.id === colId);
    if (!col) return;
    // Réutilise le modal de groupe avec pré-remplissage
    const modal = document.getElementById('groupModal');
    modal.dataset.mode   = 'rename';
    modal.dataset.colId  = colId;
    modal.querySelector('h3').textContent = 'Renommer le groupe';
    modal.querySelector('#groupSaveBtn').textContent = 'Enregistrer';
    document.getElementById('groupNameInput').value = col.label;
    // Sélectionner la couleur actuelle
    document.querySelectorAll('#colorRow .cswatch').forEach(s => s.classList.remove('selected'));
    const sw = document.querySelector(`#colorRow .cswatch[data-color="${col.color}"]`);
    if (sw) sw.classList.add('selected');
    tbSelectedColor = col.color;
    modal.classList.remove('hidden');
    document.getElementById('groupNameInput').focus();
}

function recolorColumn(colId) {
    // Même modal, mais en mode « couleur » (nom pré-rempli, le user peut laisser tel quel)
    renameColumn(colId);
}

function deleteColumn(colId) {
    const col = tbColumns.find(c => c.id === colId);
    if (!col) return;
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent   = 'Supprimer ce groupe ?';
    document.getElementById('confirmMessage').textContent =
        col.tasks.length > 0
            ? `« ${col.label} » et ses ${col.tasks.length} tâche${col.tasks.length > 1 ? 's' : ''} seront définitivement supprimés.`
            : `« ${col.label} » sera définitivement supprimé.`;
    modal.classList.remove('hidden');
    tbPendingColDelete = colId;
}

function buildCard(task, col) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    const accent = document.createElement('div');
    accent.className = 'task-card-accent';
    accent.style.background = col.color;
    card.appendChild(accent);

    const prioMap = {
        urgent: ['Urgent','prio-urgent'],
        high:   ['Haute','prio-high'],
        normal: ['Normale','prio-normal'],
        low:    ['Basse','prio-low']
    };
    const [plabel, pcls] = prioMap[task.priority] || ['',''];
    const dateStr = formatDateRange(task.dateStart, task.dateEnd);

    card.innerHTML += `
        <div class="tc-top">
            <span class="tc-name">${task.name}</span>
            ${task.priority ? `<span class="tc-prio ${pcls}">${plabel}</span>` : ''}
        </div>
        <div class="tc-meta">
            ${task.assignee ? `<span class="tc-meta-pill">👤 ${task.assignee}</span>` : ''}
            ${dateStr ? `<span class="tc-meta-pill">📅 ${dateStr}</span>` : ''}
        </div>
        ${task.subtasks ? `<div class="tc-subtasks">▸ ${task.subtasks} sous-tâche${task.subtasks > 1 ? 's' : ''}</div>` : ''}
    `;

    card.addEventListener('dragstart', () => {
        tbDragSrc = { colId: col.id, taskId: task.id };
        card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('click', () => openTaskPanel(col.id, task.id));

    return card;
}

function formatDateRange(start, end) {
    if (!start && !end) return '';
    const fmt = d => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        const months = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
        return `${parseInt(day)} ${months[parseInt(m)-1]}`;
    };
    if (start && end) return `${fmt(start)} – ${fmt(end)}`;
    return fmt(start) || fmt(end);
}

/* Inline add form */
function buildAddForm(colId) {
    const form = document.createElement('div');
    form.className = 'add-task-form';
    form.id = `atf-${colId}`;
    form.innerHTML = `
        <input class="atf-name-input" id="atf-name-${colId}" placeholder="Nom de la tâche…">
        <div class="atf-meta-row">
            <input type="text" id="atf-assignee-${colId}" placeholder="Assigné…" style="width:90px">
            <select id="atf-prio-${colId}">
                <option value="">Priorité</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 Haute</option>
                <option value="normal">🔵 Normale</option>
                <option value="low">⚪ Basse</option>
            </select>
        </div>
        <div class="atf-actions">
            <button class="btn-atf-cancel" data-col="${colId}">Annuler</button>
            <button class="btn-atf-save" data-col="${colId}">Enregistrer ↵</button>
        </div>`;
    form.querySelector('.btn-atf-save').addEventListener('click', () => saveNewTask(colId));
    form.querySelector('.btn-atf-cancel').addEventListener('click', () => closeAddForm(colId));
    form.querySelector(`#atf-name-${colId}`).addEventListener('keydown', e => {
        if (e.key === 'Enter')  saveNewTask(colId);
        if (e.key === 'Escape') closeAddForm(colId);
    });
    return form;
}

function openAddForm(colId) {
    const form = document.getElementById(`atf-${colId}`);
    if (!form) return;
    form.classList.add('open');
    document.getElementById(`atf-name-${colId}`)?.focus();
}

function closeAddForm(colId) {
    const form = document.getElementById(`atf-${colId}`);
    if (!form) return;
    form.classList.remove('open');
    form.querySelectorAll('input, select').forEach(el => el.value = '');
}

function saveNewTask(colId) {
    const nameEl = document.getElementById(`atf-name-${colId}`);
    const name = nameEl?.value.trim();
    if (!name) { nameEl?.focus(); return; }
    const col = tbColumns.find(c => c.id === colId);
    if (!col) return;

    const prio = document.getElementById(`atf-prio-${colId}`)?.value || '';
    const task = {
        id: uid('tb'),
        name,
        assignee: document.getElementById(`atf-assignee-${colId}`)?.value.trim() || '',
        priority: prio,
        dateStart: '', dateEnd: '', time: '', tags: '', subtasks: 0, desc: ''
    };
    col.tasks.push(task);

    // Notif si urgent
    if (prio === 'urgent' && userSettings.notifUrgent) {
        addNotification({ title: `Nouvelle tâche urgente : ${name}`, level: 'critical', audience: ['sarah','lila'] });
    }

    renderBoard();
    refreshDashboard();
    setTimeout(() => openAddForm(colId), 40);
}

/* Task detail panel */
function openTaskPanel(colId, taskId) {
    const col = tbColumns.find(c => c.id === colId);
    const task = col?.tasks.find(t => t.id === taskId);
    if (!task) return;
    tbCurrentTask = { colId, task };

    const chip = document.getElementById('sideColLabel');
    chip.textContent = col.label;
    chip.style.background = col.color;
    document.getElementById('sideTaskCrumb').textContent = task.name;

    document.getElementById('sideTitle').value    = task.name;
    document.getElementById('sideAssignee').value = task.assignee || '';
    document.getElementById('sideTime').value     = task.time || '';
    document.getElementById('sidePriority').value = task.priority || '';
    document.getElementById('sideTags').value     = task.tags || '';
    document.getElementById('sideDesc').value     = task.desc || '';

    const sel = document.getElementById('sideStatus');
    sel.innerHTML = '';
    tbColumns.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.label;
        if (c.id === colId) o.selected = true;
        sel.appendChild(o);
    });

    updateDateBtnUI('start', task.dateStart);
    updateDateBtnUI('end',   task.dateEnd);

    document.getElementById('taskModal').classList.add('open');
}

function closeTaskPanel() {
    document.getElementById('taskModal').classList.remove('open');
    tbCurrentTask = null;
    closeDatePicker();
}

/* Date picker */
function openDatePicker(which) {
    tbPickerTarget = which;
    const ref = document.getElementById(which === 'start' ? 'btnDateStart' : 'btnDateEnd');
    const dpPopup = document.getElementById('datePicker');
    const rect = ref.getBoundingClientRect();
    dpPopup.style.top  = (rect.bottom + 8) + 'px';
    dpPopup.style.left = Math.min(rect.left, window.innerWidth - 480) + 'px';

    const task = tbCurrentTask?.task;
    const existing = which === 'start' ? task?.dateStart : task?.dateEnd;
    if (existing) {
        const [y, m] = existing.split('-');
        tbDpYear = parseInt(y);
        tbDpMonth = parseInt(m) - 1;
    } else {
        const n = new Date();
        tbDpYear = n.getFullYear();
        tbDpMonth = n.getMonth();
    }
    renderDatePicker();
    updateShortcutLabels();
    dpPopup.classList.add('open');
}

function closeDatePicker() {
    document.getElementById('datePicker').classList.remove('open');
    tbPickerTarget = null;
}

function updateDateBtnUI(which, dateStr) {
    const lbl = document.getElementById(which === 'start' ? 'lblDateStart' : 'lblDateEnd');
    const clr = document.getElementById(which === 'start' ? 'clrDateStart' : 'clrDateEnd');
    const btn = document.getElementById(which === 'start' ? 'btnDateStart' : 'btnDateEnd');
    if (dateStr) {
        lbl.textContent = formatDateRange(dateStr, '');
        clr.classList.remove('hidden');
        btn.classList.add('has-date');
    } else {
        lbl.textContent = which === 'start' ? 'Début' : 'Échéance';
        clr.classList.add('hidden');
        btn.classList.remove('has-date');
    }
}

function renderDatePicker() {
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    document.getElementById('dpMonthLabel').textContent = `${months[tbDpMonth]} ${tbDpYear}`;

    const grid = document.getElementById('dpDays');
    grid.innerHTML = '';

    let first = new Date(tbDpYear, tbDpMonth, 1).getDay();
    first = (first + 6) % 7; // lundi = 0
    const days = new Date(tbDpYear, tbDpMonth + 1, 0).getDate();
    const today = new Date();

    const task = tbCurrentTask?.task;
    const startVal = task?.dateStart || '';
    const endVal   = task?.dateEnd   || '';

    const prevDays = new Date(tbDpYear, tbDpMonth, 0).getDate();
    for (let i = 0; i < first; i++) {
        const empty = document.createElement('div');
        empty.className = 'dp-day other-month';
        empty.textContent = prevDays - first + 1 + i;
        grid.appendChild(empty);
    }

    for (let d = 1; d <= days; d++) {
        const btn = document.createElement('button');
        btn.className = 'dp-day';
        btn.textContent = d;
        const iso = `${tbDpYear}-${String(tbDpMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

        if (d === today.getDate() && tbDpMonth === today.getMonth() && tbDpYear === today.getFullYear()) {
            btn.classList.add('today');
        }
        if (startVal && endVal) {
            if (iso === startVal) btn.classList.add('range-start');
            else if (iso === endVal) btn.classList.add('range-end');
            else if (iso > startVal && iso < endVal) btn.classList.add('in-range');
        } else if (iso === startVal || iso === endVal) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyDate(iso);
        });
        grid.appendChild(btn);
    }
}

function applyDate(iso) {
    if (!tbCurrentTask) { closeDatePicker(); return; }
    if (tbPickerTarget === 'start') {
        tbCurrentTask.task.dateStart = iso;
        updateDateBtnUI('start', iso);
        if (!tbCurrentTask.task.dateEnd) tbPickerTarget = 'end';
    } else {
        if (tbCurrentTask.task.dateStart && iso < tbCurrentTask.task.dateStart) {
            tbCurrentTask.task.dateEnd   = tbCurrentTask.task.dateStart;
            tbCurrentTask.task.dateStart = iso;
            updateDateBtnUI('start', iso);
            updateDateBtnUI('end', tbCurrentTask.task.dateEnd);
        } else {
            tbCurrentTask.task.dateEnd = iso;
            updateDateBtnUI('end', iso);
        }
        closeDatePicker();
    }
    renderDatePicker();
}

/* Shortcuts */
function shortcutDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
}

function updateShortcutLabels() {
    const months = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
    const days   = ['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
    const fmt = iso => {
        const [y,m,d] = iso.split('-');
        const dt = new Date(iso);
        return `${days[dt.getDay()]} ${parseInt(d)} ${months[parseInt(m)-1]}`;
    };
    const ids = {
        'sc-today':     shortcutDate(0),
        'sc-tomorrow':  shortcutDate(1),
        'sc-next-week': shortcutDate(7),
        'sc-2weeks':    shortcutDate(14),
        'sc-4weeks':    shortcutDate(28)
    };
    Object.entries(ids).forEach(([id, iso]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = fmt(iso);
    });
}

/* Group modal */
function openGroupModal() {
    const modal = document.getElementById('groupModal');
    modal.dataset.mode  = 'create';
    modal.dataset.colId = '';
    modal.querySelector('h3').textContent = 'Nouveau groupe';
    modal.querySelector('#groupSaveBtn').textContent = 'Créer le groupe';
    document.getElementById('groupNameInput').value = '';
    modal.classList.remove('hidden');
    document.getElementById('groupNameInput').focus();
    document.querySelectorAll('#colorRow .cswatch').forEach(s => s.classList.remove('selected'));
    document.querySelector('#colorRow .cswatch[data-color="#7c828d"]').classList.add('selected');
    tbSelectedColor = '#7c828d';
}