# Firebase Setup Guide

This guide will help you set up Firebase for the SC09 GPU Machine Reservation System.

## Why Firebase?

- ✅ **Real-time sync**: All users see updates instantly
- ✅ **Scalable audit log**: No localStorage size limits
- ✅ **Cloud storage**: Data persists even if browser cache is cleared
- ✅ **Free tier**: Generous limits for small teams

## Setup Steps

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `sc09-gpu-reservation` (or your choice)
4. Disable Google Analytics (optional, not needed for this app)
5. Click "Create project"

### Step 2: Register Your Web App

1. In your Firebase project, click the **Web icon** (`</>`) to add a web app
2. App nickname: `SC09 Reservation System`
3. **Do NOT** check "Set up Firebase Hosting" (we use GitHub Pages)
4. Click "Register app"
5. You'll see a configuration object - **keep this page open**

### Step 3: Copy Configuration to Your Code

1. From the Firebase Console, copy the `firebaseConfig` object
2. Open `firebase-config.js` in your project
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijk123456"
};
```

4. Save the file

### Step 4: Enable Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. **Start in production mode** (we'll add rules next)
4. Choose a Cloud Firestore location (pick closest to your users)
   - Recommended: `us-central1` or `asia-east1`
5. Click "Enable"

### Step 5: Set Up Firestore Security Rules

1. In Firestore Database, go to the **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes (suitable for internal team use)
    // For production, you should add authentication
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click "Publish"

**Note**: These rules allow anyone to read/write. For production use, implement Firebase Authentication and restrict access.

### Step 6: Create Initial Database Structure

The app will automatically create the database structure when you first migrate data to Firebase. However, you can manually create collections if needed:

**Collections to create:**
- `machines` - GPU machines
- `cards` - GPU cards
- `audit_log` - Reservation history

The app handles this automatically when you click "Migrate to Firebase" in the UI.

### Step 7: Test the Connection

1. Open your website
2. You should see "Mode: 💾 Local" at the top
3. If Firebase is configured correctly, clicking the mode button will offer to switch to Firebase mode

## Using the Dual-Mode System

### Local Mode (💾 Local)
- Data stored in browser's localStorage
- No internet connection required
- Each user has their own data
- Good for: Testing, offline use, personal tracking

### Firebase Mode (☁️ Firebase)
- Data stored in Firebase Cloud
- Real-time sync across all users
- Requires internet connection
- Good for: Team collaboration, long-term storage

### Switching Modes

**Local → Firebase:**
1. Click the "💾 Local" button
2. Confirm migration
3. All local data will be uploaded to Firebase
4. Real-time sync will be enabled

**Firebase → Local:**
1. Click the "☁️ Firebase" button
2. Confirm migration
3. Current Firebase data will be downloaded to localStorage
4. You'll work offline with local data

### Data Migration

When switching modes, the app automatically:
- Copies all machine/card reservations
- Migrates audit log (last 500 entries for Firebase → Local)
- Preserves all existing data

## Firestore Data Structure

### machines collection
```javascript
{
  id: 0,
  category: "Intel GPUs",
  name: "sc09rvp02-b60"
}
```

### cards collection
```javascript
{
  machine_id: "<machine_doc_id>",
  machine_name: "sc09rvp02-b60",
  card_number: 0,
  card_name: "Card0",
  reserved_by: "zhm" | null,
  reserved_at: Timestamp | null
}
```

### audit_log collection
```javascript
{
  timestamp: Timestamp,
  action: "reserve" | "release",
  machine: "sc09rvp02-b60",
  card: "Card0",
  original_owner: "igor" | null,
  action_by: "zhm"
}
```

## Monitoring Usage

### Check Firestore Usage:
1. Firebase Console → **Build** → **Firestore Database**
2. Click **Usage** tab
3. Monitor reads/writes/storage

### Free Tier Limits:
- **Reads**: 50,000 / day
- **Writes**: 20,000 / day
- **Deletes**: 20,000 / day
- **Storage**: 1 GB

**Typical usage for your team:**
- ~10 users × 50 actions/day = 500 writes/day
- ~100 page loads/day × 88 cards = 8,800 reads/day
- Well within free tier! 🎉

## Troubleshooting

### "Firebase is not configured" error
- Check that `firebase-config.js` has your actual credentials
- Ensure all placeholder values are replaced

### "Permission denied" error
- Check Firestore Rules in Firebase Console
- Ensure rules allow read/write access

### Data not syncing in real-time
- Check browser console for errors
- Verify internet connection
- Refresh the page

### Local mode works but Firebase doesn't
- Verify Firebase SDK loaded (check browser console)
- Check Firebase project is active in Firebase Console
- Ensure Firestore is enabled (not Realtime Database)

## Cost Considerations

**Free Tier (Spark Plan):**
- ✅ Perfect for small teams (< 50 users)
- ✅ Normal usage stays well within limits
- ✅ No credit card required

**If you exceed free tier:**
- Firebase will alert you before charging
- Blaze plan (pay-as-you-go) starts charging only after free tier
- Typical cost for moderate use: $1-5/month

## Security Best Practices (Optional)

For production use, consider:

1. **Enable Firebase Authentication**
2. **Update Firestore Rules** to require authentication:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **Add user roles** to limit who can release reservations

## Support

If you encounter issues:
1. Check browser console for error messages
2. Review this guide carefully
3. Check Firebase Console for service status
4. Consult [Firebase Documentation](https://firebase.google.com/docs/firestore)

---

**Questions?** Create an issue in the GitHub repository!
