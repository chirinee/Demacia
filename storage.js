/* =====================================================
   DEMACIA — storage.js
   Persistance localStorage de toutes les données
   modifiables. Sauvegarde automatique après chaque
   action, restauration au démarrage.
===================================================== */

const STORAGE_KEY = 'demacia-state-v1';
const STORAGE_VERSION = 1;

// Empêche de sauvegarder pendant qu'on est en train de restaurer
let _storageRestoring = false;
// Limite la fréquence de sauvegarde (debounce)
let _saveTimer = null;

/**
 * Sauvegarde l'état complet de l'app dans localStorage.
 * Appelée automatiquement après chaque modification (debounced à 300ms).
 */
function saveState() {
    if (_storageRestoring) return;

    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        try {
            const state = {
                version: STORAGE_VERSION,
                savedAt: new Date().toISOString(),
                projects:       projects,
                providers:      providers,
                todosLila:      todosLila,
                todosJohn:      todosJohn,
                tbColumns:      typeof tbColumns !== 'undefined' ? tbColumns : null,
                taskCategories: taskCategories,
                notifications:  notifications,
                eventConfig:    { ...eventConfig },
                userSettings:   { ...userSettings }
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[Storage] Erreur lors de la sauvegarde :', e);
        }
    }, 300);
}

/**
 * Restaure l'état depuis localStorage.
 * Retourne true si une restauration a eu lieu, false sinon.
 */
function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;

        const state = JSON.parse(raw);

        // Vérification de version (au cas où on change la structure plus tard)
        if (state.version !== STORAGE_VERSION) {
            console.warn('[Storage] Version obsolète, on ignore la sauvegarde');
            return false;
        }

        _storageRestoring = true;

        // Restaure tableau par tableau (en remplaçant le contenu, pas la référence
        // pour ne pas casser les autres modules qui détiennent la référence)
        if (state.projects) {
            projects.length = 0;
            state.projects.forEach(p => projects.push(p));
        }
        if (state.providers) {
            providers.length = 0;
            state.providers.forEach(p => providers.push(p));
        }
        if (state.todosLila) {
            todosLila.length = 0;
            state.todosLila.forEach(t => todosLila.push(t));
        }
        if (state.todosJohn) {
            todosJohn.length = 0;
            state.todosJohn.forEach(t => todosJohn.push(t));
        }
        if (state.tbColumns && typeof tbColumns !== 'undefined') {
            tbColumns.length = 0;
            state.tbColumns.forEach(c => tbColumns.push(c));
        }
        if (state.taskCategories) {
            taskCategories.length = 0;
            state.taskCategories.forEach(c => taskCategories.push(c));
        }
        if (state.notifications) {
            notifications.length = 0;
            state.notifications.forEach(n => notifications.push(n));
        }
        if (state.eventConfig) {
            Object.assign(eventConfig, state.eventConfig);
        }
        if (state.userSettings) {
            Object.assign(userSettings, state.userSettings);
        }

        _storageRestoring = false;

        const savedAt = state.savedAt ? new Date(state.savedAt) : null;
        console.log('[Storage] État restauré ' + (savedAt ? '(sauvegardé le ' + savedAt.toLocaleString('fr-FR') + ')' : ''));
        return true;
    } catch (e) {
        console.warn('[Storage] Erreur lors de la restauration :', e);
        _storageRestoring = false;
        return false;
    }
}

/**
 * Efface la sauvegarde et recharge la page pour repartir des données de démo.
 */
function resetStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        showToast({ title: 'Données réinitialisées', message: 'Rechargement…', level: 'success', duration: 1500 });
        setTimeout(() => location.reload(), 1500);
    } catch (e) {
        console.warn('[Storage] Erreur lors du reset :', e);
    }
}

/**
 * Wrappe certaines fonctions globales pour déclencher saveState() automatiquement.
 * Appelée une seule fois après le chargement de tous les scripts.
 */
function attachStorageHooks() {
    // Liste des fonctions à wrapper : après leur exécution, on sauvegarde
    const fnsToWrap = [
        'toggleTodo', 'deleteTodo', 'saveTodo',
        'saveProvider', 'confirmDeleteProvider',
        'saveGanttTask', 'saveGanttGroup',
        'saveNewTask',
        'addNotification'
    ];

    fnsToWrap.forEach(fnName => {
        const original = window[fnName];
        if (typeof original === 'function') {
            window[fnName] = function(...args) {
                const result = original.apply(this, args);
                saveState();
                return result;
            };
        }
    });

    // Sauvegarder aussi quand on toggle le statut d'un prestataire (clic carte)
    // ou quand on modifie une tâche depuis la vue journée (drag)
    // → ces actions appellent renderProviders() / renderDayView() après modif,
    //   on déclenche une sauvegarde supplémentaire via un MutationObserver léger
    //   sur les boutons "Enregistrer" des modals
    document.addEventListener('click', (e) => {
        // Tous les boutons "Enregistrer" des modals + les bascules de statut
        if (e.target.matches('#settings-save, .provider-card, .dv-block, .col-menu-item, .dp-day')) {
            setTimeout(saveState, 50);
        }
    });
}