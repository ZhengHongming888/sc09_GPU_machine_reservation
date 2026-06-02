// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get them from: Firebase Console > Project Settings > Your apps > SDK setup and configuration

const firebaseConfig = {
    apiKey: "AIzaSyDLQ6vIs5lHLDYUFw3lbF2Jnzbo0z4KHKc",
    authDomain: "sc09-gpu-reservation.firebaseapp.com",
    projectId: "sc09-gpu-reservation",
    storageBucket: "sc09-gpu-reservation.firebasestorage.app",
    messagingSenderId: "971777706348",
    appId: "1:971777706348:web:8aa7bd6b456f166126cb49"
};

// Check if Firebase config is set up
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, isFirebaseConfigured };
}
