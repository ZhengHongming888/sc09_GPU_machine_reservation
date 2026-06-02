// Storage key for localStorage
const STORAGE_KEY = 'sc09_reservations';

// Global state
let reservationsData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// Initialize application
async function initializeApp() {
    await loadReservations();
    renderGrid();
    updateLastUpdated();
}

// Load reservations from localStorage or fetch from JSON file
async function loadReservations() {
    // Try to load from localStorage first
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

// Save current state to localStorage
function saveToStorage() {
    reservationsData.last_updated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservationsData));
    updateLastUpdated();
    console.log('Saved to localStorage');
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
        // Card is reserved - show options to release
        handleReservedCardClick(machine, card);
    } else {
        // Card is available - reserve it
        handleAvailableCardClick(machine, card);
    }
}

// Handle click on available card
function handleAvailableCardClick(machine, card) {
    const surname = prompt('Enter your surname to reserve this card:');

    if (surname && surname.trim()) {
        // Update the data
        const machineData = reservationsData.machines.find(m => m.name === machine.name);
        const cardData = machineData.cards.find(c => c.id === card.id);
        cardData.reserved_by = surname.trim();

        // Save and re-render
        saveToStorage();
        renderGrid();

        showNotification(`Reserved ${card.name} on ${machine.name} for ${surname.trim()}`);
    }
}

// Handle click on reserved card
function handleReservedCardClick(machine, card) {
    const message = `${card.name} on ${machine.name} is reserved by: ${card.reserved_by}\n\nDo you want to release this reservation?`;

    if (confirm(message)) {
        // Update the data
        const machineData = reservationsData.machines.find(m => m.name === machine.name);
        const cardData = machineData.cards.find(c => c.id === card.id);
        cardData.reserved_by = null;

        // Save and re-render
        saveToStorage();
        renderGrid();

        showNotification(`Released ${card.name} on ${machine.name}`);
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
    // Simple alert for now (can be enhanced with custom toast notifications)
    console.log('Notification:', message);
}

// Setup event listeners for buttons
function setupEventListeners() {
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
    document.getElementById('refreshBtn').addEventListener('click', () => {
        renderGrid();
        updateLastUpdated();
        showNotification('Grid refreshed');
    });
}

// Export current data as JSON file
function exportData() {
    const dataStr = JSON.stringify(reservationsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sc09_reservations_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showNotification('Data exported successfully');
}

// Handle file import
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            // Validate the structure
            if (!imported.machines || !Array.isArray(imported.machines)) {
                throw new Error('Invalid data structure');
            }

            // Update data
            reservationsData = imported;
            saveToStorage();
            renderGrid();

            alert('Data imported successfully!');
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}

// Reset to original data from reservations.json
async function resetData() {
    if (!confirm('Are you sure you want to reset all reservations to the original state? This will delete all current reservations.')) {
        return;
    }

    try {
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);

        // Reload from JSON
        const response = await fetch('reservations.json');
        reservationsData = await response.json();
        saveToStorage();
        renderGrid();

        alert('Reservations have been reset to the original state.');
    } catch (error) {
        alert('Error resetting data: ' + error.message);
    }
}
