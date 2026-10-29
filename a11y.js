/* =====================================================
   DEMACIA — a11y.js
   Accessibilité clavier : Échap pour fermer modals,
   Tab piégé dans les modals ouverts, focus management.
===================================================== */

/**
 * Trouve les éléments focalisables dans un container.
 */
function getFocusableElements(container) {
    const selector = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[role="button"]:not([disabled])'
    ].join(',');
    return Array.from(container.querySelectorAll(selector))
        .filter(el => el.offsetParent !== null); // visibles uniquement
}

/**
 * Trouve le modal actuellement ouvert (s'il y en a un).
 */
function getOpenModal() {
    // overlay-modal sans .hidden
    const overlays = document.querySelectorAll('.overlay-modal:not(.hidden)');
    if (overlays.length > 0) return overlays[overlays.length - 1];

    // side-modal avec .open
    const side = document.querySelector('.side-modal.open');
    if (side) return side;

    return null;
}

/**
 * Gestion globale du clavier : Échap pour fermer le modal courant.
 */
document.addEventListener('keydown', (e) => {
    // ─── Échap : fermer le modal ou panneau ouvert ───
    if (e.key === 'Escape') {
        // 1. Modal ouvert ?
        const modal = getOpenModal();
        if (modal) {
            e.preventDefault();
            if (modal.classList.contains('side-modal')) {
                modal.classList.remove('open');
            } else {
                modal.classList.add('hidden');
            }
            return;
        }

        // 2. Panneau de notifications ouvert ?
        const notifPanel = document.getElementById('notif-panel');
        if (notifPanel && notifPanel.classList.contains('open')) {
            notifPanel.classList.remove('open');
            const btn = document.getElementById('notif-btn');
            if (btn) {
                btn.setAttribute('aria-expanded', 'false');
                btn.focus();
            }
            return;
        }

        // 3. Popup mini-calendrier ?
        const popup = document.getElementById('minical-popup');
        if (popup && popup.classList.contains('open')) {
            popup.classList.remove('open');
            return;
        }

        // 4. Menu colonne ouvert ?
        const colMenu = document.getElementById('col-menu-active');
        if (colMenu && typeof closeColumnMenu === 'function') {
            closeColumnMenu();
            return;
        }

        // 5. Date picker ?
        const dp = document.getElementById('datePicker');
        if (dp && dp.classList.contains('open') && typeof closeDatePicker === 'function') {
            closeDatePicker();
            return;
        }
    }

    // ─── Tab piégé dans le modal ouvert ───
    if (e.key === 'Tab') {
        const modal = getOpenModal();
        if (modal) {
            const focusables = getFocusableElements(modal);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last  = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (e.shiftKey) {
                // Shift+Tab depuis le premier → boucle vers le dernier
                if (active === first || !modal.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab depuis le dernier → boucle vers le premier
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }
});

/**
 * Quand un modal s'ouvre, on focus le premier élément focalisable
 * (champ texte de préférence) et on mémorise l'élément précédent pour
 * lui rendre le focus à la fermeture.
 */
let _previousFocusedElement = null;

// Observer les modals : quand ils deviennent visibles, gérer le focus
function observeModalVisibility() {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
            const target = m.target;

            // Modal classique (overlay-modal)
            if (target.classList.contains('overlay-modal')) {
                if (!target.classList.contains('hidden')) {
                    // Ouvert
                    _previousFocusedElement = document.activeElement;
                    setTimeout(() => {
                        const focusables = getFocusableElements(target);
                        if (focusables.length > 0) {
                            // Préfère un input texte, sinon le premier focalisable
                            const input = target.querySelector('input[type="text"]:not([disabled]), textarea:not([disabled])');
                            (input || focusables[0]).focus();
                        }
                    }, 50);
                } else if (_previousFocusedElement) {
                    // Fermé → rendre le focus
                    _previousFocusedElement.focus();
                    _previousFocusedElement = null;
                }
            }

            // Side-modal (taskModal)
            if (target.classList.contains('side-modal')) {
                if (target.classList.contains('open')) {
                    _previousFocusedElement = document.activeElement;
                    setTimeout(() => {
                        const focusables = getFocusableElements(target);
                        if (focusables.length > 0) focusables[0].focus();
                    }, 50);
                } else if (_previousFocusedElement) {
                    _previousFocusedElement.focus();
                    _previousFocusedElement = null;
                }
            }
        });
    });

    document.querySelectorAll('.overlay-modal, .side-modal').forEach(modal => {
        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
}

/**
 * Mise à jour des attributs ARIA quand l'état change.
 * Appelée par les autres modules quand ils changent l'UI.
 */
function updateAriaStates() {
    // Cloche de notifications : aria-expanded selon l'état du panneau
    const notifBtn = document.getElementById('notif-btn');
    const notifPanel = document.getElementById('notif-panel');
    if (notifBtn && notifPanel) {
        const isOpen = notifPanel.classList.contains('open');
        notifBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    // Switcher de rôles : aria-checked sur le rôle actif
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.setAttribute('aria-checked', btn.classList.contains('active') ? 'true' : 'false');
    });

    // Indicateur sync : mise à jour de l'aria-label
    const syncIndicator = document.getElementById('sync-indicator');
    if (syncIndicator) {
        const isOff = syncIndicator.classList.contains('offline');
        syncIndicator.setAttribute('aria-label',
            isOff ? 'Statut : hors-ligne. Cliquer pour repasser en ligne'
                  : 'Statut : en ligne. Cliquer pour simuler la perte de réseau');
    }
}

// Mise à jour périodique légère (toutes les 500ms)
setInterval(updateAriaStates, 500);

/**
 * Permet d'activer les éléments role="button" avec Espace/Entrée
 * (les vrais <button> le font nativement, pas les <div role="button">).
 */
document.addEventListener('keydown', (e) => {
    if (e.target.getAttribute('role') === 'button' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.target.click();
    }
});

// Initialise au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    observeModalVisibility();
    updateAriaStates();
});