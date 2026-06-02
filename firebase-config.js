// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get them from: Firebase Console > Project Settings > Your apps > SDK setup and configuration

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Check if Firebase config is set up
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, isFirebaseConfigured };
}
