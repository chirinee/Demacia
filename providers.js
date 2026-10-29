/* =====================================================
   DEMACIA — providers.js
   Prestataires : affichage cartes + feux tricolores,
   ajout (Sarah uniquement), suppression, détail.
===================================================== */

function renderProviders() {
    const grid = document.getElementById('providers-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const statusMap = {
        arrived:  { label: 'Arrivé',     bulb: 'green',  onIdx: 2 },
        progress: { label: 'À venir',    bulb: 'orange', onIdx: 1 },
        late:     { label: 'En retard',  bulb: 'red',    onIdx: 0 }
    };

    providers.forEach(p => {
        const s = statusMap[p.status];
        const card = document.createElement('div');
        card.className = 'provider-card';
        card.dataset.id = p.id;

        const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

        card.innerHTML = `
            ${canDo('providers.delete') ? `<button class="provider-card-delete" title="Supprimer">✕</button>` : ''}
            <div class="provider-card-top">
                <div class="provider-avatar">${initials}</div>
                <div class="provider-info">
                    <strong>${p.name}</strong>
                    <span>${p.role}</span>
                </div>
                <div class="traffic-light">
                    <div class="traffic-bulb ${s.onIdx === 0 ? 'on red'    : ''}"></div>
                    <div class="traffic-bulb ${s.onIdx === 1 ? 'on orange' : ''}"></div>
                    <div class="traffic-bulb ${s.onIdx === 2 ? 'on green'  : ''}"></div>
                </div>
            </div>
            <div class="provider-status-label status-${p.status}">${s.label}</div>
            <div class="provider-card-bottom">
                <span>📞 ${p.phone}</span>
                <span>🕐 ${p.eta}</span>
            </div>
        `;

        // Clic carte → bascule de statut (pour démo) - uniquement pour Sarah
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('provider-card-delete')) return;
            if (!canDo('providers.delete')) return;
            // Cycle: progress → arrived → late → progress
            const cycle = { progress: 'arrived', arrived: 'late', late: 'progress' };
            const oldStatus = p.status;
            p.status = cycle[p.status];
            if (p.status === 'late' && oldStatus !== 'late' && userSettings.notifLate) {
                addNotification({ title: `⚠ ${p.name} signalé en retard`, level: 'critical', audience: ['sarah','lila'] });
            }
            renderProviders();
            refreshDashboard();
        });

        // Bouton suppression
        const delBtn = card.querySelector('.provider-card-delete');
        if (delBtn) {
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDeleteProvider(p.id);
            });
        }

        grid.appendChild(card);
    });
}

function confirmDeleteProvider(providerId) {
    const prov = providers.find(p => p.id === providerId);
    if (!prov) return;

    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent   = 'Supprimer ce prestataire ?';
    document.getElementById('confirmMessage').textContent = `« ${prov.name} » sera définitivement retiré de la liste.`;
    modal.classList.remove('hidden');

    // On remplace temporairement le handler "confirmDelete"
    window._pendingProviderDelete = providerId;
}

function openProviderModal() {
    if (!canDo('providers.add')) {
        showToast({ title: 'Action réservée', message: 'Seule Sarah peut ajouter un prestataire', level: 'warning' });
        return;
    }
    document.getElementById('pr-name').value   = '';
    document.getElementById('pr-role').value   = '';
    document.getElementById('pr-phone').value  = '';
    document.getElementById('pr-eta').value    = '';
    document.getElementById('pr-status').value = 'progress';
    document.getElementById('providerModal').classList.remove('hidden');
    document.getElementById('pr-name').focus();
}

function saveProvider() {
    const name   = document.getElementById('pr-name').value.trim();
    const role   = document.getElementById('pr-role').value.trim();
    const phone  = document.getElementById('pr-phone').value.trim();
    const eta    = document.getElementById('pr-eta').value.trim();
    const status = document.getElementById('pr-status').value;

    if (!name) { showToast({ title: 'Nom requis', level: 'warning' }); return; }
    if (!role) { showToast({ title: 'Rôle requis', level: 'warning' }); return; }

    const prov = {
        id: uid('p'),
        name, role,
        phone: phone || '—',
        eta:   eta   || '—',
        status
    };
    providers.push(prov);
    document.getElementById('providerModal').classList.add('hidden');

    renderProviders();
    refreshDashboard();

    showToast({ title: 'Prestataire ajouté', message: name, level: 'success', duration: 2500 });

    if (status === 'late' && userSettings.notifLate) {
        addNotification({ title: `⚠ ${name} signalé en retard`, level: 'critical', audience: ['sarah','lila'] });
    } else {
        addNotification({ title: `Prestataire « ${name} » ajouté`, level: 'info', silent: true, audience: ['sarah','lila'] });
    }
}