/* =====================================================
   DEMACIA — script.js
   Cœur applicatif : data globale, rôles, navigation,
   notifications, mini-calendrier sidebar, sync/offline,
   système de toast.
===================================================== */

/* ═══════════════════════════════════════════════════════
   DATA GLOBALE (partagée par les autres modules)
═══════════════════════════════════════════════════════ */

/* ─── Démo « vivante » ───
   Le scénario de démo a été écrit autour d'un mariage le 5 juillet 2026.
   Pour que la démo reste pertinente quel que soit le jour où on l'ouvre,
   toutes les dates du scénario sont décalées de façon à ce que le jour J
   tombe toujours DEMO_DAYS_BEFORE_WEDDING jours après aujourd'hui. */
const DEMO_BASE_WEDDING = '2026-07-05';
const DEMO_DAYS_BEFORE_WEDDING = 21;
const DEMO_SHIFT_DAYS = Math.round(
    (new Date(new Date().toISOString().split('T')[0]) - new Date(DEMO_BASE_WEDDING)) / 86400000
) + DEMO_DAYS_BEFORE_WEDDING;

// Décale une date ISO (AAAA-MM-JJ) du scénario de démo
function demoDate(iso) {
    const d = new Date(iso);
    d.setUTCDate(d.getUTCDate() + DEMO_SHIFT_DAYS);
    return d.toISOString().split('T')[0];
}

// Config événement (modifiable depuis Settings)
const eventConfig = {
    name: 'Mariage Fernando & Luisa',
    date: demoDate(DEMO_BASE_WEDDING),
    place: 'La Ciotat'
};

// Données Gantt (dates du scénario, recalées par demoDate)
const GANTT_START = new Date(demoDate('2026-06-01'));
const GANTT_END   = new Date(demoDate('2026-07-12'));
const DAY_W = 28;

let projects = [
    {
        id: 'lieu', label: 'Lieu & Logistique', color: '#1D6FA4', open: true,
        tasks: [
            { id: 't1', label: 'Réservation salle',  start: '2026-06-01', end: '2026-06-05', pct: 100, status: 'done',    owner: 'Sarah M.',  urgent: false, deps: [],       note: 'Contrat signé, acompte versé.' },
            { id: 't2', label: 'Plan de salle',      start: '2026-06-06', end: '2026-06-14', pct: 80,  status: 'active',  owner: 'Sarah M.',  urgent: false, deps: ['t1'],   note: 'En attente validation traiteur.' },
            { id: 't3', label: 'Signalétique',       start: '2026-06-15', end: '2026-06-28', pct: 20,  status: 'active',  owner: 'Lila R.',   urgent: false, deps: ['t2'],   note: '' },
            { id: 't4', label: 'Décoration florale', start: '2026-06-20', end: '2026-07-05', pct: 0,   status: 'todo',    owner: 'Lila R.',   urgent: false, deps: ['t2'],   note: 'Devis reçu, à valider.' }
        ]
    },
    {
        id: 'traiteur', label: 'Traiteur & Boissons', color: '#C62828', open: true,
        tasks: [
            { id: 't5', label: 'Sélection traiteur', start: '2026-06-01', end: '2026-06-10', pct: 60,  status: 'critical', owner: 'Sarah M.',  urgent: true,  deps: [],       note: '⚠ Retard 2 jours — relancer le prestataire.' },
            { id: 't6', label: 'Menu dégustation',   start: '2026-06-11', end: '2026-06-18', pct: 0,   status: 'todo',     owner: 'Sarah M.',  urgent: false, deps: ['t5'],   note: 'Bloqué par t5.' },
            { id: 't7', label: 'Bar & cocktails',    start: '2026-06-18', end: '2026-06-30', pct: 0,   status: 'todo',     owner: 'Lila R.',   urgent: false, deps: ['t6'],   note: '' }
        ]
    },
    {
        id: 'invites', label: 'Invités & Protocole', color: '#F0A500', open: true,
        tasks: [
            { id: 't8',  label: 'Invitations envoyées', start: '2026-06-01', end: '2026-06-07', pct: 100, status: 'done',   owner: 'Sarah M.', urgent: false, deps: [],      note: '124 invitations postées.' },
            { id: 't9',  label: 'Suivi confirmations',  start: '2026-06-08', end: '2026-06-25', pct: 55,  status: 'active', owner: 'Sarah M.', urgent: false, deps: ['t8'],  note: '68/124 confirmés.' },
            { id: 't10', label: 'Relance VIPs',         start: '2026-06-18', end: '2026-06-20', pct: 0,   status: 'warn',   owner: 'Lila R.',  urgent: true,  deps: ['t9'],  note: '⏳ Échéance demain 10h00.' },
            { id: 't11', label: 'Plan de table',        start: '2026-06-26', end: '2026-07-04', pct: 0,   status: 'todo',   owner: 'Sarah M.', urgent: false, deps: ['t9'],  note: '' }
        ]
    },
    {
        id: 'media', label: 'Médias & Souvenirs', color: '#2E7D32', open: false,
        tasks: [
            { id: 't12', label: 'Photographe',    start: '2026-06-05', end: '2026-06-10', pct: 100, status: 'done',   owner: 'Sarah M.', urgent: false, deps: [],       note: 'Contrat signé.' },
            { id: 't13', label: 'Vidéaste',       start: '2026-06-05', end: '2026-06-12', pct: 100, status: 'done',   owner: 'Sarah M.', urgent: false, deps: [],       note: 'Contrat signé.' },
            { id: 't14', label: 'Livre d\'or',    start: '2026-06-20', end: '2026-06-28', pct: 10,  status: 'active', owner: 'Lila R.',  urgent: false, deps: [],       note: '' },
            { id: 't15', label: 'Cadeaux invités',start: '2026-06-22', end: '2026-07-03', pct: 0,   status: 'todo',   owner: 'Lila R.',  urgent: false, deps: ['t9'],   note: '' }
        ]
    }
];

// Recale les dates des tâches Gantt sur le calendrier de la démo
projects.forEach(p => p.tasks.forEach(t => {
    t.start = demoDate(t.start);
    t.end   = demoDate(t.end);
}));

// Ajuste l'avancement du Gantt selon la phase (J-X)
// Ordre logique des tâches du plus prioritaire au moins prioritaire
// (les premières sont faites en premier)
function adjustGanttForPhase() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(eventConfig.date);
    target.setHours(0,0,0,0);
    const daysToWedding = Math.round((target - today) / 86400000);

    // Ordre de réalisation prioritaire des tâches Gantt
    // (du plus tôt au plus tard dans la prépa)
    const taskOrder = [
        't1',   // Réservation salle (priorité absolue)
        't12',  // Photographe
        't13',  // Vidéaste
        't8',   // Invitations envoyées
        't5',   // Sélection traiteur
        't2',   // Plan de salle
        't9',   // Suivi confirmations (très long)
        't6',   // Menu dégustation
        't3',   // Signalétique
        't14',  // Livre d'or
        't4',   // Décoration florale
        't10',  // Relance VIPs
        't15',  // Cadeaux invités
        't7',   // Bar & cocktails
        't11'   // Plan de table (dernier)
    ];

    // Combien de tâches done / active / todo selon la phase
    let nbDone, nbActive;
    if (daysToWedding > 45)      { nbDone = 3;  nbActive = 2; }  // J-55+ : début
    else if (daysToWedding > 30) { nbDone = 5;  nbActive = 3; }  // J-30 à J-45
    else if (daysToWedding > 15) { nbDone = 7;  nbActive = 3; }  // J-15 à J-30
    else if (daysToWedding > 7)  { nbDone = 9;  nbActive = 3; }  // J-7 à J-15
    else if (daysToWedding > 1)  { nbDone = 11; nbActive = 3; }  // semaine du mariage
    else if (daysToWedding === 1){ nbDone = 13; nbActive = 2; }  // veille
    else if (daysToWedding === 0){ nbDone = 15; nbActive = 0; }  // jour J : tout fait
    else                         { nbDone = 15; nbActive = 0; }  // après

    // Construit un map id -> nouveau statut/pct
    const updates = {};
    taskOrder.forEach((tid, idx) => {
        if (idx < nbDone) {
            updates[tid] = { status: 'done', pct: 100 };
        } else if (idx < nbDone + nbActive) {
            // Une tâche active a un avancement variable selon sa position
            const progressInActive = (idx - nbDone) / Math.max(nbActive, 1);
            updates[tid] = { status: 'active', pct: Math.round(70 - progressInActive * 50) };
        } else {
            updates[tid] = { status: 'todo', pct: 0 };
        }
    });

    // Quelques exceptions narratives selon la phase
    if (daysToWedding > 7 && daysToWedding <= 45) {
        // Le traiteur (t5) a un "petit retard" pendant la phase active
        if (updates['t5'] && updates['t5'].status === 'active') {
            updates['t5'].status = 'critical';
            updates['t5'].urgent = true;
        }
    }
    if (daysToWedding > 2 && daysToWedding <= 20) {
        // Les VIPs ont une échéance qui approche
        if (updates['t10'] && updates['t10'].status === 'todo') {
            updates['t10'].status = 'warn';
            updates['t10'].urgent = true;
        }
    }

    // Applique les updates
    projects.forEach(p => {
        p.tasks.forEach(t => {
            const u = updates[t.id];
            if (u) {
                t.status = u.status;
                t.pct    = u.pct;
                if (u.urgent !== undefined) t.urgent = u.urgent;
            }
        });
    });
}
adjustGanttForPhase();

// Prestataires — statuts ajustés selon la phase (le jour J on a des arrivées/retards,
// avant on est juste "à venir")
let providers = [
    { id: 'p1', name: 'Société Gros Son',   role: 'Sonorisation / DJ',  phone: '06 12 34 56 78', eta: '14:00', status: 'progress' },
    { id: 'p2', name: 'Maison Lefèvre',     role: 'Traiteur',           phone: '06 23 45 67 89', eta: '13:00', status: 'progress' },
    { id: 'p3', name: 'Fleurs de Provence', role: 'Décoration florale', phone: '06 34 56 78 90', eta: '10:00', status: 'progress' },
    { id: 'p4', name: 'Studio Lumière',     role: 'Photographe',        phone: '06 45 67 89 01', eta: '15:30', status: 'progress' },
    { id: 'p5', name: 'Atelier Moncœur',    role: 'Pâtissier',          phone: '06 56 78 90 12', eta: '16:00', status: 'progress' },
    { id: 'p6', name: 'Chapiteaux du Sud',  role: 'Montage structure',  phone: '06 67 89 01 23', eta: '09:00', status: 'progress' }
];

// Ajuste les statuts des prestataires selon la proximité du mariage
function adjustProviderStatuses() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(eventConfig.date);
    target.setHours(0,0,0,0);
    const daysToWedding = Math.round((target - today) / 86400000);

    if (daysToWedding === 0) {
        // Jour J : mix d'arrivés et un retard pour illustrer la coordination temps réel
        providers[0].status = 'arrived';  // DJ
        providers[1].status = 'late';     // Traiteur en retard (scénario de démo)
        providers[2].status = 'arrived';  // Fleuriste
        providers[3].status = 'progress'; // Photographe à venir
        providers[4].status = 'progress'; // Pâtissier à venir
        providers[5].status = 'arrived';  // Montage structure (arrivé tôt)
    }
    // Sinon tous restent en 'progress' (déjà initialisé ci-dessus)
}
adjustProviderStatuses();

// Todos — générées dynamiquement pour tous les jours d'aujourd'hui au mariage
const _today = new Date().toISOString().split('T')[0];

let todosLila = [];
let todosJohn = [];

/**
 * Génère des todos pour tous les jours entre aujourd'hui et le mariage.
 * Plus on s'approche du jour J, plus il y a de tâches.
 * Le jour J lui-même contient un déroulé complet de la journée.
 */
function generateTodos() {
    // Pool de tâches typiques pour la préparation (Lila)
    const POOL_LILA = [
        { l: 'Appel mariés (point hebdo)',           t: '10:00', d: 30,  c: 'ceremonie'  },
        { l: 'Mise à jour planning prévisionnel',    t: '14:00', d: 45,  c: 'logistique' },
        { l: 'Relance prestataire',                  t: '15:30', d: 30,  c: 'traiteur'   },
        { l: 'Suivi confirmations invités',          t: '11:00', d: 60,  c: 'invites'    },
        { l: 'Validation devis fleuriste',           t: '14:30', d: 30,  c: 'deco'       },
        { l: 'Préparation briefing équipe',          t: '09:30', d: 45,  c: 'ceremonie'  },
        { l: 'Coordination prestataires',            t: '16:00', d: 45,  c: 'traiteur'   },
        { l: 'Vérification photographe',             t: '15:00', d: 30,  c: 'media'      },
        { l: 'Préparation playlist DJ',              t: '17:00', d: 60,  c: 'media'      },
        { l: 'Point logistique chapiteau',           t: '10:30', d: 45,  c: 'logistique' },
        { l: 'Inventaire matériel',                  t: '14:00', d: 60,  c: 'logistique' },
        { l: 'Réunion plan de salle',                t: '11:30', d: 60,  c: 'ceremonie'  }
    ];

    // Pool de tâches typiques pour John (bénévole)
    const POOL_JOHN = [
        { l: 'Courses fournitures',                  t: '10:00', d: 60, c: 'logistique' },
        { l: 'Aide transport matériel',              t: '15:00', d: 90, c: 'logistique' },
        { l: 'Récupération commande',                t: '11:00', d: 45, c: 'logistique' },
        { l: 'Aide installation décor',              t: '14:00', d: 60, c: 'deco'       }
    ];

    // Déroulé spécifique du jour J
    const programmeLilaJourJ = [
        { l: 'Arrivée sur site',                                t: '08:00', d: 30,  c: 'logistique', u: false, n: 'Vérification ouverture du château' },
        { l: 'Accueil prestataires (traiteur, fleuriste, DJ)',  t: '09:00', d: 60,  c: 'traiteur',   u: true,  n: 'Coordonner l\'arrivée des 6 prestataires' },
        { l: 'Briefing équipe coordination',                    t: '10:30', d: 30,  c: 'ceremonie',  u: false, n: 'Tour de table avec John' },
        { l: 'Supervision installation cérémonie',              t: '11:30', d: 90,  c: 'ceremonie',  u: false, n: '' },
        { l: 'Pause déjeuner équipe',                           t: '13:00', d: 45,  c: 'divers',     u: false, n: '' },
        { l: 'Accueil invités VIP',                             t: '13:45', d: 30,  c: 'invites',    u: false, n: 'Familles + témoins' },
        { l: 'Coordination cérémonie',                          t: '14:30', d: 60,  c: 'ceremonie',  u: true,  n: 'Au cœur de l\'action' },
        { l: 'Lancement cocktail',                              t: '16:00', d: 30,  c: 'traiteur',   u: false, n: 'Vin d\'honneur' },
        { l: 'Coordination dîner',                              t: '19:30', d: 120, c: 'traiteur',   u: false, n: 'Service en 4 temps' },
        { l: 'Lancement soirée dansante',                       t: '22:00', d: 30,  c: 'media',      u: false, n: 'Premier slow' }
    ];

    const programmeJohnJourJ = [
        { l: 'Préparer boissons fraîches',          t: '09:00', d: 60,  c: 'traiteur',   u: false, n: '' },
        { l: 'Installation signalétique parking',   t: '10:30', d: 60,  c: 'logistique', u: false, n: '' },
        { l: 'Accueil invités au parking',          t: '13:30', d: 90,  c: 'invites',    u: true,  n: 'Orienter les invités' },
        { l: 'Aide cérémonie (placement)',          t: '14:00', d: 30,  c: 'ceremonie',  u: false, n: '' },
        { l: 'Service vin d\'honneur',              t: '16:00', d: 60,  c: 'traiteur',   u: false, n: '' },
        { l: 'Aide service dîner',                  t: '19:30', d: 120, c: 'traiteur',   u: false, n: '' },
        { l: 'Distribution cadeaux invités',        t: '23:00', d: 45,  c: 'invites',    u: false, n: 'Coffrets cadeaux' }
    ];

    const startDate = new Date(_today);
    const endDate = new Date(eventConfig.date);
    let counterL = 1, counterJ = 1;
    const jourJ = eventConfig.date;
    const veilleJ = demoDate('2026-07-04');

    // ─── Travail déjà accompli : 15 jours en arrière, tout est "done" ───
    // Ça simule l'historique de tâches réalisées par Lila depuis le début
    // de la préparation, et fait monter de manière réaliste la productivité.
    const pastStart = new Date(startDate);
    pastStart.setDate(pastStart.getDate() - 15);
    const pastCursor = new Date(pastStart);
    while (pastCursor < startDate) {
        const isoP = pastCursor.toISOString().split('T')[0];
        const seedP = pastCursor.getDate() + pastCursor.getMonth() * 31;

        // 2 todos done par jour passé pour Lila
        for (let i = 0; i < 2; i++) {
            const item = POOL_LILA[(seedP + i * 3) % POOL_LILA.length];
            const [hh, mm] = item.t.split(':').map(Number);
            const newMin = hh * 60 + mm + i * 90;
            const newTime = String(Math.floor(newMin / 60)).padStart(2,'0') + ':' + String(newMin % 60).padStart(2,'0');
            todosLila.push({
                id: 'l' + (counterL++), label: item.l, date: isoP,
                time: newTime, duration: item.d, category: item.c,
                urgent: false, done: true, note: ''  // ← done: true (travail accompli)
            });
        }

        // 1 todo done sur 2 jours pour John
        if (pastCursor.getDate() % 2 === 0) {
            const item = POOL_JOHN[seedP % POOL_JOHN.length];
            todosJohn.push({
                id: 'j' + (counterJ++), label: item.l, date: isoP,
                time: item.t, duration: item.d, category: item.c,
                urgent: false, done: true, note: ''
            });
        }

        pastCursor.setDate(pastCursor.getDate() + 1);
    }

    // ─── Génération du futur : aujourd'hui → mariage ───
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        const iso = cursor.toISOString().split('T')[0];
        const daysToWedding = Math.round((endDate - cursor) / 86400000);

        if (iso === jourJ) {
            // ─── JOUR J : déroulé complet ───
            programmeLilaJourJ.forEach(item => {
                todosLila.push({
                    id: 'l' + (counterL++), label: item.l, date: iso,
                    time: item.t, duration: item.d, category: item.c,
                    urgent: item.u, done: false, note: item.n || ''
                });
            });
            programmeJohnJourJ.forEach(item => {
                todosJohn.push({
                    id: 'j' + (counterJ++), label: item.l, date: iso,
                    time: item.t, duration: item.d, category: item.c,
                    urgent: item.u, done: false, note: item.n || ''
                });
            });
        } else if (iso === veilleJ) {
            // ─── VEILLE (J-1) : préparatifs intensifs ───
            const veille = [
                { l: 'Installation décoration salle',      t: '08:00', d: 180, c: 'deco',       u: true  },
                { l: 'Mise en place plan de table',        t: '11:30', d: 90,  c: 'invites',    u: false },
                { l: 'Vérification matériel son',          t: '14:00', d: 60,  c: 'media',      u: false },
                { l: 'Briefing final équipe',              t: '15:30', d: 60,  c: 'ceremonie',  u: false },
                { l: 'Répétition placement cérémonie',     t: '17:00', d: 45,  c: 'ceremonie',  u: false }
            ];
            veille.forEach(item => {
                todosLila.push({
                    id: 'l' + (counterL++), label: item.l, date: iso,
                    time: item.t, duration: item.d, category: item.c,
                    urgent: item.u, done: false, note: ''
                });
            });
            todosJohn.push({
                id: 'j' + (counterJ++), label: 'Aide installation salle', date: iso,
                time: '09:00', duration: 240, category: 'logistique',
                urgent: false, done: false, note: 'Toute la matinée'
            });
            todosJohn.push({
                id: 'j' + (counterJ++), label: 'Récupérer fleurs supplémentaires', date: iso,
                time: '15:00', duration: 60, category: 'deco',
                urgent: false, done: false, note: ''
            });
        } else {
            // ─── Jours normaux (y compris aujourd'hui) : charge croissante vers le mariage ───
            let nbLila;
            if (daysToWedding > 30)      nbLila = 2;
            else if (daysToWedding > 15) nbLila = 3;
            else                         nbLila = 4;

            // Week-ends moins chargés (sauf semaine du mariage)
            const dow = cursor.getDay();
            if ((dow === 0 || dow === 6) && daysToWedding > 7) nbLila = Math.max(1, nbLila - 1);

            // Pioche pseudo-aléatoire stable basée sur la date
            const seed = cursor.getDate() + cursor.getMonth() * 31;
            for (let i = 0; i < nbLila; i++) {
                const item = POOL_LILA[(seed + i * 3) % POOL_LILA.length];
                // Décale légèrement l'heure pour éviter les doublons
                const [hh, mm] = item.t.split(':').map(Number);
                const newMin = hh * 60 + mm + i * 90;
                const newTime = String(Math.floor(newMin / 60)).padStart(2,'0') + ':' + String(newMin % 60).padStart(2,'0');
                todosLila.push({
                    id: 'l' + (counterL++), label: item.l, date: iso,
                    time: newTime, duration: item.d, category: item.c,
                    urgent: (daysToWedding < 7 && i === 0),
                    done: false, note: ''
                });
            }

            // John : 1 todo de temps en temps + plus dans la dernière semaine
            // (et toujours une le jour où l'on ouvre la démo, pour que sa vue mobile ne soit pas vide)
            if (daysToWedding < 7 || (cursor.getDate() % 3 === 0) || iso === _today) {
                const item = POOL_JOHN[seed % POOL_JOHN.length];
                todosJohn.push({
                    id: 'j' + (counterJ++), label: item.l, date: iso,
                    time: item.t, duration: item.d, category: item.c,
                    urgent: false, done: false, note: ''
                });
            }
        }

        cursor.setDate(cursor.getDate() + 1);
    }
}

// Génération automatique au chargement
generateTodos();


// Notifications (pile) — chacune avec son audience (qui peut la voir)
// Générées dynamiquement selon la phase du projet (jours restants jusqu'au mariage)
let notifications = [];

function generateInitialNotifications() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(eventConfig.date);
    target.setHours(0,0,0,0);
    const daysToWedding = Math.round((target - today) / 86400000);

    // Pool de notifs par phase, ordonné de la plus récente à la plus ancienne
    let phase = [];

    if (daysToWedding > 45) {
        // ─── Phase de démarrage (J-60 à J-45) ───
        phase = [
            { title: 'Photographe a confirmé sa disponibilité',      time: 'il y a 2 h',  level: 'info'    },
            { title: 'Maison Lefèvre — proposition de menu reçue',   time: 'hier',        level: 'info'    },
            { title: '3 nouvelles confirmations d\'invités',          time: 'hier',        level: 'info'    }
        ];
    } else if (daysToWedding > 30) {
        // ─── Préparatifs en cours (J-45 à J-30) ───
        phase = [
            { title: 'Devis fleuriste — réponse attendue',            time: 'il y a 3 h',  level: 'warning' },
            { title: 'Studio Lumière a renvoyé les épreuves',         time: 'hier',        level: 'info'    },
            { title: 'Plan de salle finalisé à 80%',                  time: 'il y a 2 j',  level: 'info'    }
        ];
    } else if (daysToWedding > 15) {
        // ─── Finalisation (J-30 à J-15) ───
        phase = [
            { title: 'Réponses VIPs — 4 en attente',                  time: 'il y a 1 h',  level: 'warning' },
            { title: 'Briefing équipe programmé samedi',              time: 'il y a 5 h',  level: 'info'    },
            { title: 'Atelier Moncœur a confirmé la commande',        time: 'hier',        level: 'info'    }
        ];
    } else if (daysToWedding > 7) {
        // ─── Dernière ligne droite (J-15 à J-7) ───
        phase = [
            { title: 'Plan de table — confirmation requise',          time: 'il y a 30 min', level: 'warning'  },
            { title: 'Météo : grand beau temps annoncé pour le jour J', time: 'il y a 2 h',  level: 'info'     },
            { title: 'Livre d\'or imprimé, à récupérer',              time: 'hier',        level: 'info'    }
        ];
    } else if (daysToWedding > 1) {
        // ─── Semaine du mariage (J-7 à J-2) ───
        phase = [
            { title: '⚠ Confirmation finale traiteur attendue',       time: 'il y a 25 min', level: 'critical' },
            { title: 'Répétition cérémonie demain à 16h',             time: 'il y a 2 h',    level: 'warning'  },
            { title: 'Tous les invités VIP ont confirmé',             time: 'il y a 4 h',    level: 'info'     }
        ];
    } else if (daysToWedding === 1) {
        // ─── Veille du mariage (J-1) ───
        phase = [
            { title: '⚠ Installation décoration en cours',            time: 'il y a 10 min', level: 'warning'  },
            { title: 'Tous les prestataires confirmés pour demain',   time: 'il y a 1 h',    level: 'info'     },
            { title: 'Briefing final équipe à 15h30',                 time: 'il y a 3 h',    level: 'info'     }
        ];
    } else if (daysToWedding === 0) {
        // ─── LE JOUR J ! ───
        phase = [
            { title: '🚨 Traiteur signalé en retard (40 min)',        time: 'il y a 3 min',  level: 'critical' },
            { title: 'Fleurs de Provence — arrivé sur site',          time: 'il y a 18 min', level: 'success'  },
            { title: 'John : « J\'ai besoin d\'aide pour le parking »', time: 'il y a 25 min', level: 'warning'  },
            { title: 'Studio Lumière a commencé les portraits',       time: 'il y a 45 min', level: 'info'     }
        ];
    } else {
        // ─── Après le mariage (J+1 et plus) ───
        phase = [
            { title: 'Photos du mariage disponibles',                 time: 'il y a 2 h',  level: 'info'    },
            { title: 'Merci à toute l\'équipe pour cette belle journée !', time: 'hier', level: 'success' }
        ];
    }

    // Convertir en notifications avec id et audience
    notifications = phase.map((n, idx) => ({
        id: 'n' + (idx + 1),
        title: n.title,
        time: n.time,
        level: n.level,
        read: false,
        audience: ['sarah', 'lila']  // Lila et Sarah voient l'historique (pas John)
    }));

    // Stocke aussi les notifs pour affichage progressif en toast au démarrage
    _initialNotifsForToast = phase.slice(0, 3);  // les 3 plus récentes seulement
}

// Stockage temporaire pour l'effet "toast au démarrage"
let _initialNotifsForToast = [];

// Joue les notifs initiales en toast (à appeler après le chargement complet)
function playInitialNotificationToasts() {
    if (!userSettings || !userSettings.notifToast) return;
    if (currentRole === 'john') return; // John n'a pas accès à cet historique

    _initialNotifsForToast.forEach((n, idx) => {
        setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast({
                    title: n.title,
                    level: n.level,
                    duration: 4000
                });
            }
        }, 600 + idx * 700); // 1er toast à 600ms, puis +700ms entre chaque
    });
}

// Génération au chargement
generateInitialNotifications();

// Configuration utilisateur (depuis Settings)
const userSettings = {
    notifToast:  true,
    notifUrgent: true,
    notifLate:   true,
    theme:       'rose'
};

// Catégories prédéfinies (modifiables par Sarah/Lila)
let taskCategories = [
    { id: 'logistique', label: 'Logistique',  color: '#1D6FA4', icon: '📦' },
    { id: 'traiteur',   label: 'Traiteur',    color: '#C62828', icon: '🍽️' },
    { id: 'deco',       label: 'Décoration',  color: '#a855f7', icon: '💐' },
    { id: 'invites',    label: 'Invités',     color: '#F0A500', icon: '💌' },
    { id: 'media',      label: 'Médias',      color: '#2E7D32', icon: '📸' },
    { id: 'ceremonie',  label: 'Cérémonie',   color: '#e9487e', icon: '💍' },
    { id: 'divers',     label: 'Divers',      color: '#7c828d', icon: '📋' }
];

function getCategory(id) {
    return taskCategories.find(c => c.id === id) || taskCategories[taskCategories.length - 1];
}

// Profils
const ROLE_CONFIG = {
    sarah: { name: 'Sarah M.', role: 'Wedding planner',             initials: 'SM', defaultView: 'dashboard' },
    lila:  { name: 'Lila R.',  role: 'Assistante de coordination',  initials: 'LR', defaultView: 'todo'      },
    john:  { name: 'John D.',  role: 'Bénévole',                    initials: 'JD', defaultView: 'mobile'    }
};

// Permissions par action
const PERMISSIONS = {
    'gantt.add':        ['sarah'],
    'gantt.addGroup':   ['sarah'],
    'gantt.view':       ['sarah'],
    'providers.add':    ['sarah'],
    'providers.delete': ['sarah'],
    'settings.view':    ['sarah'],
    'taskboard.addGroup': ['sarah', 'lila'],
    'taskboard.addTask':  ['sarah', 'lila'],
    'todo.add':         ['sarah', 'lila'],
    'todo.delete':      ['sarah', 'lila'],
    'category.add':     ['sarah', 'lila']
};

function canDo(action) {
    const allowed = PERMISSIONS[action];
    if (!allowed) return true;
    return allowed.includes(currentRole);
}

// Couleurs / labels statuts (Gantt)
const STATUS_COLORS = {
    done: '#1D6FA4', active: '#F0A500', todo: '#C8D0D8',
    critical: '#C62828', warn: '#F57C00'
};
const STATUS_LABELS = {
    done: 'Terminé', active: 'En cours', todo: 'À faire',
    critical: 'Critique', warn: 'Urgent'
};

/* ═══════════════════════════════════════════════════════
   ÉTAT GLOBAL
═══════════════════════════════════════════════════════ */

let currentRole = 'sarah';
let currentView = 'dashboard';
let isOnline    = true;
let pendingSync = [];

/* ═══════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════ */

function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function fmtDate(d) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function fmtDateLong(d) {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Récupère toutes les tâches Gantt dont les dates englobent la journée donnée
function getTasksForDate(isoDate) {
    const results = [];
    projects.forEach(p => {
        p.tasks.forEach(t => {
            if (isoDate >= t.start && isoDate <= t.end) {
                results.push({ ...t, projectLabel: p.label, projectColor: p.color });
            }
        });
    });
    return results;
}

/* ═══════════════════════════════════════════════════════
   NAVIGATION + RÔLES
═══════════════════════════════════════════════════════ */

// Table centrale des rôles autorisés par vue (source de vérité, ne peut pas être contournée)
const VIEW_ROLES = {
    dashboard: ['sarah'],
    taskboard: ['sarah', 'lila'],
    gantt:     ['sarah'],
    providers: ['sarah', 'lila'],
    todo:      ['lila'],            // Lila seule : vue à onglets (mes tâches + celles de John)
    mobile:    ['john'],            // John seul : sa vue mobile
    dayview:   ['sarah', 'lila'],   // John n'a PAS accès à la vue journée
    settings:  ['sarah']
};

function canAccessView(name) {
    const allowed = VIEW_ROLES[name];
    if (!allowed) return true;
    return allowed.includes(currentRole);
}

function showView(name) {
    // Garde-fou : si le rôle courant n'a pas le droit, on redirige vers sa vue par défaut
    if (!canAccessView(name)) {
        const fallback = ROLE_CONFIG[currentRole]?.defaultView || 'dashboard';
        if (fallback !== name) return showView(fallback);
        return;
    }

    currentView = name;
    document.querySelectorAll('.view-wrapper').forEach(v => v.classList.add('hidden'));
    const el = document.getElementById('view-' + name);
    if (el) el.classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(a => {
        a.classList.toggle('active', a.dataset.view === name);
    });

    // Déclencher les renders spécifiques
    if (name === 'taskboard') renderBoard?.();
    if (name === 'gantt')     renderGantt?.();
    if (name === 'providers') renderProviders?.();
    if (name === 'todo')      renderTodos?.('lila');
    if (name === 'mobile')    { (typeof renderMobileView === 'function') ? renderMobileView() : renderTodos?.('john'); }
    if (name === 'dayview')   renderDayView?.();
    if (name === 'dashboard') refreshDashboard?.();
}

function applyRole(role) {
    currentRole = role;

    // Switcher
    document.querySelectorAll('.role-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.role === role);
    });

    // Avatar
    const cfg = ROLE_CONFIG[role];
    document.getElementById('avatar-initials').textContent = cfg.initials;
    document.getElementById('avatar-name').textContent     = cfg.name;
    document.getElementById('avatar-role').textContent     = cfg.role;

    // Filtrage du menu selon data-roles
    document.querySelectorAll('[data-roles]').forEach(el => {
        const allowed = el.dataset.roles.split(',');
        const visible = allowed.includes(role);
        if (el.tagName === 'A') {
            el.parentElement.style.display = visible ? '' : 'none';
        } else {
            el.style.display = visible ? '' : 'none';
        }
    });

    // Filtrage des boutons avec data-requires-role
    document.querySelectorAll('[data-requires-role]').forEach(el => {
        const allowed = el.dataset.requiresRole.split(',');
        el.classList.toggle('allowed', allowed.includes(role));
        if (allowed.includes(role)) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    // Basculer sur la vue par défaut du rôle
    showView(cfg.defaultView);

    // Rafraîchir notifications et badge car l'audience change
    renderNotifications();
    updateNotifBadge();
}

/* ═══════════════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════════════ */

function addNotification({ title, level = 'info', silent = false, audience = null }) {
    // audience = null : pour tout le monde ; sinon tableau de rôles
    // Si le rôle courant n'est pas dans l'audience, on n'affiche ni toast ni notif
    if (audience && !audience.includes(currentRole)) return;

    const notif = {
        id: uid('n'),
        title,
        time: 'à l\'instant',
        level,
        read: false,
        audience
    };
    notifications.unshift(notif);
    renderNotifications();
    updateNotifBadge();

    // Toast (sauf si silencieux)
    if (!silent && userSettings.notifToast) {
        showToast({ title, level });
    }
}

function renderNotifications() {
    const list = document.getElementById('notif-panel-list');
    if (!list) return;
    list.innerHTML = '';

    // Filtrer par audience : une notification sans audience est visible par tous ;
    // sinon seulement pour les rôles listés
    const visible = notifications.filter(n => !n.audience || n.audience.includes(currentRole));

    if (visible.length === 0) {
        list.innerHTML = '<li class="notif-panel-empty">Aucune notification</li>';
        return;
    }

    visible.forEach(n => {
        const li = document.createElement('li');
        li.className = 'notif-panel-item' + (n.read ? '' : ' unread');
        li.innerHTML = `
            <span class="notif-dot ${n.level}"></span>
            <div class="notif-content">
                <span class="notif-title">${n.title}</span>
                <span class="notif-time">${n.time}</span>
            </div>
        `;
        li.addEventListener('click', () => {
            n.read = true;
            renderNotifications();
            updateNotifBadge();
        });
        list.appendChild(li);
    });
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    // Badge ne compte que les notifs visibles pour le rôle courant
    const unread = notifications
        .filter(n => !n.audience || n.audience.includes(currentRole))
        .filter(n => !n.read).length;
    if (unread === 0) {
        badge.classList.add('hidden');
    } else {
        badge.classList.remove('hidden');
        badge.textContent = unread > 9 ? '9+' : String(unread);
    }
}

/* ═══════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════ */

function showToast({ title, message, level = 'info', undo = null, duration = 4500 }) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + level;

    toast.innerHTML = `
        <div class="toast-content">
            <strong>${title}</strong>
            ${message ? `<span>${message}</span>` : ''}
        </div>
        ${undo ? '<button class="toast-undo">Annuler</button>' : ''}
        <button class="toast-close">✕</button>
    `;

    const close = () => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 200);
    };

    toast.querySelector('.toast-close').addEventListener('click', close);
    if (undo) {
        toast.querySelector('.toast-undo').addEventListener('click', () => {
            undo();
            close();
        });
    }

    container.appendChild(toast);
    setTimeout(close, duration);
}

/* ═══════════════════════════════════════════════════════
   SYNC / OFFLINE
═══════════════════════════════════════════════════════ */

function updateSyncUI() {
    const indicator = document.getElementById('sync-indicator');
    indicator.classList.toggle('offline', !isOnline);
    indicator.querySelector('.sync-label').textContent = isOnline
        ? (pendingSync.length > 0 ? `Sync ${pendingSync.length}…` : 'En ligne')
        : 'Hors-ligne';
    indicator.classList.toggle('syncing', isOnline && pendingSync.length > 0);

    const mobileBanner = document.getElementById('mobile-offline');
    if (mobileBanner) mobileBanner.classList.toggle('visible', !isOnline);
}

function toggleSync() {
    isOnline = !isOnline;
    updateSyncUI();

    if (!isOnline) {
        showToast({ title: 'Mode hors-ligne', message: 'Les validations seront synchronisées à la reconnexion', level: 'warning' });
    } else if (pendingSync.length > 0) {
        setTimeout(() => {
            const n = pendingSync.length;
            pendingSync = [];
            updateSyncUI();
            showToast({ title: `${n} tâche${n > 1 ? 's' : ''} synchronisée${n > 1 ? 's' : ''}`, level: 'success' });
            if (currentView === 'todo')    renderTodos?.('lila');
            if (currentView === 'mobile')  renderTodos?.('john');
            if (currentView === 'dayview') renderDayView?.();
        }, 1200);
    } else {
        showToast({ title: 'Connexion rétablie', level: 'success', duration: 2500 });
    }
}

/* ═══════════════════════════════════════════════════════
   MINI CALENDRIER SIDEBAR
═══════════════════════════════════════════════════════ */

// Mini-calendrier : s'ouvre par défaut sur le mois courant
const _now = new Date();
let miniCalYear  = _now.getFullYear();
let miniCalMonth = _now.getMonth();

function renderMiniCal() {
    const container = document.getElementById('minical-days');
    const label     = document.getElementById('minical-month');
    if (!container) return;

    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    label.textContent = `${months[miniCalMonth]} ${miniCalYear}`;
    container.innerHTML = '';

    // Jour de la semaine du 1er (lundi-first)
    let firstDow = new Date(miniCalYear, miniCalMonth, 1).getDay();
    firstDow = (firstDow + 6) % 7; // lundi = 0
    const daysInMonth = new Date(miniCalYear, miniCalMonth + 1, 0).getDate();
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    const weddingIso = eventConfig.date;

    // Jours du mois précédent
    const prevDays = new Date(miniCalYear, miniCalMonth, 0).getDate();
    for (let i = 0; i < firstDow; i++) {
        const btn = document.createElement('button');
        btn.className = 'minical-day other-month';
        btn.textContent = prevDays - firstDow + 1 + i;
        container.appendChild(btn);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const btn = document.createElement('button');
        btn.className = 'minical-day';
        btn.textContent = d;
        const iso = `${miniCalYear}-${String(miniCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

        if (iso === todayIso) btn.classList.add('today');
        if (iso === weddingIso) btn.classList.add('wedding-day');

        // Marqueur uniquement sur les todos opérationnelles (pas le Gantt)
        const hasLilaTodos = todosLila.some(t => (t.date || '') === iso);
        const hasJohnTodos = todosJohn.some(t => (t.date || '') === iso);
        if (hasLilaTodos || hasJohnTodos) btn.classList.add('has-tasks');

        btn.addEventListener('click', (e) => showMiniCalPopup(iso, e.currentTarget));
        container.appendChild(btn);
    }
}

function showMiniCalPopup(iso, anchorEl) {
    const popup = document.getElementById('minical-popup');
    const title = document.getElementById('minical-popup-title');
    const list  = document.getElementById('minical-popup-list');

    title.textContent = fmtDateLong(iso);

    // Todos du jour (Lila + John) filtrés par date
    // Note : on n'affiche PAS les tâches Gantt ici, le mini-calendrier
    // ne montre que les actions opérationnelles (todos avec heure précise)
    const lilaForDay = todosLila.filter(t => (t.date || '') === iso);
    const johnForDay = todosJohn.filter(t => (t.date || '') === iso);

    list.innerHTML = '';

    if (lilaForDay.length === 0 && johnForDay.length === 0) {
        list.innerHTML = '<li class="minical-popup-empty">Aucune tâche prévue ce jour</li>';
    } else {
        lilaForDay.forEach(t => {
            const cat = getCategory(t.category);
            const li = document.createElement('li');
            li.className = 'minical-popup-item';
            li.style.borderLeftColor = cat.color;
            li.innerHTML = `<span class="mpi-time">${t.time}</span>${t.label}${t.urgent ? ' ⚠' : ''}<br><span style="opacity:.55; font-size:10px">${cat.icon} ${cat.label} · Lila</span>`;
            list.appendChild(li);
        });
        johnForDay.forEach(t => {
            const cat = getCategory(t.category);
            const li = document.createElement('li');
            li.className = 'minical-popup-item';
            li.style.borderLeftColor = cat.color;
            li.innerHTML = `<span class="mpi-time">${t.time}</span>${t.label}${t.urgent ? ' ⚠' : ''}<br><span style="opacity:.55; font-size:10px">${cat.icon} ${cat.label} · John</span>`;
            list.appendChild(li);
        });
    }

    // Footer avec bouton "Voir la journée" — HORS de la liste pour rester visible
    // même quand il y a beaucoup de tâches (jour J par ex.)
    let footer = document.getElementById('minical-popup-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.id = 'minical-popup-footer';
        footer.className = 'minical-popup-footer';
        popup.appendChild(footer);
    }
    footer.innerHTML = `<button class="btn-primary" id="minical-open-dayview" style="width:100%; padding:8px 12px; font-size:12px">Voir la journée complète</button>`;
    document.getElementById('minical-open-dayview').addEventListener('click', () => {
        closeMiniCalPopup();
        if (typeof openDayView === 'function') {
            openDayView(iso);
        }
    });

    // Positionnement intelligent : ne sort jamais de l'écran
    popup.classList.add('open');                    // d'abord visible pour mesurer
    const rect     = anchorEl.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const margin   = 12;

    // Horizontal : par défaut à droite, sinon à gauche si ça déborde
    let left = rect.right + margin;
    if (left + popupRect.width + 8 > window.innerWidth) {
        left = rect.left - popupRect.width - margin;
    }
    if (left < 8) left = 8;

    // Vertical : aligner sur le haut de la case, mais décaler vers le haut si ça déborde
    let top = rect.top;
    if (top + popupRect.height + 8 > window.innerHeight) {
        top = window.innerHeight - popupRect.height - 8;
    }
    if (top < 8) top = 8;

    popup.style.left = left + 'px';
    popup.style.top  = top + 'px';
}

function closeMiniCalPopup() {
    document.getElementById('minical-popup').classList.remove('open');
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — tout dynamique
═══════════════════════════════════════════════════════ */

// Compte à rebours J-xx
function updateCountdown() {
    const el = document.getElementById('banner-count');
    if (!el) return;
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(eventConfig.date);
    target.setHours(0,0,0,0);
    const days = Math.round((target - today) / 86400000);
    el.textContent = days > 0 ? `J–${days}` : (days === 0 ? 'Jour J' : `J+${Math.abs(days)}`);

    // Met aussi à jour le libellé de la bannière
    const banner = document.querySelector('.countdown-banner .banner-event');
    if (banner) {
        const [y, m, d] = eventConfig.date.split('-');
        const mois = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
        banner.innerHTML = `<strong>${eventConfig.name}</strong>${parseInt(d)} ${mois[parseInt(m)-1]} ${y} · ${eventConfig.place}`;
    }
}

// Collecte toutes les tâches (Gantt + Taskboard + Todos Lila + Todos John)
function collectAllTasks() {
    const tasks = [];
    projects.forEach(p => p.tasks.forEach(t => tasks.push({
        done: t.status === 'done',
        active: t.status === 'active',
        urgent: t.urgent || t.status === 'critical' || t.status === 'warn',
        source: 'gantt'
    })));
    if (typeof tbColumns !== 'undefined') {
        tbColumns.forEach(col => col.tasks.forEach(t => tasks.push({
            done: col.id === 'done',
            active: col.id === 'inprogress',
            urgent: t.priority === 'urgent',
            source: 'taskboard'
        })));
    }
    todosLila.forEach(t => tasks.push({ done: t.done, active: !t.done, urgent: t.urgent, source: 'todoLila' }));
    todosJohn.forEach(t => tasks.push({ done: t.done, active: !t.done, urgent: t.urgent, source: 'todoJohn' }));
    return tasks;
}

// Récupère qui est "actif aujourd'hui" (personnes avec tâche non-done)
function getActiveMembers() {
    const activeNames = new Set();
    projects.forEach(p => p.tasks.forEach(t => {
        if (t.status !== 'done' && t.owner) activeNames.add(t.owner);
    }));
    // Lila active si elle a au moins une todo non finie
    if (todosLila.some(t => !t.done)) activeNames.add('Lila R.');
    // John actif si au moins une todo non finie
    if (todosJohn.some(t => !t.done)) activeNames.add('John D.');
    return activeNames;
}

// Met à jour les 4 KPI
function updateKpis() {
    const allTasks = collectAllTasks();
    const total    = allTasks.length;
    const done     = allTasks.filter(t => t.done).length;
    const active   = allTasks.filter(t => t.active).length;
    const prod     = total > 0 ? Math.round((done / total) * 100) : 0;

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    // Nombre de projets (groupes Gantt) + sous-titre = groupes 100% terminés
    const projTotal = projects.length;
    const projDone  = projects.filter(p => p.tasks.length > 0 && p.tasks.every(t => t.status === 'done')).length;
    setText('kpi-projects', projTotal);
    setText('kpi-projects-sub', `${projDone} terminé${projDone > 1 ? 's' : ''}`);

    // Tâches
    setText('kpi-tasks', total);
    setText('kpi-tasks-sub', `${done} terminée${done > 1 ? 's' : ''}`);

    // Membres : 3 rôles connus (Sarah, Lila, John) + owners du Gantt uniques
    const owners = new Set();
    projects.forEach(p => p.tasks.forEach(t => { if (t.owner) owners.add(t.owner); }));
    owners.add('Sarah M.'); owners.add('Lila R.'); owners.add('John D.');
    const activeMembers = getActiveMembers();
    setText('kpi-members', owners.size);
    setText('kpi-members-sub', `${activeMembers.size} actif${activeMembers.size > 1 ? 's' : ''} aujourd'hui`);

    // Productivité (% de tâches terminées)
    setText('kpi-productivity', prod + '%');
    const subProd = document.getElementById('kpi-productivity-sub');
    if (subProd) {
        if (prod >= 75)      subProd.textContent = '🚀 Excellente progression';
        else if (prod >= 50) subProd.textContent = '✓ Bonne dynamique';
        else if (prod >= 25) subProd.textContent = '⏳ En cours d\'avancement';
        else                 subProd.textContent = '⚠ À accélérer';
    }
}

// Donut d'avancement dynamique
function updateDonut() {
    const allTasks = collectAllTasks();
    const total    = allTasks.length || 1;
    const done     = allTasks.filter(t => t.done).length;
    const active   = allTasks.filter(t => t.active && !t.done).length;
    const todo     = total - done - active;

    const pctDone   = Math.round(done / total * 100);
    const pctActive = Math.round(active / total * 100);
    const pctTodo   = 100 - pctDone - pctActive;

    // Le cercle SVG a circonférence = 2π × 62 ≈ 389.6
    const CIRC = 389.6;
    const doneLen   = CIRC * pctDone   / 100;
    const activeLen = CIRC * pctActive / 100;

    const donutDone   = document.getElementById('donut-done');
    const donutActive = document.getElementById('donut-active');
    const donutPct    = document.getElementById('donut-pct');

    if (donutDone) {
        donutDone.setAttribute('stroke-dasharray', `${doneLen} ${CIRC}`);
        donutDone.setAttribute('stroke-dashoffset', '0');
    }
    if (donutActive) {
        donutActive.setAttribute('stroke-dasharray', `${activeLen} ${CIRC}`);
        donutActive.setAttribute('stroke-dashoffset', `-${doneLen}`);
    }
    if (donutPct) donutPct.textContent = pctDone + '%';

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('legend-done-pct',   pctDone   + '%');
    setText('legend-active-pct', pctActive + '%');
    setText('legend-todo-pct',   pctTodo   + '%');
}

// Alertes & retards dynamiques
function renderDashboardAlerts() {
    const list = document.getElementById('dashboard-alerts');
    if (!list) return;

    const alerts = [];
    projects.forEach(p => {
        p.tasks.forEach(t => {
            if (t.status === 'critical') {
                alerts.push({ level: 'critical', title: t.label, sub: t.note || 'Tâche critique', badgeLabel: 'Critique',
                    action: () => { showView('gantt'); setTimeout(() => openDetail?.(t.id), 100); } });
            } else if (t.status === 'warn') {
                alerts.push({ level: 'warning', title: t.label, sub: t.note || 'Tâche urgente', badgeLabel: 'Urgent',
                    action: () => { showView('gantt'); setTimeout(() => openDetail?.(t.id), 100); } });
            }
        });
    });
    providers.forEach(p => {
        if (p.status === 'late') {
            alerts.push({ level: 'critical', title: `${p.name} en retard`, sub: `${p.role} · prévu ${p.eta}`, badgeLabel: 'Retard',
                action: () => showView('providers') });
        }
    });
    todosLila.forEach(t => {
        if (t.urgent && !t.done) {
            alerts.push({ level: 'warning', title: t.label, sub: `Lila · ${t.time}`, badgeLabel: 'Urgent',
                action: () => {
                    // Va sur la vue journée à la date de la todo, en vue "Lila"
                    if (typeof openDayView === 'function') openDayView(t.date || _today, 'lila');
                    else showView('dayview');
                } });
        }
    });
    todosJohn.forEach(t => {
        if (t.urgent && !t.done) {
            alerts.push({ level: 'warning', title: t.label, sub: `John · ${t.time}`, badgeLabel: 'Urgent',
                action: () => {
                    // Sarah n'a pas accès à la vue mobile John, donc on affiche la todo
                    // de John dans la vue journée (à laquelle Sarah a accès)
                    if (typeof openDayView === 'function') openDayView(t.date || _today, 'john');
                    else showView('dayview');
                } });
        }
    });

    list.innerHTML = '';
    if (alerts.length === 0) {
        list.innerHTML = '<li style="opacity:.5; padding:10px 0; font-size:12px">Aucune alerte 🎉</li>';
        return;
    }
    alerts.slice(0, 6).forEach(a => {
        const li = document.createElement('li');
        li.className = 'alert-item alert-item-clickable';
        li.innerHTML = `
            <div class="alert-dot ${a.level === 'critical' ? 'critical' : 'warning'}"></div>
            <div class="alert-body">
                <strong>${a.title}</strong>
                <span>${a.sub}</span>
            </div>
            <span class="alert-badge ${a.level === 'critical' ? 'badge-crit' : 'badge-warn'}">${a.badgeLabel}</span>
            <span class="alert-arrow">›</span>
        `;
        if (a.action) {
            li.addEventListener('click', a.action);
        }
        list.appendChild(li);
    });
}

// Fonction maîtresse : met tout à jour d'un coup
function refreshDashboard() {
    updateCountdown();
    updateKpis();
    updateDonut();
    renderDashboardAlerts();
}

// Aliases pour compat
const updateKpiTasks = refreshDashboard;

/* ═══════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════ */

function setupSettings() {
    const btnSave = document.getElementById('settings-save');
    if (!btnSave) return;

    // Pré-remplit le formulaire avec la configuration courante
    document.getElementById('set-event-name').value  = eventConfig.name;
    document.getElementById('set-event-date').value  = eventConfig.date;
    document.getElementById('set-event-place').value = eventConfig.place;

    btnSave.addEventListener('click', () => {
        eventConfig.name  = document.getElementById('set-event-name').value.trim() || eventConfig.name;
        eventConfig.date  = document.getElementById('set-event-date').value || eventConfig.date;
        eventConfig.place = document.getElementById('set-event-place').value.trim() || eventConfig.place;

        userSettings.notifToast  = document.getElementById('set-notif-toast').checked;
        userSettings.notifUrgent = document.getElementById('set-notif-urgent').checked;
        userSettings.notifLate   = document.getElementById('set-notif-late').checked;
        userSettings.theme       = document.getElementById('set-theme').value;

        // Appliquer sur le dashboard
        const banner = document.querySelector('.countdown-banner .banner-event');
        if (banner) {
            const [y, m, d] = eventConfig.date.split('-');
            const mois = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
            banner.innerHTML = `<strong>${eventConfig.name}</strong>${parseInt(d)} ${mois[parseInt(m)-1]} ${y} · ${eventConfig.place}`;
        }

        updateCountdown();
        renderMiniCal();
        applyTheme(userSettings.theme);
        showToast({ title: 'Configuration enregistrée', level: 'success', duration: 2500 });
    });
}

function applyTheme(name) {
    const themes = {
        rose:   { primary: '#e9487e', light: '#FCE4EC', border: '#F8BBD0', text: '#880E4F', bg: '#FFF8F9' },
        violet: { primary: '#7c3aed', light: '#EDE9FE', border: '#C4B5FD', text: '#4C1D95', bg: '#FAF8FF' },
        bleu:   { primary: '#0284c7', light: '#E0F2FE', border: '#BAE6FD', text: '#0C4A6E', bg: '#F8FBFF' }
    };
    const t = themes[name] || themes.rose;
    const root = document.documentElement;
    root.style.setProperty('--primary-color', t.primary);
    root.style.setProperty('--pink', t.primary);
    root.style.setProperty('--pink-light', t.light);
    root.style.setProperty('--secondary-color', t.light);
    root.style.setProperty('--pink-border', t.border);
    root.style.setProperty('--border', t.border);
    root.style.setProperty('--text', t.text);
    root.style.setProperty('--text-main', t.text);
    root.style.setProperty('--bg', t.bg);
    root.style.setProperty('--bg-app', t.bg);
}