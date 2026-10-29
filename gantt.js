/* =====================================================
   DEMACIA — gantt.js
   Gantt avec dépendances visuelles, ajout tâches,
   ajout groupes, panneau de détail.
===================================================== */

let ganttSelectedTask = null;
let ggSelectedColor = '#1D6FA4';

function renderGantt() {
    const tasksCol   = document.getElementById('gantt-tasks');
    const header     = document.getElementById('gantt-header');
    const barsCont   = document.getElementById('gantt-bars');
    if (!tasksCol || !header || !barsCont) return;

    tasksCol.innerHTML = '';
    header.innerHTML = '';

    // Vider les bar-rows mais garder le SVG des dépendances
    const oldSvg = document.getElementById('gantt-deps-svg');
    barsCont.innerHTML = '';
    const svg = oldSvg || document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'gantt-deps-svg';
    svg.classList.add('gantt-deps-svg');
    barsCont.appendChild(svg);

    // Générer le header (par semaines)
    const totalDays = daysBetween(GANTT_START, GANTT_END) + 1;
    const totalWidth = totalDays * DAY_W;
    for (let d = 0; d < totalDays; d += 7) {
        const date = new Date(GANTT_START);
        date.setDate(date.getDate() + d);
        const span = document.createElement('div');
        span.className = 'gantt-week-label';
        span.style.width = (7 * DAY_W) + 'px';
        span.textContent = fmtDate(date);
        header.appendChild(span);
    }
    header.style.width = totalWidth + 'px';

    // Générer les lignes
    projects.forEach(proj => {
        // En-tête groupe (colonne tâches)
        const groupHead = document.createElement('div');
        groupHead.className = 'gantt-group-header';
        groupHead.innerHTML = `
            <span class="gantt-group-arrow ${proj.open ? 'open' : ''}">▶</span>
            <span class="gantt-group-dot" style="background:${proj.color}"></span>
            <span class="gantt-group-name">${proj.label}</span>
            ${canDo('gantt.add') ? `<button class="gg-add-task-btn" data-project="${proj.id}" title="Ajouter une tâche">+</button>` : ''}
        `;
        groupHead.addEventListener('click', (e) => {
            if (e.target.classList.contains('gg-add-task-btn')) {
                e.stopPropagation();
                openGanttTaskModal(proj.id);
                return;
            }
            proj.open = !proj.open;
            renderGantt();
        });
        tasksCol.appendChild(groupHead);

        // Ligne vide côté barres pour aligner avec l'en-tête
        const barGroupRow = document.createElement('div');
        barGroupRow.className = 'gantt-bar-row gantt-group-bar-row';
        barGroupRow.style.width = totalWidth + 'px';
        barsCont.appendChild(barGroupRow);

        // Tâches
        proj.tasks.forEach(task => {
            // Col de gauche
            const row = document.createElement('div');
            row.className = 'gantt-task-row' + (proj.open ? '' : ' hidden');
            row.dataset.taskId = task.id;
            row.innerHTML = `
                <div class="gantt-task-label">
                    ${task.urgent ? '<span class="urgent-tag">!</span>' : ''}
                    <span>${task.label}</span>
                </div>
                <div class="gantt-task-owner">${task.owner}</div>
            `;
            row.addEventListener('click', () => openDetail(task.id));
            tasksCol.appendChild(row);

            // Barre côté droit
            const barRow = document.createElement('div');
            barRow.className = 'gantt-bar-row' + (proj.open ? '' : ' hidden');
            barRow.dataset.taskId = task.id;
            barRow.style.width = totalWidth + 'px';

            const offset = daysBetween(GANTT_START, task.start);
            const dur    = daysBetween(task.start, task.end) + 1;
            const bar = document.createElement('div');
            bar.className = 'gantt-bar';
            bar.style.left  = (offset * DAY_W) + 'px';
            bar.style.width = (dur * DAY_W - 4) + 'px';
            bar.style.background = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
            bar.title = `${task.label} — ${task.pct}% — ${STATUS_LABELS[task.status]}`;
            bar.innerHTML = `
                <div class="gantt-bar-inner">
                    <div class="gantt-bar-fill" style="width:${task.pct}%"></div>
                </div>
                ${task.urgent ? '<span class="gantt-bar-urgent">!</span>' : ''}
            `;
            bar.addEventListener('click', () => openDetail(task.id));
            barRow.appendChild(bar);
            barsCont.appendChild(barRow);
        });
    });

    // Ligne "aujourd'hui"
    const today = new Date();
    if (today >= GANTT_START && today <= GANTT_END) {
        const offset = daysBetween(GANTT_START, today.toISOString().split('T')[0]);
        const line = document.createElement('div');
        line.className = 'gantt-today-line';
        line.style.left = (offset * DAY_W) + 'px';
        barsCont.appendChild(line);
    }

    // Ajuster largeur du SVG
    setTimeout(() => {
        const h = barsCont.scrollHeight;
        svg.setAttribute('width', totalWidth);
        svg.setAttribute('height', h);
        svg.style.width  = totalWidth + 'px';
        svg.style.height = h + 'px';
        drawDependencies(svg);
    }, 20);
}

function drawDependencies(svg) {
    svg.innerHTML = '';

    // Marker de flèche
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <polygon points="0 0, 8 4, 0 8" fill="#C62828" opacity="0.7" />
        </marker>
    `;
    svg.appendChild(defs);

    // Collecter toutes les tâches avec leurs positions
    const taskPositions = {};
    let rowIdx = 0;
    projects.forEach(proj => {
        rowIdx++; // Ligne du groupe
        proj.tasks.forEach(task => {
            if (proj.open) {
                const offset = daysBetween(GANTT_START, task.start);
                const dur    = daysBetween(task.start, task.end) + 1;
                taskPositions[task.id] = {
                    x1: offset * DAY_W,
                    x2: offset * DAY_W + dur * DAY_W - 4,
                    y: rowIdx * 40 + 20,
                    task: task
                };
                rowIdx++;
            }
        });
    });

    // Pour chaque tâche avec deps, tracer une flèche depuis la fin de la tâche dépendante
    projects.forEach(proj => {
        if (!proj.open) return;
        proj.tasks.forEach(task => {
            if (!task.deps || task.deps.length === 0) return;
            const me = taskPositions[task.id];
            if (!me) return;
            task.deps.forEach(depId => {
                const dep = taskPositions[depId];
                if (!dep) return;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const x1 = dep.x2;
                const y1 = dep.y;
                const x2 = me.x1 - 2;
                const y2 = me.y;

                // Ligne en "L" avec coin arrondi
                const d = `M ${x1} ${y1} L ${x1 + 8} ${y1} L ${x1 + 8} ${y2} L ${x2} ${y2}`;
                path.setAttribute('d', d);
                path.setAttribute('stroke', '#C62828');
                path.setAttribute('stroke-width', '1.2');
                path.setAttribute('stroke-dasharray', '3 3');
                path.setAttribute('fill', 'none');
                path.setAttribute('opacity', '0.5');
                path.setAttribute('marker-end', 'url(#arrowhead)');
                svg.appendChild(path);
            });
        });
    });
}

function openDetail(taskId) {
    let foundTask = null;
    let foundProj = null;
    projects.forEach(p => {
        const t = p.tasks.find(x => x.id === taskId);
        if (t) { foundTask = t; foundProj = p; }
    });
    if (!foundTask) return;
    ganttSelectedTask = foundTask;

    const panel = document.getElementById('gantt-detail');
    panel.style.display = 'flex';

    document.getElementById('gdp-title').textContent   = foundTask.label;
    document.getElementById('gdp-project').textContent = foundProj.label;

    const badge = document.getElementById('gdp-status');
    badge.textContent = STATUS_LABELS[foundTask.status];
    badge.style.background = STATUS_COLORS[foundTask.status] + '22';
    badge.style.color      = STATUS_COLORS[foundTask.status];

    document.getElementById('gdp-start').textContent = fmtDate(foundTask.start);
    document.getElementById('gdp-end').textContent   = fmtDate(foundTask.end);
    document.getElementById('gdp-owner').textContent = foundTask.owner;

    const progress = document.getElementById('gdp-progress');
    progress.style.width = foundTask.pct + '%';
    progress.style.background = STATUS_COLORS[foundTask.status];
    document.getElementById('gdp-pct').textContent = foundTask.pct + '%';

    const depsContainer = document.getElementById('gdp-deps');
    depsContainer.innerHTML = '';
    if (!foundTask.deps || foundTask.deps.length === 0) {
        depsContainer.innerHTML = '<span class="gdp-dep-empty">Aucune dépendance</span>';
    } else {
        foundTask.deps.forEach(depId => {
            let depTask = null;
            projects.forEach(p => {
                const t = p.tasks.find(x => x.id === depId);
                if (t) depTask = t;
            });
            if (depTask) {
                const div = document.createElement('div');
                div.className = 'gdp-dep-item';
                div.textContent = depTask.label;
                depsContainer.appendChild(div);
            }
        });
    }

    document.getElementById('gdp-note').textContent = foundTask.note || '—';
}

function closeGanttDetail() {
    const panel = document.getElementById('gantt-detail');
    if (panel) panel.style.display = 'none';
    ganttSelectedTask = null;
}

function deleteGanttTask() {
    if (!canDo('gantt.add')) {
        showToast({ title: 'Action réservée', message: 'Seule Sarah peut supprimer une tâche du Gantt', level: 'warning' });
        return;
    }
    if (!ganttSelectedTask) return;

    const taskId = ganttSelectedTask.id;
    const taskLabel = ganttSelectedTask.label;

    // Trouve la tâche et son projet
    let foundProj = null, foundIdx = -1, removedTask = null;
    projects.forEach(p => {
        const idx = p.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            foundProj = p;
            foundIdx = idx;
            removedTask = p.tasks[idx];
        }
    });
    if (!foundProj) return;

    // Aussi : retirer cette tâche des deps des autres tâches (sinon flèches cassées)
    projects.forEach(p => {
        p.tasks.forEach(t => {
            if (t.deps && t.deps.includes(taskId)) {
                t.deps = t.deps.filter(d => d !== taskId);
            }
        });
    });

    // Supprime la tâche
    foundProj.tasks.splice(foundIdx, 1);

    // Ferme le panneau et re-render
    closeGanttDetail();
    renderGantt();
    refreshDashboard();
    renderMiniCal();

    // Toast avec Annuler
    showToast({
        title: 'Tâche supprimée',
        message: taskLabel,
        level: 'success',
        duration: 4500,
        undo: () => {
            foundProj.tasks.splice(foundIdx, 0, removedTask);
            // Note : on ne restaure pas les deps inverses, c'est rare et complexe
            renderGantt();
            refreshDashboard();
            renderMiniCal();
        }
    });

    if (typeof saveState === 'function') saveState();
}

/* Modal ajout tâche Gantt */
function openGanttTaskModal(defaultProjectId = null) {
    if (!canDo('gantt.add')) {
        showToast({ title: 'Action réservée', message: 'Seule Sarah peut ajouter une tâche au Gantt', level: 'warning' });
        return;
    }

    // Remplir le select des groupes
    const sel = document.getElementById('gt-group');
    sel.innerHTML = '';
    projects.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.label;
        if (defaultProjectId && p.id === defaultProjectId) o.selected = true;
        sel.appendChild(o);
    });

    // Reset champs
    document.getElementById('gt-name').value   = '';
    document.getElementById('gt-start').value  = '';
    document.getElementById('gt-end').value    = '';
    document.getElementById('gt-owner').value  = '';
    document.getElementById('gt-status').value = 'todo';
    document.getElementById('gt-urgent').checked = false;
    document.getElementById('gt-note').value   = '';

    document.getElementById('ganttTaskModal').classList.remove('hidden');
    document.getElementById('gt-name').focus();
}

function saveGanttTask() {
    const name   = document.getElementById('gt-name').value.trim();
    const projId = document.getElementById('gt-group').value;
    const start  = document.getElementById('gt-start').value;
    const end    = document.getElementById('gt-end').value;
    const owner  = document.getElementById('gt-owner').value.trim() || 'Non assigné';
    const status = document.getElementById('gt-status').value;
    const urgent = document.getElementById('gt-urgent').checked;
    const note   = document.getElementById('gt-note').value.trim();

    if (!name)  { showToast({ title: 'Nom requis', level: 'warning' }); return; }
    if (!start || !end) { showToast({ title: 'Dates requises', level: 'warning' }); return; }
    if (end < start) { showToast({ title: 'Date de fin invalide', level: 'warning' }); return; }

    const proj = projects.find(p => p.id === projId);
    if (!proj) return;

    const task = {
        id: uid('t'),
        label: name,
        start, end,
        pct: status === 'done' ? 100 : (status === 'active' ? 30 : 0),
        status,
        owner,
        urgent,
        deps: [],
        note
    };
    proj.tasks.push(task);

    document.getElementById('ganttTaskModal').classList.add('hidden');

    // Notifications auto
    if (urgent && userSettings.notifUrgent) {
        addNotification({ title: `Nouvelle tâche urgente : ${name}`, level: 'critical', audience: ['sarah','lila'] });
    } else {
        addNotification({ title: `Tâche « ${name} » créée`, level: 'info', audience: ['sarah','lila'] });
    }

    showToast({ title: 'Tâche créée', message: name, level: 'success', duration: 2500 });

    renderGantt();
    refreshDashboard();
    renderMiniCal();
}

/* Modal ajout groupe Gantt */
function openGanttGroupModal() {
    if (!canDo('gantt.addGroup')) return;
    document.getElementById('gg-name').value = '';
    document.querySelectorAll('#gg-color-row .cswatch').forEach(s => s.classList.remove('selected'));
    document.querySelector('#gg-color-row .cswatch[data-color="#1D6FA4"]').classList.add('selected');
    ggSelectedColor = '#1D6FA4';
    document.getElementById('ganttGroupModal').classList.remove('hidden');
    document.getElementById('gg-name').focus();
}

function saveGanttGroup() {
    const name = document.getElementById('gg-name').value.trim();
    if (!name) { showToast({ title: 'Nom requis', level: 'warning' }); return; }

    projects.push({
        id: uid('g'),
        label: name,
        color: ggSelectedColor,
        open: true,
        tasks: []
    });
    document.getElementById('ganttGroupModal').classList.add('hidden');
    renderGantt();
    showToast({ title: 'Groupe ajouté', message: name, level: 'success', duration: 2000 });
    addNotification({ title: `Groupe « ${name} » créé dans le Gantt`, level: 'info', silent: true, audience: ['sarah','lila'] });
}