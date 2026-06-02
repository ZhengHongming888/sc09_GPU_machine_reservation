// Storage keys for localStorage
const STORAGE_KEY = 'sc09_reservations';
const AUDIT_LOG_KEY = 'sc09_audit_log';
const STORAGE_MODE_KEY = 'sc09_storage_mode';

// Storage modes
const STORAGE_MODES = {
    LOCAL: 'local',
    FIREBASE: 'firebase'
};

// Global state
let reservationsData = null;
let auditLog = [];
let currentStorageMode = STORAGE_MODES.LOCAL;
let firebaseInitialized = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

// Initialize application
async function initializeApp() {
    // Try to initialize Firebase first
    if (typeof initializeFirebase === 'function') {
        firebaseInitialized = await initializeFirebase();
    }

    // If Firebase is available, check team's preferred mode
    if (firebaseInitialized && typeof getTeamStorageMode === 'function') {
        try {
            const teamMode = await getTeamStorageMode();
            if (teamMode) {
                console.log('Team storage mode from Firebase:', teamMode);
                currentStorageMode = teamMode;
                // Save to localStorage as cache
                localStorage.setItem(STORAGE_MODE_KEY, teamMode);
            } else {
                // No team mode set yet, check localStorage
                const savedMode = localStorage.getItem(STORAGE_MODE_KEY);
                if (savedMode && STORAGE_MODES[savedMode.toUpperCase()]) {
                    currentStorageMode = savedMode;
                }
            }
        } catch (error) {
            console.error('Error loading team mode, using local preference:', error);
            // Fallback to localStorage preference
            const savedMode = localStorage.getItem(STORAGE_MODE_KEY);
            if (savedMode && STORAGE_MODES[savedMode.toUpperCase()]) {
                currentStorageMode = savedMode;
            }
        }
    } else {
        // Firebase not available, use localStorage preference
        const savedMode = localStorage.getItem(STORAGE_MODE_KEY);
        if (savedMode && STORAGE_MODES[savedMode.toUpperCase()]) {
            currentStorageMode = savedMode;
        }
    }

    // Validate current mode
    if (currentStorageMode === STORAGE_MODES.FIREBASE && !firebaseInitialized) {
        console.warn('Firebase not available, falling back to localStorage');
        currentStorageMode = STORAGE_MODES.LOCAL;
    }

    await loadReservations();
    await loadAuditLogData();
    updateModeUI();
    renderGrid();
    updateLastUpdated();

    // Subscribe to real-time updates if in Firebase mode
    if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
        subscribeToFirebaseUpdates(async () => {
            await loadReservations();
            renderGrid();
            updateLastUpdated();
        });
    }
}

// Load reservations based on current mode
async function loadReservations() {
    if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
        try {
            reservationsData = await loadFromFirebase();
            console.log('Loaded reservations from Firebase');
        } catch (error) {
            console.error('Failed to load from Firebase, falling back to localStorage:', error);
            currentStorageMode = STORAGE_MODES.LOCAL;
            await loadReservationsFromLocalStorage();
        }
    } else {
        await loadReservationsFromLocalStorage();
    }
}

// Load reservations from localStorage or JSON file
async function loadReservationsFromLocalStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        reservationsData = JSON.parse(stored);
        console.log('Loaded reservations from localStorage');
    } else {
        // First time: load from reservations.json
        try {
            const response = await fetch('reservations.json');
            reservationsData = await response.json();
            saveToStorage();
            console.log('Loaded reservations from reservations.json');
        } catch (error) {
            console.error('Error loading reservations:', error);
            alert('Failed to load reservations data. Please refresh the page.');
        }
    }
}

// Save current state based on mode
async function saveToStorage() {
    reservationsData.last_updated = new Date().toISOString();

    if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
        // Firebase saves happen in individual operations, just update timestamp
        console.log('Data saved via Firebase');
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reservationsData));
        console.log('Saved to localStorage');
    }

    updateLastUpdated();
}

// Load audit log data
async function loadAuditLogData() {
    if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
        try {
            auditLog = await loadAuditLogFromFirebase();
            console.log('Loaded audit log from Firebase:', auditLog.length, 'entries');
        } catch (error) {
            console.error('Failed to load audit log from Firebase:', error);
            loadAuditLogFromLocalStorage();
        }
    } else {
        loadAuditLogFromLocalStorage();
    }
}

// Load audit log from localStorage
function loadAuditLogFromLocalStorage() {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    if (stored) {
        auditLog = JSON.parse(stored);
        console.log('Loaded audit log from localStorage:', auditLog.length, 'entries');
    } else {
        auditLog = [];
    }
}

// Save audit log to localStorage
function saveAuditLog() {
    if (currentStorageMode === STORAGE_MODES.LOCAL) {
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(auditLog));
    }
}

// Add entry to audit log
async function addAuditEntry(action, machine, card, originalOwner, actionBy) {
    const entry = {
        timestamp: new Date().toISOString(),
        action: action,
        machine: machine,
        card: card,
        original_owner: originalOwner,
        action_by: actionBy
    };

    if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
        try {
            await addAuditEntryToFirebase(action, machine, card, originalOwner, actionBy);
        } catch (error) {
            console.error('Failed to save audit entry to Firebase:', error);
        }
    }

    auditLog.push(entry);
    saveAuditLog();
    console.log('Audit log entry added:', entry);
}

// Render the entire grid
function renderGrid() {
    const gridContainer = document.getElementById('reservationGrid');
    gridContainer.innerHTML = '';

    // Group machines by category
    const categories = {};
    reservationsData.machines.forEach(machine => {
        if (!categories[machine.category]) {
            categories[machine.category] = [];
        }
        categories[machine.category].push(machine);
    });

    // Render each category
    Object.keys(categories).forEach(categoryName => {
        const categorySection = createCategorySection(categoryName, categories[categoryName]);
        gridContainer.appendChild(categorySection);
    });
}

// Create a category section
function createCategorySection(categoryName, machines) {
    const section = document.createElement('div');
    section.className = 'category-section';

    const badgeClass = categoryName.toLowerCase().includes('intel') ? 'intel' : 'nvidia';

    const title = document.createElement('div');
    title.className = 'category-title';
    title.innerHTML = `
        <span>${categoryName}</span>
        <span class="category-badge ${badgeClass}">${machines.length} machines</span>
    `;
    section.appendChild(title);

    const machineList = document.createElement('div');
    machineList.className = 'machine-list';

    machines.forEach(machine => {
        const machineRow = createMachineRow(machine);
        machineList.appendChild(machineRow);
    });

    section.appendChild(machineList);
    return section;
}

// Create a machine row with cards
function createMachineRow(machine) {
    const row = document.createElement('div');
    row.className = 'machine-row';

    // Machine name
    const nameCell = document.createElement('div');
    nameCell.className = 'machine-name';
    nameCell.textContent = machine.name;
    row.appendChild(nameCell);

    // Cards
    machine.cards.forEach(card => {
        const cardCell = createCardCell(machine, card);
        row.appendChild(cardCell);
    });

    return row;
}

// Create a card cell
function createCardCell(machine, card) {
    const cell = document.createElement('div');
    cell.className = `card-cell ${card.reserved_by ? 'reserved' : 'available'}`;
    cell.dataset.machineName = machine.name;
    cell.dataset.cardId = card.id;

    const label = document.createElement('div');
    label.className = 'card-label';
    label.textContent = card.name;

    const owner = document.createElement('div');
    owner.className = 'card-owner';
    owner.textContent = card.reserved_by || 'Available';

    cell.appendChild(label);
    cell.appendChild(owner);

    // Add click event
    cell.addEventListener('click', () => handleCardClick(machine, card));

    return cell;
}

// Handle card click
function handleCardClick(machine, card) {
    if (card.reserved_by) {
        handleReservedCardClick(machine, card);
    } else {
        handleAvailableCardClick(machine, card);
    }
}

// Handle click on available card
async function handleAvailableCardClick(machine, card) {
    const surname = prompt('Enter your surname to reserve this card:');

    if (surname && surname.trim()) {
        // Update the data
        const machineData = reservationsData.machines.find(m => m.name === machine.name);
        const cardData = machineData.cards.find(c => c.id === card.id);
        cardData.reserved_by = surname.trim();

        // Save based on mode
        if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
            try {
                await saveReservationToFirebase(machine.name, card.id, surname.trim());
            } catch (error) {
                alert('Failed to save reservation to Firebase: ' + error.message);
                return;
            }
        }

        // Add audit log entry
        await addAuditEntry('reserve', machine.name, card.name, null, surname.trim());

        // Save and re-render
        await saveToStorage();
        renderGrid();

        showNotification(`Reserved ${card.name} on ${machine.name} for ${surname.trim()}`);
    }
}

// Handle click on reserved card
async function handleReservedCardClick(machine, card) {
    const originalOwner = card.reserved_by;

    const releasedBy = prompt(
        `${card.name} on ${machine.name} is reserved by: ${originalOwner}\n\n` +
        `To release this reservation, please enter YOUR surname:`
    );

    if (releasedBy && releasedBy.trim()) {
        // Update the data
        const machineData = reservationsData.machines.find(m => m.name === machine.name);
        const cardData = machineData.cards.find(c => c.id === card.id);
        cardData.reserved_by = null;

        // Save based on mode
        if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
            try {
                await releaseReservationInFirebase(machine.name, card.id);
            } catch (error) {
                alert('Failed to release reservation in Firebase: ' + error.message);
                return;
            }
        }

        // Add audit log entry
        await addAuditEntry('release', machine.name, card.name, originalOwner, releasedBy.trim());

        // Save and re-render
        await saveToStorage();
        renderGrid();

        if (originalOwner.toLowerCase() === releasedBy.trim().toLowerCase()) {
            showNotification(`${releasedBy.trim()} released their own reservation: ${card.name} on ${machine.name}`);
        } else {
            showNotification(
                `⚠️ ${releasedBy.trim()} released ${originalOwner}'s reservation: ${card.name} on ${machine.name}`
            );
        }
    }
}

// Update last updated timestamp
function updateLastUpdated() {
    if (reservationsData && reservationsData.last_updated) {
        const date = new Date(reservationsData.last_updated);
        document.getElementById('lastUpdated').textContent = date.toLocaleString();
    }
}

// Show notification
function showNotification(message) {
    console.log('Notification:', message);
}

// Update mode UI
function updateModeUI() {
    const modeToggleBtn = document.getElementById('modeToggleBtn');
    const modeIcon = document.getElementById('modeIcon');
    const modeText = document.getElementById('modeText');

    if (currentStorageMode === STORAGE_MODES.FIREBASE) {
        modeToggleBtn.classList.add('firebase-mode');
        modeIcon.textContent = '☁️';
        modeText.textContent = 'Firebase';
    } else {
        modeToggleBtn.classList.remove('firebase-mode');
        modeIcon.textContent = '💾';
        modeText.textContent = 'Local';
    }
}

// Toggle storage mode
async function toggleStorageMode() {
    if (currentStorageMode === STORAGE_MODES.LOCAL) {
        // Switch to Firebase
        if (!firebaseInitialized) {
            alert('Firebase is not configured. Please add your Firebase credentials in firebase-config.js');
            return;
        }

        const confirm = window.confirm(
            'Switch to Firebase mode?\n\n' +
            'This will:\n' +
            '- Enable real-time sync across all users\n' +
            '- Store data in Firebase Cloud\n' +
            '- Migrate your current data to Firebase\n\n' +
            'Continue?'
        );

        if (confirm) {
            try {
                await migrateToFirebase(reservationsData, auditLog);
                currentStorageMode = STORAGE_MODES.FIREBASE;
                localStorage.setItem(STORAGE_MODE_KEY, currentStorageMode);

                // Save team preference to Firebase
                if (typeof setTeamStorageMode === 'function') {
                    await setTeamStorageMode(currentStorageMode);
                }

                // Subscribe to real-time updates
                subscribeToFirebaseUpdates(async () => {
                    await loadReservations();
                    renderGrid();
                    updateLastUpdated();
                });

                updateModeUI();
                alert('✅ Switched to Firebase mode successfully!\n\nData is now synced in real-time across all users.\n\nAll team members will now use Firebase mode by default.');
            } catch (error) {
                alert('Failed to switch to Firebase mode: ' + error.message);
            }
        }
    } else {
        // Switch to Local
        const confirm = window.confirm(
            'Switch to Local mode?\n\n' +
            'This will:\n' +
            '- Use your browser\'s localStorage\n' +
            '- No real-time sync (each user has their own data)\n' +
            '- Download current Firebase data to local storage\n\n' +
            'Continue?'
        );

        if (confirm) {
            try {
                const { reservationsData: fbData, auditLog: fbAuditLog } = await migrateFromFirebase();

                // Save to localStorage
                reservationsData = fbData;
                auditLog = fbAuditLog;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(reservationsData));
                localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(auditLog));

                // Unsubscribe from Firebase
                unsubscribeFromFirebase();

                currentStorageMode = STORAGE_MODES.LOCAL;
                localStorage.setItem(STORAGE_MODE_KEY, currentStorageMode);

                // Save team preference to Firebase
                if (typeof setTeamStorageMode === 'function') {
                    await setTeamStorageMode(currentStorageMode);
                }

                updateModeUI();
                renderGrid();
                alert('✅ Switched to Local mode successfully!\n\nData is now stored in your browser.\n\nAll team members will now use Local mode by default.');
            } catch (error) {
                alert('Failed to switch to Local mode: ' + error.message);
            }
        }
    }
}

// Setup event listeners for buttons
function setupEventListeners() {
    // Mode toggle button
    document.getElementById('modeToggleBtn').addEventListener('click', toggleStorageMode);

    // Audit log button
    document.getElementById('auditLogBtn').addEventListener('click', showAuditLog);

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Import button
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    // File input change
    document.getElementById('fileInput').addEventListener('change', handleFileImport);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetData);

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadReservations();
        await loadAuditLogData();
        renderGrid();
        updateLastUpdated();
        showNotification('Grid refreshed');
    });
}

// Show audit log
function showAuditLog() {
    if (auditLog.length === 0) {
        alert('No audit log entries yet.');
        return;
    }

    const sortedLog = [...auditLog].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    let logText = '=== AUDIT LOG ===\n';
    logText += `Total entries: ${sortedLog.length}\n`;
    logText += `Storage Mode: ${currentStorageMode.toUpperCase()}\n\n`;

    sortedLog.slice(0, 50).forEach((entry, index) => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleString();

        if (entry.action === 'reserve') {
            logText += `[${index + 1}] ${timeStr}\n`;
            logText += `  ✅ RESERVE: ${entry.action_by} reserved ${entry.card} on ${entry.machine}\n\n`;
        } else if (entry.action === 'release') {
            const isSelf = entry.original_owner.toLowerCase() === entry.action_by.toLowerCase();
            if (isSelf) {
                logText += `[${index + 1}] ${timeStr}\n`;
                logText += `  ✓ RELEASE: ${entry.action_by} released their own ${entry.card} on ${entry.machine}\n\n`;
            } else {
                logText += `[${index + 1}] ${timeStr}\n`;
                logText += `  ⚠️ RELEASE: ${entry.action_by} released ${entry.original_owner}'s ${entry.card} on ${entry.machine}\n\n`;
            }
        }
    });

    if (sortedLog.length > 50) {
        logText += `\n... and ${sortedLog.length - 50} more entries`;
    }

    alert(logText);
}

// Export current data as JSON file
function exportData() {
    const dataStr = JSON.stringify(reservationsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sc09_reservations_${currentStorageMode}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showNotification('Data exported successfully');
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            if (!imported.machines || !Array.isArray(imported.machines)) {
                throw new Error('Invalid data structure');
            }

            reservationsData = imported;
            await saveToStorage();
            renderGrid();

            alert('Data imported successfully!');
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);

    event.target.value = '';
}

// Reset to original data from reservations.json
async function resetData() {
    if (!confirm('Are you sure you want to reset all reservations to the original state? This will delete all current reservations.')) {
        return;
    }

    try {
        if (currentStorageMode === STORAGE_MODES.FIREBASE && firebaseInitialized) {
            // Load from JSON and migrate to Firebase
            const response = await fetch('reservations.json');
            const originalData = await response.json();
            await migrateToFirebase(originalData, []);
            await loadReservations();
        } else {
            // Clear localStorage and reload from JSON
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(AUDIT_LOG_KEY);

            const response = await fetch('reservations.json');
            reservationsData = await response.json();
            auditLog = [];

            await saveToStorage();
            saveAuditLog();
        }

        renderGrid();
        alert('Reservations have been reset to the original state.');
    } catch (error) {
        alert('Error resetting data: ' + error.message);
    }
}
