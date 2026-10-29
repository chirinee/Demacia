/* =====================================================
   DEMACIA — todos.js
   Todo lists pour Lila et John.
   Lila a deux onglets : ses tâches + les tâches
   qu'elle a assignées à John.
   Filtre temporel : aujourd'hui / cette semaine / à venir / passées / tout.
===================================================== */

let lilaTodoTab = 'mine';        // 'mine' ou 'john'
let lilaTimeFilter = 'today';    // 'today' | 'week' | 'upcoming' | 'past' | 'all'

function getTodosFor(who) {
    return who === 'lila' ? todosLila : todosJohn;
}

function setTodosFor(who, arr) {
    if (who === 'lila') todosLila = arr;
    else                todosJohn = arr;
}

/**
 * Filtre une liste de todos selon le filtre temporel courant.
 */
function filterTodosByTime(todos) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().split('T')[0];

    return todos.filter(t => {
        const d = t.date || todayIso;
        if (lilaTimeFilter === 'today') {
            return d === todayIso;
        } else if (lilaTimeFilter === 'week') {
            // Aujourd'hui + 6 jours suivants
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            const diff = Math.round((date - today) / 86400000);
            return diff >= 0 && diff <= 6;
        } else if (lilaTimeFilter === 'upcoming') {
            // Tout le futur (à partir de demain)
            return d > todayIso;
        } else if (lilaTimeFilter === 'past') {
            // Tout le passé (jusqu'à hier)
            return d < todayIso;
        } else {
            // 'all'
            return true;
        }
    });
}

function renderTodos(who) {
    if (who === 'lila') {
        renderLilaTodos();
    } else {
        renderJohnMobile();
    }
}

function renderLilaTodos() {
    const list = document.getElementById('todo-list');
    if (!list) return;

    // ─── Barre d'onglets Mes tâches / Tâches John ───
    const tabs = document.getElementById('todo-tabs');
    if (tabs) {
        tabs.innerHTML = `
            <button class="todo-tab ${lilaTodoTab === 'mine' ? 'active' : ''}" data-tab="mine">Mes tâches
                <span class="todo-tab-count">${filterTodosByTime(todosLila).filter(t => !t.done).length}</span>
            </button>
            <button class="todo-tab ${lilaTodoTab === 'john' ? 'active' : ''}" data-tab="john">Tâches assignées à John
                <span class="todo-tab-count">${filterTodosByTime(todosJohn).filter(t => !t.done).length}</span>
            </button>
        `;
        tabs.querySelectorAll('.todo-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                lilaTodoTab = btn.dataset.tab;
                renderLilaTodos();
            });
        });
    }

    // ─── Filtre temporel ───
    const filterBar = document.getElementById('todo-time-filter');
    if (filterBar) {
        const opts = [
            { key: 'today',    label: 'Aujourd\'hui' },
            { key: 'week',     label: 'Cette semaine' },
            { key: 'upcoming', label: 'À venir' },
            { key: 'past',     label: 'Passées' },
            { key: 'all',      label: 'Tout' }
        ];
        filterBar.innerHTML = opts.map(o => `
            <button class="todo-time-chip ${lilaTimeFilter === o.key ? 'active' : ''}" data-filter="${o.key}">${o.label}</button>
        `).join('');
        filterBar.querySelectorAll('.todo-time-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                lilaTimeFilter = btn.dataset.filter;
                renderLilaTodos();
            });
        });
    }

    // ─── Récupération + tri ───
    const baseTodos = lilaTodoTab === 'mine' ? todosLila : todosJohn;
    let todos = filterTodosByTime(baseTodos);

    // Tri : par date puis par heure
    todos = [...todos].sort((a, b) => {
        const d = (a.date || '').localeCompare(b.date || '');
        if (d !== 0) return d;
        return (a.time || '').localeCompare(b.time || '');
    });

    const remaining = todos.filter(t => !t.done).length;

    // ─── Salutation adaptée à l'onglet + filtre ───
    const nameEl = document.getElementById('todo-greeting-name');
    const subEl  = document.getElementById('todo-greeting-sub');
    const filterLabel = {
        today: 'aujourd\'hui',
        week:  'cette semaine',
        upcoming: 'à venir',
        past:  'dans le passé',
        all:   'au total'
    }[lilaTimeFilter] || '';

    if (lilaTodoTab === 'mine') {
        if (nameEl) nameEl.textContent = `Bonjour ${ROLE_CONFIG[currentRole].name.split(' ')[0]}`;
        if (subEl)  subEl.textContent  = `${remaining} tâche${remaining > 1 ? 's' : ''} ${filterLabel}`;
    } else {
        if (nameEl) nameEl.textContent = `Suivi de John`;
        if (subEl)  subEl.textContent  = `${remaining} en attente ${filterLabel} (sur ${todos.length})`;
    }

    // ─── Rendu de la liste ───
    list.innerHTML = '';
    if (todos.length === 0) {
        const emptyMsg = {
            today: 'Aucune tâche pour aujourd\'hui',
            week:  'Aucune tâche cette semaine',
            upcoming: 'Aucune tâche à venir',
            past:  'Aucune tâche passée',
            all:   'Aucune tâche'
        }[lilaTimeFilter];
        list.innerHTML = '<li class="todo-empty">' + emptyMsg + (lilaTodoTab === 'john' ? ' assignée à John' : '') + '</li>';
        return;
    }

    // Si on affiche plusieurs jours, on regroupe par date
    const groupByDate = (lilaTimeFilter !== 'today');

    let currentDateGroup = null;
    todos.forEach(todo => {
        // En-tête de jour (si on en a plusieurs)
        if (groupByDate && todo.date !== currentDateGroup) {
            currentDateGroup = todo.date;
            const header = document.createElement('li');
            header.className = 'todo-date-header';
            const d = new Date(currentDateGroup);
            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            let label;
            if (currentDateGroup === today.toISOString().split('T')[0]) label = '📅 Aujourd\'hui';
            else if (currentDateGroup === tomorrow.toISOString().split('T')[0]) label = '➡️ Demain';
            else if (currentDateGroup === yesterday.toISOString().split('T')[0]) label = '⏪ Hier';
            else label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
            header.innerHTML = `<span class="todo-date-header-label">${label.charAt(0).toUpperCase() + label.slice(1)}</span>`;
            list.appendChild(header);
        }

        const li = document.createElement('li');
        li.className = 'todo-item'
            + (todo.done ? ' done' : '')
            + (todo.urgent ? ' urgent' : '');

        const who = lilaTodoTab === 'mine' ? 'lila' : 'john';
        const cat = getCategory(todo.category);

        li.innerHTML = `
            <div class="todo-checkbox">${todo.done ? '✓' : ''}</div>
            <div class="todo-content">
                <span class="todo-label">${todo.label}</span>
                <div class="todo-meta">
                    <span class="todo-time">${todo.time}${todo.duration ? ' · ' + todo.duration + ' min' : ''}</span>
                    <span class="todo-category-tag" style="background:${cat.color}22; color:${cat.color}">${cat.icon} ${cat.label}</span>
                    ${todo.urgent ? '<span class="todo-urgent-badge">URGENT</span>' : ''}
                    ${lilaTodoTab === 'john' ? '<span class="todo-assigned-tag">→ John</span>' : ''}
                    ${todo.note ? `<span style="opacity:.6">${todo.note}</span>` : ''}
                    ${pendingSync.includes(todo.id) ? '<span class="todo-sync-pending">En attente sync</span>' : ''}
                </div>
            </div>
            ${canDo('todo.delete') ? '<button class="todo-delete" title="Supprimer">✕</button>' : ''}
        `;

        // Lila ne peut cocher QUE ses propres tâches (pas celles de John)
        const cb = li.querySelector('.todo-checkbox');
        if (lilaTodoTab === 'mine') {
            cb.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleTodo('lila', todo.id);
            });
        } else {
            cb.style.cursor = 'not-allowed';
            cb.title = 'Seul John peut valider ses tâches';
        }

        const del = li.querySelector('.todo-delete');
        if (del) {
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTodo(who, todo.id);
            });
        }

        list.appendChild(li);
    });
}

function renderJohnMobile() {
    const list = document.getElementById('mobile-todo-list');
    if (!list) return;
    list.innerHTML = '';

    // John ne voit que ses tâches d'aujourd'hui (il est sur le terrain)
    const todosToday = todosJohn.filter(t => (t.date || _today) === _today);
    const remaining = todosToday.filter(t => !t.done).length;
    const sub = document.getElementById('mobile-greeting-sub');
    if (sub) sub.textContent = `${remaining} tâche${remaining > 1 ? 's' : ''} à faire aujourd'hui`;

    if (todosToday.length === 0) {
        list.innerHTML = '<li class="todo-empty">Aucune tâche pour aujourd\'hui</li>';
        return;
    }

    todosToday.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.done ? ' done' : '') + (todo.urgent ? ' urgent' : '');
        const cat = getCategory(todo.category);
        li.innerHTML = `
            <div class="todo-checkbox">${todo.done ? '✓' : ''}</div>
            <div class="todo-content">
                <span class="todo-label">${todo.label}</span>
                <div class="todo-meta">
                    <span class="todo-time">${todo.time}${todo.duration ? ' · ' + todo.duration + ' min' : ''}</span>
                    <span class="todo-category-tag" style="background:${cat.color}22; color:${cat.color}">${cat.icon} ${cat.label}</span>
                    ${todo.urgent ? '<span class="todo-urgent-badge">URGENT</span>' : ''}
                    ${todo.note ? `<span style="opacity:.6">${todo.note}</span>` : ''}
                    ${pendingSync.includes(todo.id) ? '<span class="todo-sync-pending">En attente sync</span>' : ''}
                </div>
            </div>
        `;
        li.querySelector('.todo-checkbox').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTodo('john', todo.id);
        });
        list.appendChild(li);
    });
}

function toggleTodo(who, id) {
    const todos = getTodosFor(who);
    const t = todos.find(x => x.id === id);
    if (!t) return;
    const wasDone = t.done;
    t.done = !t.done;

    if (!isOnline && !pendingSync.includes(id)) {
        pendingSync.push(id);
        updateSyncUI();
    }

    renderTodos(who);
    if (currentView === 'dayview') renderDayView();
    refreshDashboard();

    if (!wasDone && t.done) {
        showToast({
            title: 'Tâche terminée',
            message: t.label,
            level: 'success',
            duration: 3500,
            undo: () => {
                t.done = false;
                pendingSync = pendingSync.filter(x => x !== id);
                updateSyncUI();
                renderTodos(who);
                if (currentView === 'dayview') renderDayView();
                refreshDashboard();
            }
        });
    }
}

function deleteTodo(who, id) {
    const todos = getTodosFor(who);
    const idx = todos.findIndex(x => x.id === id);
    if (idx === -1) return;
    const removed = todos[idx];
    todos.splice(idx, 1);
    setTodosFor(who, todos);

    if (currentRole === 'lila') renderLilaTodos();
    else                        renderTodos(who);
    if (currentView === 'dayview') renderDayView();
    refreshDashboard();

    showToast({
        title: 'Tâche supprimée',
        message: removed.label,
        duration: 3500,
        undo: () => {
            todos.splice(idx, 0, removed);
            setTodosFor(who, todos);
            if (currentRole === 'lila') renderLilaTodos();
            else                        renderTodos(who);
            if (currentView === 'dayview') renderDayView();
            refreshDashboard();
        }
    });
}

function renderCategoryChips(selectedId) {
    const row = document.getElementById('td-category-row');
    if (!row) return;
    row.innerHTML = '';
    taskCategories.forEach(cat => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'td-cat-chip' + (cat.id === selectedId ? ' selected' : '');
        chip.dataset.catId = cat.id;
        chip.innerHTML = `<span>${cat.icon}</span> ${cat.label}`;
        if (cat.id === selectedId) {
            chip.style.background = cat.color;
            chip.style.borderColor = cat.color;
        }
        chip.addEventListener('click', () => {
            row.querySelectorAll('.td-cat-chip').forEach(c => {
                c.classList.remove('selected');
                c.style.background = '';
                c.style.borderColor = '';
            });
            chip.classList.add('selected');
            chip.style.background = cat.color;
            chip.style.borderColor = cat.color;
            document.getElementById('td-category').value = cat.id;
        });
        row.appendChild(chip);
    });
    const sel = document.getElementById('td-category');
    if (sel) {
        sel.innerHTML = '';
        taskCategories.forEach(cat => {
            const o = document.createElement('option');
            o.value = cat.id;
            o.textContent = cat.label;
            if (cat.id === selectedId) o.selected = true;
            sel.appendChild(o);
        });
    }
}

function openTodoModal() {
    if (!canDo('todo.add')) {
        showToast({ title: 'Action réservée', level: 'warning' });
        return;
    }

    const modal = document.getElementById('todoModal');
    modal.dataset.mode   = 'create';
    modal.dataset.todoId = '';
    modal.querySelector('h3').textContent = 'Nouvelle tâche';
    document.getElementById('td-save').textContent = 'Créer';

    document.getElementById('td-label').value    = '';
    document.getElementById('td-time').value     = '09:00';
    document.getElementById('td-date').value     = _today;
    document.getElementById('td-duration').value = '60';
    document.getElementById('td-note').value     = '';
    document.getElementById('td-urgent').checked = false;

    const sel = document.getElementById('td-assignee');
    if (currentRole === 'lila' && lilaTodoTab === 'john') {
        sel.value = 'john';
    } else {
        sel.value = 'lila';
    }

    renderCategoryChips('divers');

    modal.classList.remove('hidden');
    document.getElementById('td-label').focus();
}

function saveTodo() {
    const modal    = document.getElementById('todoModal');
    const mode     = modal.dataset.mode || 'create';
    const label    = document.getElementById('td-label').value.trim();
    const time     = document.getElementById('td-time').value || '09:00';
    const date     = document.getElementById('td-date').value || _today;
    const duration = parseInt(document.getElementById('td-duration').value) || 60;
    const category = document.getElementById('td-category').value || 'divers';
    const assignee = document.getElementById('td-assignee').value;
    const urgent   = document.getElementById('td-urgent').checked;
    const note     = document.getElementById('td-note').value.trim();

    if (!label) { showToast({ title: 'Intitulé requis', level: 'warning' }); return; }

    if (mode === 'edit') {
        const who   = modal.dataset.who || assignee;
        const id    = modal.dataset.todoId;
        const todos = who === 'lila' ? todosLila : todosJohn;
        const t = todos.find(x => x.id === id);
        if (t) {
            t.label = label; t.time = time; t.date = date;
            t.duration = duration; t.category = category;
            t.urgent = urgent; t.note = note;
        }
        modal.classList.add('hidden');
        if (currentView === 'dayview') renderDayView();
        if (currentRole === 'lila') renderLilaTodos(); else renderTodos(who);
        refreshDashboard();
        showToast({ title: 'Tâche modifiée', message: label, level: 'success', duration: 2000 });
        return;
    }

    const todo = {
        id: uid('td'),
        label, time, date, duration, category,
        urgent, note, done: false
    };

    if (assignee === 'lila') todosLila.push(todo);
    else                     todosJohn.push(todo);

    modal.classList.add('hidden');

    if (currentRole === 'lila' && assignee === 'john') {
        lilaTodoTab = 'john';
    }

    if (currentView === 'dayview') renderDayView();
    if (currentRole === 'lila') renderLilaTodos();
    else                        renderTodos(assignee);
    refreshDashboard();

    if (urgent && userSettings.notifUrgent) {
        const aud = assignee === 'john' ? ['sarah', 'john'] : ['sarah', 'lila'];
        addNotification({ title: `Tâche urgente assignée à ${assignee === 'lila' ? 'Lila' : 'John'} : ${label}`, level: 'critical', audience: aud });
    } else if (assignee === 'john') {
        addNotification({ title: `Nouvelle tâche : ${label}`, level: 'info', audience: ['john'] });
    } else {
        showToast({ title: 'Tâche ajoutée', message: label, level: 'success', duration: 2500 });
    }
}