/* =====================================================
   DEMACIA — init.js
   Initialisation et branchements d'événements.
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ── NAVIGATION ── */
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showView(link.dataset.view);
        });
    });

    /* ── ROLE SWITCHER ── */
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => applyRole(btn.dataset.role));
    });

    /* ── SYNC ── */
    document.getElementById('sync-indicator').addEventListener('click', toggleSync);

    /* ── NOTIFICATIONS ── */
    document.getElementById('notif-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('notif-panel').classList.toggle('open');
    });
    document.getElementById('notif-mark-read').addEventListener('click', (e) => {
        e.stopPropagation();
        notifications.forEach(n => {
            if (!n.audience || n.audience.includes(currentRole)) {
                n.read = true;
            }
        });
        renderNotifications();
        updateNotifBadge();
    });
    // Fermer le panel si clic ailleurs
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notif-panel');
        const btn   = document.getElementById('notif-btn');
        if (!panel.contains(e.target) && !btn.contains(e.target)) {
            panel.classList.remove('open');
        }
        // Fermer popup mini calendrier si clic ailleurs
        const popup = document.getElementById('minical-popup');
        const sidebar = document.getElementById('sidebar-calendar');
        if (popup && !popup.contains(e.target) && sidebar && !sidebar.contains(e.target)) {
            popup.classList.remove('open');
        }
    });

    /* ── MINI CALENDAR NAV ── */
    document.getElementById('minical-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        miniCalMonth--;
        if (miniCalMonth < 0) { miniCalMonth = 11; miniCalYear--; }
        renderMiniCal();
        closeMiniCalPopup();
    });
    document.getElementById('minical-next').addEventListener('click', (e) => {
        e.stopPropagation();
        miniCalMonth++;
        if (miniCalMonth > 11) { miniCalMonth = 0; miniCalYear++; }
        renderMiniCal();
        closeMiniCalPopup();
    });

    /* ── CONFIRM MODAL (usage partagé : taskboard + providers) ── */
    document.getElementById('confirmCancel').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.add('hidden');
        tbPendingDelete = null;
        tbPendingColDelete = null;
        window._pendingProviderDelete = null;
    });
    document.getElementById('confirmDelete').addEventListener('click', () => {
        // Cas 1 : suppression prestataire
        if (window._pendingProviderDelete) {
            const id = window._pendingProviderDelete;
            const prov = providers.find(p => p.id === id);
            providers = providers.filter(p => p.id !== id);
            window._pendingProviderDelete = null;
            document.getElementById('confirmModal').classList.add('hidden');
            renderProviders();
            refreshDashboard();
            showToast({ title: 'Prestataire supprimé', message: prov?.name || '', level: 'success', duration: 2500 });
            return;
        }
        // Cas 2 : suppression colonne taskboard
        if (tbPendingColDelete) {
            const col  = tbColumns.find(c => c.id === tbPendingColDelete);
            const name = col?.label;
            tbColumns = tbColumns.filter(c => c.id !== tbPendingColDelete);
            tbPendingColDelete = null;
            document.getElementById('confirmModal').classList.add('hidden');
            renderBoard();
            refreshDashboard();
            showToast({ title: 'Groupe supprimé', message: name, level: 'success', duration: 2500 });
            return;
        }
        // Cas 3 : suppression carte taskboard
        if (tbPendingDelete) {
            const col = tbColumns.find(c => c.id === tbPendingDelete.colId);
            if (col) col.tasks = col.tasks.filter(t => t.id !== tbPendingDelete.task.id);
            document.getElementById('confirmModal').classList.add('hidden');
            tbPendingDelete = null;
            closeTaskPanel();
            renderBoard();
            refreshDashboard();
        }
    });

    /* ── TASKBOARD TASK PANEL ── */
    document.getElementById('taskModalOverlay').addEventListener('click', closeTaskPanel);
    document.getElementById('taskModalClose').addEventListener('click', closeTaskPanel);

    document.getElementById('taskSaveBtn').addEventListener('click', () => {
        if (!tbCurrentTask) return;
        const { colId, task } = tbCurrentTask;
        const newColId = document.getElementById('sideStatus').value;
        const oldPrio  = task.priority;

        task.name     = document.getElementById('sideTitle').value.trim() || task.name;
        task.assignee = document.getElementById('sideAssignee').value.trim();
        task.time     = document.getElementById('sideTime').value.trim();
        task.priority = document.getElementById('sidePriority').value;
        task.tags     = document.getElementById('sideTags').value.trim();
        task.desc     = document.getElementById('sideDesc').value.trim();

        if (newColId !== colId) {
            const src = tbColumns.find(c => c.id === colId);
            const tgt = tbColumns.find(c => c.id === newColId);
            src.tasks = src.tasks.filter(t => t.id !== task.id);
            tgt.tasks.push(task);
            tbCurrentTask.colId = newColId;
            if (newColId === 'done') {
                addNotification({ title: `Tâche « ${task.name} » achevée`, level: 'success', silent: true, audience: ['sarah','lila'] });
            }
        }

        // Si priorité est devenue urgente
        if (task.priority === 'urgent' && oldPrio !== 'urgent' && userSettings.notifUrgent) {
            addNotification({ title: `Tâche « ${task.name} » marquée urgente`, level: 'critical', audience: ['sarah','lila'] });
        }

        closeTaskPanel();
        renderBoard();
    });

    document.getElementById('taskDeleteBtn').addEventListener('click', () => {
        tbPendingDelete = tbCurrentTask;
        document.getElementById('confirmTitle').textContent   = 'Supprimer cette tâche ?';
        document.getElementById('confirmMessage').textContent = 'Cette action est irréversible.';
        document.getElementById('confirmModal').classList.remove('hidden');
    });

    /* ── DATE PICKER ── */
    document.getElementById('btnDateStart').addEventListener('click', (e) => { e.stopPropagation(); openDatePicker('start'); });
    document.getElementById('btnDateEnd').addEventListener('click',   (e) => { e.stopPropagation(); openDatePicker('end');   });

    document.getElementById('clrDateStart').addEventListener('click', (e) => {
        e.stopPropagation();
        if (tbCurrentTask) tbCurrentTask.task.dateStart = '';
        updateDateBtnUI('start', '');
        renderDatePicker();
    });
    document.getElementById('clrDateEnd').addEventListener('click', (e) => {
        e.stopPropagation();
        if (tbCurrentTask) tbCurrentTask.task.dateEnd = '';
        updateDateBtnUI('end', '');
        renderDatePicker();
    });

    document.getElementById('dpPrev').addEventListener('click', () => {
        tbDpMonth--;
        if (tbDpMonth < 0) { tbDpMonth = 11; tbDpYear--; }
        renderDatePicker();
        updateShortcutLabels();
    });
    document.getElementById('dpNext').addEventListener('click', () => {
        tbDpMonth++;
        if (tbDpMonth > 11) { tbDpMonth = 0; tbDpYear++; }
        renderDatePicker();
        updateShortcutLabels();
    });

    document.querySelectorAll('.dp-sc').forEach(btn => {
        btn.addEventListener('click', () => {
            const sc = btn.dataset.shortcut;
            const map = {
                'today':     shortcutDate(0),
                'tomorrow':  shortcutDate(1),
                'next-week': shortcutDate(7),
                '2weeks':    shortcutDate(14),
                '4weeks':    shortcutDate(28)
            };
            if (map[sc]) applyDate(map[sc]);
        });
    });

    // Fermer date picker au clic dehors
    document.addEventListener('click', (e) => {
        const dpPopup = document.getElementById('datePicker');
        if (dpPopup.classList.contains('open') && !dpPopup.contains(e.target)) {
            closeDatePicker();
        }
    });

    /* ── TASKBOARD : MODAL AJOUT GROUPE ── */
    document.getElementById('openAddGroupBtn').addEventListener('click', openGroupModal);
    document.getElementById('groupOverlay').addEventListener('click', () => document.getElementById('groupModal').classList.add('hidden'));
    document.getElementById('groupCancel').addEventListener('click',   () => document.getElementById('groupModal').classList.add('hidden'));
    document.getElementById('colorRow').addEventListener('click', e => {
        const s = e.target.closest('.cswatch');
        if (!s) return;
        document.querySelectorAll('#colorRow .cswatch').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        tbSelectedColor = s.dataset.color;
    });
    document.getElementById('groupSaveBtn').addEventListener('click', () => {
        const name  = document.getElementById('groupNameInput').value.trim();
        if (!name) { document.getElementById('groupNameInput').focus(); return; }
        const modal = document.getElementById('groupModal');
        const mode  = modal.dataset.mode || 'create';

        if (mode === 'rename') {
            const col = tbColumns.find(c => c.id === modal.dataset.colId);
            if (col) {
                col.label = name.toUpperCase();
                col.color = tbSelectedColor;
                showToast({ title: 'Groupe mis à jour', message: name, level: 'success', duration: 2000 });
            }
        } else {
            tbColumns.push({ id: uid('col'), label: name.toUpperCase(), color: tbSelectedColor, tasks: [] });
            showToast({ title: 'Groupe ajouté', message: name, level: 'success', duration: 2000 });
        }

        modal.classList.add('hidden');
        document.getElementById('groupNameInput').value = '';
        renderBoard();
    });
    document.getElementById('groupNameInput').addEventListener('keydown', e => {
        if (e.key === 'Enter')  document.getElementById('groupSaveBtn').click();
        if (e.key === 'Escape') document.getElementById('groupModal').classList.add('hidden');
    });

    /* ── GANTT : AJOUT TÂCHE ── */
    document.getElementById('gantt-add-task-btn').addEventListener('click', () => openGanttTaskModal());
    document.getElementById('gt-cancel').addEventListener('click', () => document.getElementById('ganttTaskModal').classList.add('hidden'));
    document.getElementById('gt-save').addEventListener('click', saveGanttTask);
    document.getElementById('gdp-delete')?.addEventListener('click', deleteGanttTask);

    /* ── TASKBOARD : FILTRE ── */
    document.getElementById('tb-filter-btn').addEventListener('click', () => {
        document.getElementById('flt-text').value     = tbFilter.text;
        document.getElementById('flt-priority').value = tbFilter.priority;
        document.getElementById('flt-assignee').value = tbFilter.assignee;
        document.getElementById('filterModal').classList.remove('hidden');
    });
    document.getElementById('flt-apply').addEventListener('click', () => {
        tbFilter.text     = document.getElementById('flt-text').value.trim();
        tbFilter.priority = document.getElementById('flt-priority').value;
        tbFilter.assignee = document.getElementById('flt-assignee').value.trim();
        document.getElementById('filterModal').classList.add('hidden');

        const btn   = document.getElementById('tb-filter-btn');
        const label = document.getElementById('tb-filter-label');
        const clear = document.getElementById('tb-filter-clear');
        if (tbFilterActive()) {
            btn.classList.add('active');
            const parts = [];
            if (tbFilter.priority) parts.push(tbFilter.priority);
            if (tbFilter.assignee) parts.push(tbFilter.assignee);
            if (tbFilter.text)     parts.push('"' + tbFilter.text + '"');
            label.textContent = 'Filtré : ' + parts.join(' · ');
            clear.classList.remove('hidden');
        } else {
            btn.classList.remove('active');
            label.textContent = 'Filtrer';
            clear.classList.add('hidden');
        }
        renderBoard();
    });
    document.getElementById('flt-reset').addEventListener('click', () => {
        document.getElementById('flt-text').value     = '';
        document.getElementById('flt-priority').value = '';
        document.getElementById('flt-assignee').value = '';
        document.getElementById('flt-apply').click();
    });
    document.getElementById('tb-filter-clear').addEventListener('click', () => {
        tbFilter = { priority: '', assignee: '', text: '' };
        document.getElementById('tb-filter-btn').classList.remove('active');
        document.getElementById('tb-filter-label').textContent = 'Filtrer';
        document.getElementById('tb-filter-clear').classList.add('hidden');
        const searchInput = document.getElementById('tb-search-input');
        if (searchInput) searchInput.value = '';
        const searchClear = document.getElementById('tb-search-clear');
        if (searchClear) searchClear.classList.add('hidden');
        const searchCount = document.getElementById('tb-search-count');
        if (searchCount) searchCount.classList.add('hidden');
        renderBoard();
    });

    /* ── TASKBOARD : RECHERCHE PERMANENTE ── */
    const tbSearchInput = document.getElementById('tb-search-input');
    if (tbSearchInput) {
        tbSearchInput.addEventListener('input', (e) => onTaskboardSearch(e.target.value));
        tbSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') clearTaskboardSearch();
        });
    }
    const tbSearchClearBtn = document.getElementById('tb-search-clear');
    if (tbSearchClearBtn) {
        tbSearchClearBtn.addEventListener('click', clearTaskboardSearch);
    }

    /* ── GANTT : AJOUT GROUPE ── */
    document.getElementById('gantt-add-group-btn').addEventListener('click', openGanttGroupModal);
    document.getElementById('gg-cancel').addEventListener('click', () => document.getElementById('ganttGroupModal').classList.add('hidden'));
    document.getElementById('gg-save').addEventListener('click', saveGanttGroup);
    document.getElementById('gg-color-row').addEventListener('click', e => {
        const s = e.target.closest('.cswatch');
        if (!s) return;
        document.querySelectorAll('#gg-color-row .cswatch').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        ggSelectedColor = s.dataset.color;
    });

    /* ── GANTT : FERMETURE DÉTAIL ── */
    document.getElementById('gdp-close').addEventListener('click', closeGanttDetail);

    /* ── GANTT : BOUTON AUJOURD'HUI ── */
    document.getElementById('gantt-today-btn').addEventListener('click', () => {
        const chart = document.querySelector('.gantt-chart-area');
        if (!chart) return;
        const today = new Date();
        if (today < GANTT_START || today > GANTT_END) {
            showToast({ title: 'Hors période', message: 'La date du jour est en dehors du planning affiché', level: 'warning' });
            return;
        }
        const offset = daysBetween(GANTT_START, today.toISOString().split('T')[0]);
        chart.scrollTo({ left: Math.max(0, offset * DAY_W - 200), behavior: 'smooth' });
    });

    /* ── PRESTATAIRES ── */
    document.getElementById('provider-add-btn').addEventListener('click', openProviderModal);
    document.getElementById('pr-cancel').addEventListener('click', () => document.getElementById('providerModal').classList.add('hidden'));
    document.getElementById('pr-save').addEventListener('click', saveProvider);

    /* ── TODOS ── */
    document.getElementById('todo-add-btn').addEventListener('click', openTodoModal);
    document.getElementById('td-cancel').addEventListener('click', () => document.getElementById('todoModal').classList.add('hidden'));
    document.getElementById('td-save').addEventListener('click', saveTodo);

    /* ── CATÉGORIES : modal ─── */
    document.getElementById('td-cat-add').addEventListener('click', () => {
        if (!canDo('category.add')) {
            showToast({ title: 'Action réservée', level: 'warning' });
            return;
        }
        document.getElementById('cat-name').value = '';
        document.getElementById('cat-icon').value = '📌';
        document.querySelectorAll('#cat-color-row .cswatch').forEach(s => s.classList.remove('selected'));
        document.querySelector('#cat-color-row .cswatch[data-color="#1D6FA4"]').classList.add('selected');
        document.getElementById('categoryModal').dataset.color = '#1D6FA4';
        document.getElementById('categoryModal').classList.remove('hidden');
        document.getElementById('cat-name').focus();
    });
    document.getElementById('cat-color-row').addEventListener('click', e => {
        const s = e.target.closest('.cswatch');
        if (!s) return;
        document.querySelectorAll('#cat-color-row .cswatch').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        document.getElementById('categoryModal').dataset.color = s.dataset.color;
    });
    document.getElementById('cat-cancel').addEventListener('click', () =>
        document.getElementById('categoryModal').classList.add('hidden'));
    document.getElementById('cat-save').addEventListener('click', () => {
        const name  = document.getElementById('cat-name').value.trim();
        const icon  = document.getElementById('cat-icon').value.trim() || '📌';
        const color = document.getElementById('categoryModal').dataset.color || '#1D6FA4';
        if (!name) { showToast({ title: 'Nom requis', level: 'warning' }); return; }
        const newCat = {
            id: 'cat_' + Date.now().toString(36),
            label: name, color, icon
        };
        taskCategories.push(newCat);
        document.getElementById('categoryModal').classList.add('hidden');
        renderCategoryChips(newCat.id);
        showToast({ title: 'Catégorie ajoutée', message: name, level: 'success', duration: 2000 });
    });

    /* ── VUE JOURNÉE ── */
    document.getElementById('dv-prev').addEventListener('click', () => navigateDayView(-1));
    document.getElementById('dv-next').addEventListener('click', () => navigateDayView(1));
    document.getElementById('dayview-today-btn').addEventListener('click', goToToday);
    document.getElementById('dv-add-task-btn').addEventListener('click', () => {
        openTodoModal();
        // Pré-remplir avec la date de la vue actuelle
        if (dayviewDate) document.getElementById('td-date').value = dayviewDate;
        if (dayviewWho)  document.getElementById('td-assignee').value = dayviewWho;
    });
    /* ── VUE JOURNÉE : recherche ── */
    const dvSearch = document.getElementById('dv-search-input');
    if (dvSearch) {
        dvSearch.addEventListener('input', (e) => onDayviewSearch(e.target.value));
        dvSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') clearDayviewSearch();
        });
    }

    /* ── SETTINGS ── */
    setupSettings();

    /* ── Bouton "Réinitialiser les données" dans Paramètres ── */
    const resetBtn = document.getElementById('settings-reset-data');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Effacer toutes vos modifications et restaurer les données initiales ?\n\nCette action est irréversible.')) {
                resetStorage();
            }
        });
    }

    /* ── Fermer overlays au clic bg ── */
    document.querySelectorAll('.overlay-bg').forEach(bg => {
        bg.addEventListener('click', () => {
            bg.closest('.overlay-modal').classList.add('hidden');
            window._pendingProviderDelete = null;
            tbPendingDelete = null;
            tbPendingColDelete = null;
        });
    });

    /* ── Fermer le menu ⋯ d'une colonne au clic extérieur ── */
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('col-menu-active');
        if (menu && !menu.contains(e.target) && !e.target.closest('.col-more-btn')) {
            closeColumnMenu();
        }
    });

    /* ── Repositionner popup calendrier au scroll/resize ── */
    window.addEventListener('resize', () => closeMiniCalPopup());

    /* ── PERSISTANCE localStorage ── */
    // Restaure l'état sauvegardé s'il existe (écrase les données générées)
    const wasRestored = restoreState();

    /* ── INITIAL RENDER ── */
    applyRole('sarah');
    updateSyncUI();
    renderNotifications();
    updateNotifBadge();
    renderMiniCal();
    updateCountdown();
    refreshDashboard();

    // Attache les hooks de sauvegarde automatique APRÈS le render initial
    attachStorageHooks();

    // Affiche les notifs de la phase courante en toast au démarrage
    // (seulement si on n'a pas restauré, sinon ça spam à chaque rechargement)
    if (!wasRestored) {
        playInitialNotificationToasts();
    }
});