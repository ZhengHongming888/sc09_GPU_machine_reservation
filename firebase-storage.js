// Firebase Storage Layer
// Handles all Firebase Firestore operations

let db = null;
let firebaseApp = null;
let unsubscribeListeners = [];

// Initialize Firebase
async function initializeFirebase() {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured. Using localStorage mode.');
        return false;
    }

    try {
        // Initialize Firebase app
        firebaseApp = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Get the team's preferred storage mode from Firebase
async function getTeamStorageMode() {
    try {
        const doc = await db.collection('settings').doc('storage_mode').get();
        if (doc.exists) {
            return doc.data().mode;
        }
        return null;
    } catch (error) {
        console.error('Error getting team storage mode:', error);
        return null;
    }
}

// Set the team's preferred storage mode in Firebase
async function setTeamStorageMode(mode) {
    try {
        await db.collection('settings').doc('storage_mode').set({
            mode: mode,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: 'system'
        });
        console.log('Team storage mode set to:', mode);
    } catch (error) {
        console.error('Error setting team storage mode:', error);
        throw error;
    }
}

// Load reservations from Firestore
async function loadFromFirebase() {
    try {
        const machines = [];
        const snapshot = await db.collection('machines').orderBy('id').get();

        for (const doc of snapshot.docs) {
            const machineData = doc.data();

            // Load cards for this machine - simplified query to avoid index
            const cardsSnapshot = await db.collection('cards')
                .where('machine_id', '==', doc.id)
                .get();

            // Sort cards in memory instead of in query
            const cards = cardsSnapshot.docs
                .map(cardDoc => {
                    const data = cardDoc.data();
                    return {
                        id: data.card_number,
                        name: data.card_name,
                        reserved_by: data.reserved_by
                    };
                })
                .sort((a, b) => a.id - b.id);

            machines.push({
                category: machineData.category,
                name: machineData.name,
                cards: cards
            });
        }

        return {
            machines: machines,
            last_updated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        throw error;
    }
}

// Save a reservation to Firestore
async function saveReservationToFirebase(machineName, cardId, reservedBy) {
    try {
        // Find the card document
        const snapshot = await db.collection('cards')
            .where('machine_name', '==', machineName)
            .where('card_number', '==', cardId)
            .get();

        if (snapshot.empty) {
            throw new Error('Card not found');
        }

        const cardDoc = snapshot.docs[0];
        await cardDoc.ref.update({
            reserved_by: reservedBy,
            reserved_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Saved reservation: ${machineName} ${cardId} -> ${reservedBy}`);
    } catch (error) {
        console.error('Error saving reservation to Firebase:', error);
        throw error;
    }
}

// Release a reservation in Firestore
async function releaseReservationInFirebase(machineName, cardId) {
    try {
        const snapshot = await db.collection('cards')
            .where('machine_name', '==', machineName)
            .where('card_number', '==', cardId)
            .get();

        if (snapshot.empty) {
            throw new Error('Card not found');
        }

        const cardDoc = snapshot.docs[0];
        await cardDoc.ref.update({
            reserved_by: null,
            reserved_at: null
        });

        console.log(`Released reservation: ${machineName} ${cardId}`);
    } catch (error) {
        console.error('Error releasing reservation in Firebase:', error);
        throw error;
    }
}

// Add audit log entry to Firestore
async function addAuditEntryToFirebase(action, machine, card, originalOwner, actionBy) {
    try {
        await db.collection('audit_log').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            action: action,
            machine: machine,
            card: card,
            original_owner: originalOwner,
            action_by: actionBy
        });

        console.log('Audit entry added to Firebase');
    } catch (error) {
        console.error('Error adding audit entry to Firebase:', error);
        throw error;
    }
}

// Load audit log from Firestore
async function loadAuditLogFromFirebase() {
    try {
        const snapshot = await db.collection('audit_log')
            .orderBy('timestamp', 'desc')
            .limit(1000)  // Limit to last 1000 entries
            .get();

        const auditLog = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
                action: data.action,
                machine: data.machine,
                card: data.card,
                original_owner: data.original_owner,
                action_by: data.action_by
            };
        });

        return auditLog;
    } catch (error) {
        console.error('Error loading audit log from Firebase:', error);
        throw error;
    }
}

// Subscribe to real-time updates
function subscribeToFirebaseUpdates(onUpdate) {
    if (!db) return;

    // Unsubscribe from previous listeners
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];

    // Subscribe to cards collection
    const unsubscribe = db.collection('cards').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                console.log('Card updated in real-time:', change.doc.data());
                onUpdate();
            }
        });
    }, (error) => {
        console.error('Real-time listener error:', error);
    });

    unsubscribeListeners.push(unsubscribe);
}

// Unsubscribe from all listeners
function unsubscribeFromFirebase() {
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];
    console.log('Unsubscribed from Firebase listeners');
}

// Migrate data from localStorage to Firebase
async function migrateToFirebase(reservationsData, auditLog) {
    try {
        console.log('Starting migration to Firebase...');

        // Clear existing data
        const batch = db.batch();

        // Delete existing machines
        const machinesSnapshot = await db.collection('machines').get();
        machinesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Delete existing cards
        const cardsSnapshot = await db.collection('cards').get();
        cardsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        // Add machines and cards
        for (let i = 0; i < reservationsData.machines.length; i++) {
            const machine = reservationsData.machines[i];

            // Add machine
            const machineRef = await db.collection('machines').add({
                id: i,
                category: machine.category,
                name: machine.name
            });

            // Add cards for this machine
            for (const card of machine.cards) {
                await db.collection('cards').add({
                    machine_id: machineRef.id,
                    machine_name: machine.name,
                    card_number: card.id !== undefined ? card.id : card.card_number,
                    card_name: card.name || card.card_name || `Card${card.id || card.card_number}`,
                    reserved_by: card.reserved_by || null,
                    reserved_at: card.reserved_by ? new Date() : null
                });
            }
        }

        // Migrate audit log (latest 500 entries to avoid quota issues)
        const recentAuditLog = auditLog.slice(0, 500);
        for (const entry of recentAuditLog) {
            // Skip entries with missing required fields
            if (!entry.action || !entry.machine || !entry.card || !entry.action_by) {
                console.warn('Skipping audit entry with missing fields:', entry);
                continue;
            }

            await db.collection('audit_log').add({
                timestamp: firebase.firestore.Timestamp.fromDate(new Date(entry.timestamp)),
                action: entry.action,
                machine: entry.machine,
                card: entry.card,
                original_owner: entry.original_owner || null,
                action_by: entry.action_by
            });
        }

        console.log('Migration to Firebase completed successfully');
        return true;
    } catch (error) {
        console.error('Error migrating to Firebase:', error);
        throw error;
    }
}

// Migrate data from Firebase to localStorage
async function migrateFromFirebase() {
    try {
        console.log('Starting migration from Firebase...');

        const reservationsData = await loadFromFirebase();
        const auditLog = await loadAuditLogFromFirebase();

        console.log('Migration from Firebase completed successfully');
        return { reservationsData, auditLog };
    } catch (error) {
        console.error('Error migrating from Firebase:', error);
        throw error;
    }
}
