/* =====================================================
   DEMACIA — dayview.js
   Vue journée — scénario 1 (grille horaire 6h–23h)
   avec blocs de tâches. Redimensionnement par drag, déplacement
   par drag du bloc entier.
===================================================== */

const DAY_START_HOUR = 6;   // 06:00
const DAY_END_HOUR   = 23;  // 23:00 (dernière heure affichée)
const HOUR_HEIGHT    = 60;  // px par heure → 1 min = 1 px

// État de la vue
let dayviewDate = new Date().toISOString().split('T')[0];   // ISO string (YYYY-MM-DD)
let dayviewWho  = 'lila'; // 'lila' ou 'john' (toggle pour Sarah/Lila)
let dvSearchQuery = '';   // recherche en cours dans la vue journée

// État du drag/resize
let dvDrag = null;        // { mode: 'move'|'resize', todoId, startY, origTime, origDur, el }

function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
}
function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function openDayView(date, who) {
    if (!canAccessView('dayview')) return;
    dayviewDate = date || new Date().toISOString().split('T')[0];
    dayviewWho  = who || 'lila';
    showView('dayview');
    renderDayView();
}

function onDayviewSearch(value) {
    dvSearchQuery = (value || '').trim().toLowerCase();
    renderDayView();
}

function clearDayviewSearch() {
    dvSearchQuery = '';
    const input = document.getElementById('dv-search-input');
    if (input) input.value = '';
    renderDayView();
}

function renderDayView() {
    // En-tête : date en toutes lettres + toggle Lila/John si Sarah
    const titleEl = document.getElementById('dayview-title');
    if (titleEl) {
        const d = new Date(dayviewDate);
        const txt = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        titleEl.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
    }

    const todayBtn = document.getElementById('dayview-today-btn');
    if (todayBtn) {
        const today = new Date().toISOString().split('T')[0];
        todayBtn.classList.toggle('active', dayviewDate === today);
    }

    // Toggle Lila/John (Sarah et Lila voient tous les deux)
    const toggle = document.getElementById('dayview-who-toggle');
    if (toggle) {
        toggle.style.display = 'flex';
        toggle.innerHTML = `
            <button class="dv-who-btn ${dayviewWho === 'lila' ? 'active' : ''}" data-who="lila">Lila</button>
            <button class="dv-who-btn ${dayviewWho === 'john' ? 'active' : ''}" data-who="john">John</button>
        `;
        toggle.querySelectorAll('.dv-who-btn').forEach(b => {
            b.addEventListener('click', () => {
                dayviewWho = b.dataset.who;
                renderDayView();
            });
        });
    }

    // Grille horaire
    const grid = document.getElementById('dayview-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Colonne des heures
    const hoursCol = document.createElement('div');
    hoursCol.className = 'dv-hours';
    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
        const slot = document.createElement('div');
        slot.className = 'dv-hour';
        slot.style.height = HOUR_HEIGHT + 'px';
        slot.innerHTML = `<span class="dv-hour-label">${String(h).padStart(2, '0')}:00</span>`;
        hoursCol.appendChild(slot);
    }
    grid.appendChild(hoursCol);

    // Colonne principale (avec lignes de fond)
    const main = document.createElement('div');
    main.className = 'dv-main';
    main.id = 'dv-main-col';
    main.style.height = ((DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT) + 'px';

    for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
        const line = document.createElement('div');
        line.className = 'dv-hour-line';
        line.style.top = ((h - DAY_START_HOUR) * HOUR_HEIGHT) + 'px';
        main.appendChild(line);
    }

    // Ligne rouge "maintenant" si on est sur aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    if (dayviewDate === today) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const top = (nowMin - DAY_START_HOUR * 60);
        if (top >= 0 && top <= (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT) {
            const line = document.createElement('div');
            line.className = 'dv-now-line';
            line.style.top = top + 'px';
            line.innerHTML = `<span class="dv-now-label">${minutesToTime(nowMin)}</span>`;
            main.appendChild(line);
        }
    }

    // Récupérer les tâches du jour pour la personne choisie
    const todos = (dayviewWho === 'lila' ? todosLila : todosJohn)
        .filter(t => (t.date || _today) === dayviewDate)
        .filter(t => t.time && t.duration);

    // Calcul de chevauchements pour afficher côte à côte
    const sorted = [...todos].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const blocks = sorted.map(t => {
        const startMin = timeToMinutes(t.time);
        const endMin   = startMin + t.duration;
        return { todo: t, startMin, endMin, col: 0, totalCols: 1 };
    });
    // Assignation de colonnes pour gérer les chevauchements
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        // Trouver la première colonne libre à ce créneau
        const usedCols = new Set();
        for (let j = 0; j < i; j++) {
            const other = blocks[j];
            if (other.endMin > b.startMin && other.startMin < b.endMin) {
                usedCols.add(other.col);
            }
        }
        let col = 0;
        while (usedCols.has(col)) col++;
        b.col = col;
    }
    // Calcul du nombre total de colonnes pour chaque bloc
    blocks.forEach(b => {
        const overlap = blocks.filter(other =>
            other.endMin > b.startMin && other.startMin < b.endMin);
        b.totalCols = Math.max(...overlap.map(o => o.col + 1), 1);
    });

    // Filtrage par recherche : on ne supprime PAS les blocs qui ne matchent pas,
    // on les estompe pour garder le contexte temporel. Les blocs qui matchent
    // sont mis en avant.
    let matchCount = 0;
    blocks.forEach(b => {
        const { todo, startMin, endMin, col, totalCols } = b;
        const top    = startMin - DAY_START_HOUR * 60;
        const height = Math.max(endMin - startMin, 30); // min 30 px
        const widthPct = 100 / totalCols;

        const cat = getCategory(todo.category);
        const block = document.createElement('div');

        // Match recherche ?
        let matches = true;
        if (dvSearchQuery) {
            const hay = ((todo.label || '') + ' ' + (cat.label || '') + ' ' + (todo.note || '')).toLowerCase();
            matches = hay.indexOf(dvSearchQuery) !== -1;
            if (matches) matchCount++;
        }

        block.className = 'dv-block'
            + (todo.done ? ' done' : '')
            + (todo.urgent ? ' urgent' : '')
            + (dvSearchQuery && !matches ? ' dv-block-dimmed' : '')
            + (dvSearchQuery && matches ? ' dv-block-highlight' : '');
        block.style.top    = top + 'px';
        block.style.height = height + 'px';
        block.style.left   = `calc(${col * widthPct}% + 4px)`;
        block.style.width  = `calc(${widthPct}% - 8px)`;
        block.style.background = cat.color + '22';
        block.style.borderLeftColor = cat.color;
        block.dataset.todoId = todo.id;
        block.innerHTML = `
            <div class="dv-block-header">
                <span class="dv-block-cat" style="color:${cat.color}">${cat.icon} ${cat.label}</span>
                <span class="dv-block-time">${todo.time} – ${minutesToTime(endMin)}</span>
            </div>
            <div class="dv-block-label">${todo.label}</div>
            ${todo.urgent ? '<span class="dv-block-urgent">URGENT</span>' : ''}
            ${canDo('todo.delete') ? '<button class="dv-block-delete" title="Supprimer la tâche">✕</button>' : ''}
            <div class="dv-block-resize" title="Faire glisser pour modifier la durée"></div>
        `;

        // Click pour ouvrir modal d'édition
        block.addEventListener('click', (e) => {
            if (e.target.classList.contains('dv-block-resize')) return;
            if (e.target.classList.contains('dv-block-delete')) return;
            if (dvDrag) return;
            editTodoTime(todo.id);
        });

        // Drag move (on bouge le bloc entier)
        block.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('dv-block-resize')) return;
            if (e.target.classList.contains('dv-block-delete')) return;
            startDrag(e, 'move', todo, block);
        });

        // Bouton supprimer
        const delBtn = block.querySelector('.dv-block-delete');
        if (delBtn) {
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof deleteTodo === 'function') {
                    deleteTodo(dayviewWho, todo.id);
                    renderDayView();
                }
            });
            delBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        }

        // Drag resize (poignée du bas)
        block.querySelector('.dv-block-resize').addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startDrag(e, 'resize', todo, block);
        });

        main.appendChild(block);
    });

    grid.appendChild(main);

    // Compteur de résultats de recherche
    const counter = document.getElementById('dv-search-count');
    if (counter) {
        if (dvSearchQuery) {
            counter.textContent = matchCount + ' résultat' + (matchCount !== 1 ? 's' : '');
            counter.classList.remove('hidden');
        } else {
            counter.textContent = '';
            counter.classList.add('hidden');
        }
    }

    // Scroll automatique au premier résultat de recherche, sinon à 8h
    setTimeout(() => {
        const wrap = document.getElementById('dayview-scroll');
        if (!wrap) return;
        if (dvSearchQuery && matchCount > 0) {
            const firstMatch = main.querySelector('.dv-block-highlight');
            if (firstMatch) {
                const blockTop = parseFloat(firstMatch.style.top || '0');
                wrap.scrollTop = Math.max(0, blockTop - 80);
            }
        } else if (wrap.scrollTop === 0) {
            wrap.scrollTop = HOUR_HEIGHT * 2; // centre approx 8h
        }
    }, 10);
}

/* ─── DRAG & RESIZE ─────────────────────────── */

function startDrag(e, mode, todo, el) {
    if (!canDo('todo.add')) return; // Sarah + Lila uniquement (pas John)
    e.preventDefault();
    dvDrag = {
        mode,
        todoId: todo.id,
        startY: e.clientY,
        origTime: todo.time,
        origDur:  todo.duration,
        el
    };
    el.classList.add('dragging');

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
}

function onDragMove(e) {
    if (!dvDrag) return;
    const deltaY = e.clientY - dvDrag.startY;
    // Snap à 15 min (15 px)
    const deltaMin = Math.round(deltaY / 15) * 15;

    const todos = dayviewWho === 'lila' ? todosLila : todosJohn;
    const todo = todos.find(t => t.id === dvDrag.todoId);
    if (!todo) return;

    if (dvDrag.mode === 'move') {
        const origMin = timeToMinutes(dvDrag.origTime);
        let newMin = origMin + deltaMin;
        // Clamper dans la plage
        const minBound = DAY_START_HOUR * 60;
        const maxBound = (DAY_END_HOUR + 1) * 60 - todo.duration;
        newMin = Math.max(minBound, Math.min(maxBound, newMin));

        dvDrag.el.style.top = (newMin - DAY_START_HOUR * 60) + 'px';
        todo.time = minutesToTime(newMin);

        // Mise à jour en live du libellé horaire
        const endMin = newMin + todo.duration;
        const timeLabel = dvDrag.el.querySelector('.dv-block-time');
        if (timeLabel) timeLabel.textContent = `${todo.time} – ${minutesToTime(endMin)}`;

    } else if (dvDrag.mode === 'resize') {
        let newDur = dvDrag.origDur + deltaMin;
        newDur = Math.max(15, newDur); // min 15 min
        // Clamper pour ne pas sortir de la grille
        const startMin = timeToMinutes(todo.time);
        const maxDur = (DAY_END_HOUR + 1) * 60 - startMin;
        newDur = Math.min(newDur, maxDur);

        dvDrag.el.style.height = newDur + 'px';
        todo.duration = newDur;

        const endMin = startMin + newDur;
        const timeLabel = dvDrag.el.querySelector('.dv-block-time');
        if (timeLabel) timeLabel.textContent = `${todo.time} – ${minutesToTime(endMin)}`;
    }
}

function onDragEnd() {
    if (!dvDrag) return;
    const todos = dayviewWho === 'lila' ? todosLila : todosJohn;
    const todo = todos.find(t => t.id === dvDrag.todoId);
    const mode = dvDrag.mode;
    const origTime = dvDrag.origTime;
    const origDur  = dvDrag.origDur;

    dvDrag.el.classList.remove('dragging');
    dvDrag = null;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup',   onDragEnd);

    if (todo) {
        const changed = (todo.time !== origTime) || (todo.duration !== origDur);
        if (changed) {
            renderDayView();
            refreshDashboard();
            const msg = mode === 'move'
                ? `Déplacée à ${todo.time}`
                : `Durée : ${todo.duration} min`;
            showToast({
                title: todo.label,
                message: msg,
                level: 'success',
                duration: 2500,
                undo: () => {
                    todo.time     = origTime;
                    todo.duration = origDur;
                    renderDayView();
                    refreshDashboard();
                }
            });
        }
    }
}

/* ─── Édition rapide d'une tâche depuis la vue ─── */
function editTodoTime(todoId) {
    const todos = dayviewWho === 'lila' ? todosLila : todosJohn;
    const todo  = todos.find(t => t.id === todoId);
    if (!todo) return;

    if (!canDo('todo.delete')) return;

    // Pré-remplir le modal todo et ouvrir en mode édition
    document.getElementById('td-label').value     = todo.label;
    document.getElementById('td-time').value      = todo.time;
    document.getElementById('td-date').value      = todo.date || _today;
    document.getElementById('td-duration').value  = todo.duration;
    document.getElementById('td-category').value  = todo.category || 'divers';
    document.getElementById('td-urgent').checked  = !!todo.urgent;
    document.getElementById('td-note').value      = todo.note || '';
    document.getElementById('td-assignee').value  = dayviewWho;

    const modal = document.getElementById('todoModal');
    modal.dataset.mode    = 'edit';
    modal.dataset.todoId  = todoId;
    modal.dataset.who     = dayviewWho;
    modal.querySelector('h3').textContent = 'Modifier la tâche';
    document.getElementById('td-save').textContent = 'Enregistrer';
    modal.classList.remove('hidden');
    document.getElementById('td-label').focus();
}

/* ─── Navigation jour ─── */
function navigateDayView(offset) {
    const d = new Date(dayviewDate);
    d.setDate(d.getDate() + offset);
    dayviewDate = d.toISOString().split('T')[0];
    renderDayView();
}

function goToToday() {
    dayviewDate = new Date().toISOString().split('T')[0];
    renderDayView();
}