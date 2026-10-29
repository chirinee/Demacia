/* =====================================================
   DEMACIA — help.js
   Vue Aide pour John : appel direct + messages prédéfinis
   + signalement d'incident + message libre.
   Chaque action génère une notification côté Lila/Sarah.
===================================================== */

// Onglet actif dans la vue mobile John : 'tasks' ou 'help'
let johnMobileTab = 'tasks';

// Messages prédéfinis avec leur niveau de priorité
const HELP_QUICK_MESSAGES = [
    { icon: '💬', label: "J'ai besoin d'aide",  level: 'warning' },
    { icon: '📍', label: 'Je suis perdu',       level: 'warning' },
    { icon: '✅', label: "J'ai fini ma tâche",  level: 'success' },
    { icon: '❓', label: "J'ai une question",   level: 'info'    },
    { icon: '⏰', label: 'Je suis en retard',    level: 'warning' }
];

/* ─── Affichage de la vue (onglets + contenu) ─── */
function renderMobileView() {
    // Onglets : affichés au-dessus du body mobile
    const tabsContainer = document.getElementById('mobile-tabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = `
            <button class="mobile-tab ${johnMobileTab === 'tasks' ? 'active' : ''}" data-tab="tasks">
                <span class="mobile-tab-icon">📋</span> Mes tâches
            </button>
            <button class="mobile-tab ${johnMobileTab === 'help' ? 'active' : ''}" data-tab="help">
                <span class="mobile-tab-icon">?</span> Aide
            </button>
        `;
        tabsContainer.querySelectorAll('.mobile-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                johnMobileTab = btn.dataset.tab;
                renderMobileView();
            });
        });
    }

    // Affichage selon onglet
    const tasksBody = document.getElementById('mobile-tasks-body');
    const helpBody  = document.getElementById('mobile-help-body');
    if (tasksBody && helpBody) {
        if (johnMobileTab === 'tasks') {
            tasksBody.classList.remove('hidden');
            helpBody.classList.add('hidden');
            renderTodos('john');
        } else {
            tasksBody.classList.add('hidden');
            helpBody.classList.remove('hidden');
            renderHelpView();
        }
    }
}

/* ─── Rendu de la vue Aide ─── */
function renderHelpView() {
    const body = document.getElementById('mobile-help-body');
    if (!body) return;

    body.innerHTML = `
        <!-- Appel direct -->
        <a href="tel:0623456789" class="help-call-btn">
            <span class="help-call-icon">📞</span>
            <div class="help-call-text">
                <strong>Appeler Lila</strong>
                <span>Coordinatrice du jour</span>
            </div>
        </a>

        <!-- Messages rapides -->
        <div class="help-section-label">Messages rapides à Lila</div>
        <div class="help-quick-grid" id="help-quick-grid"></div>

        <!-- Message personnalisé -->
        <div class="help-section-label">Message personnalisé</div>
        <div class="help-message-wrap">
            <textarea
                id="help-message-input"
                class="help-message-input"
                placeholder="Tapez votre message à Lila…"
                rows="3"></textarea>
            <button class="help-send-btn" id="help-send-message">
                Envoyer à Lila
            </button>
        </div>

        <!-- Signalement d'incident -->
        <div class="help-section-label help-section-danger">Signaler un incident 🚨</div>
        <div class="help-incident-wrap">
            <textarea
                id="help-incident-input"
                class="help-incident-input"
                placeholder="Décrivez l'incident (accident, problème grave, urgence…)"
                rows="3"></textarea>
            <button class="help-incident-btn" id="help-send-incident">
                ⚠ Signaler en urgence
            </button>
            <p class="help-incident-warning">
                Le signalement notifie immédiatement Lila et Sarah.
            </p>
        </div>
    `;

    // Boutons messages rapides
    const grid = document.getElementById('help-quick-grid');
    HELP_QUICK_MESSAGES.forEach(msg => {
        const btn = document.createElement('button');
        btn.className = 'help-quick-btn';
        btn.innerHTML = `
            <span class="help-quick-icon">${msg.icon}</span>
            <span class="help-quick-label">${msg.label}</span>
        `;
        btn.addEventListener('click', () => sendQuickMessage(msg));
        grid.appendChild(btn);
    });

    // Bouton envoi message personnalisé
    document.getElementById('help-send-message').addEventListener('click', () => {
        const input = document.getElementById('help-message-input');
        const text = input.value.trim();
        if (!text) {
            showToast({ title: 'Message vide', message: 'Tapez quelque chose avant d\'envoyer', level: 'warning', duration: 2500 });
            return;
        }
        sendCustomMessage(text);
        input.value = '';
    });

    // Bouton signalement incident
    document.getElementById('help-send-incident').addEventListener('click', () => {
        const input = document.getElementById('help-incident-input');
        const text = input.value.trim();
        if (!text) {
            showToast({ title: 'Description manquante', message: 'Décrivez l\'incident avant de signaler', level: 'warning', duration: 2500 });
            return;
        }
        sendIncident(text);
        input.value = '';
    });
}

/* ─── Envoi des messages : créent une notification côté Lila/Sarah ─── */

function sendQuickMessage(msg) {
    // On crée une notification visible par Lila et Sarah (l'audience exclut John)
    notifications.unshift({
        id: uid('n'),
        title: `John : « ${msg.label} »`,
        time: 'à l\'instant',
        level: msg.level,
        read: false,
        audience: ['lila', 'sarah']
    });

    // Si on est en mode hors-ligne, on simule un pending sync
    if (!isOnline) {
        showToast({
            title: 'Message en attente',
            message: 'Sera envoyé à la reconnexion',
            level: 'warning',
            duration: 3000
        });
    } else {
        showToast({
            title: 'Message envoyé à Lila',
            message: msg.label,
            level: 'success',
            duration: 2500
        });
    }
}

function sendCustomMessage(text) {
    notifications.unshift({
        id: uid('n'),
        title: `John : « ${text} »`,
        time: 'à l\'instant',
        level: 'info',
        read: false,
        audience: ['lila', 'sarah']
    });

    if (!isOnline) {
        showToast({
            title: 'Message en attente',
            message: 'Sera envoyé à la reconnexion',
            level: 'warning',
            duration: 3000
        });
    } else {
        showToast({
            title: 'Message envoyé à Lila',
            message: text.length > 40 ? text.substring(0, 40) + '…' : text,
            level: 'success',
            duration: 2500
        });
    }
}

function sendIncident(text) {
    // Incident → notification CRITIQUE pour Lila ET Sarah
    notifications.unshift({
        id: uid('n'),
        title: `🚨 INCIDENT signalé par John : ${text}`,
        time: 'à l\'instant',
        level: 'critical',
        read: false,
        audience: ['lila', 'sarah']
    });

    showToast({
        title: '🚨 Incident signalé',
        message: 'Lila et Sarah ont été alertées en urgence',
        level: 'critical',
        duration: 4500
    });
}