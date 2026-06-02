# SC09 GPU Machine Reservation System

A simple web-based reservation system for managing GPU card allocations across SC09 machines.

## 🌐 Live Site

Visit: **https://zhenghongming888.github.io/sc09_GPU_machine_reservation/**

## 📋 Features

- **Visual Grid Layout**: Easy-to-read table showing all machines and their GPU cards
- **One-Click Reservations**: Click an available card to reserve it with your surname
- **Easy Release**: Click a reserved card to view details and release the reservation
- **Local Storage**: All changes are saved automatically in your browser
- **Export/Import**: Share reservation states between users using JSON files
- **Reset**: Return to the original reservation state at any time
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 How to Use

### Reserving a Card

1. Find an available card (shown in white)
2. Click on the card
3. Enter your surname when prompted
4. The card will turn blue and show your name

### Releasing a Reservation

1. Click on a reserved card (shown in blue)
2. Confirm you want to release the reservation
3. The card will return to available status

### Sharing Reservations Between Users

Since the system uses browser localStorage, each user has their own view. To share the current state:

1. **Export**: Click the "📥 Export" button to download a JSON file
2. **Share**: Send the JSON file to other users (via email, Slack, etc.)
3. **Import**: Other users click "📤 Import" and select the JSON file
4. Everyone now has the same reservation state

### Resetting to Original State

Click the "🔄 Reset" button to clear all reservations and return to the initial state from `reservations.json`.

## 🏗️ Project Structure

```
sc09_GPU_machine_reservation/
├── index.html          # Main HTML page
├── style.css           # Styling and layout
├── script.js           # JavaScript logic and localStorage management
├── reservations.json   # Initial machine/card data
└── README.md          # This file
```

## 📦 Machines Included

### Intel GPUs
- sc09rvp02-b60 (8 cards)
- sc09rvp03-b60 (8 cards)
- sc09intel02-b60 (8 cards)
- sc09giga01-70 (8 cards)
- sc09intel03-b70 (8 cards)
- sc09intel04-b70 (8 cards)
- sc09intel05-b70 (8 cards)

### Nvidia GPUs
- sc09super16-nvd (8 cards)
- sc09dell06-nvd (8 cards)
- sc09super21-h200 (8 cards)
- sc09super22-b200 (8 cards)

## 🛠️ Technical Details

### Technology Stack
- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Storage**: Browser localStorage
- **Hosting**: GitHub Pages

### Data Format

The `reservations.json` file follows this structure:

```json
{
  "machines": [
    {
      "category": "Intel GPUs",
      "name": "sc09rvp02-b60",
      "cards": [
        {
          "id": 0,
          "name": "Card0",
          "reserved_by": "robin"
        },
        ...
      ]
    },
    ...
  ],
  "last_updated": "2026-06-02T10:30:00Z"
}
```

### localStorage Key
- Key: `sc09_reservations`
- Value: JSON string of the entire reservations object

## 🚀 Deployment (GitHub Pages)

This site is hosted on GitHub Pages. To update:

1. Make changes to the files
2. Commit and push to the `main` branch:
   ```bash
   git add .
   git commit -m "Update reservations"
   git push origin main
   ```
3. Changes will be live at the GitHub Pages URL within 1-2 minutes

### Initial Setup (Already Done)

1. Repository created: `https://github.com/ZhengHongming888/sc09_GPU_machine_reservation`
2. GitHub Pages enabled in repository Settings → Pages
3. Source set to: Deploy from `main` branch, `/` (root) directory

## 🔧 Local Development

To test locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/ZhengHongming888/sc09_GPU_machine_reservation.git
   cd sc09_GPU_machine_reservation
   ```

2. Open `index.html` in your browser:
   ```bash
   # On macOS
   open index.html

   # On Linux
   xdg-open index.html

   # On Windows
   start index.html
   ```

Or use a local server:
```bash
# Python 3
python3 -m http.server 8000

# Then visit: http://localhost:8000
```

## ⚠️ Limitations

1. **No Real-Time Sync**: Changes are stored locally in each browser. Users must export/import to share states.
2. **Browser-Specific**: Clearing browser data will reset reservations.
3. **No Authentication**: Anyone can reserve or release any card.

## 💡 Future Enhancements

Potential improvements:
- Real-time synchronization with a backend (Firebase, Supabase)
- User authentication and permissions
- Reservation history and audit log
- Email notifications for reservations
- Calendar integration for time-based reservations
- Multi-card bulk reservations

## 📝 Manual JSON Editing

If needed, you can manually edit `reservations.json`:

1. Edit the file with your preferred editor
2. Commit and push changes
3. Users can click "🔄 Reset" to load the new version

## 📧 Support

For issues or questions, please contact the repository owner or create an issue on GitHub.

## 📄 License

This project is open source and available for internal use.

---

**Created**: June 2026  
**Maintained by**: ZhengHongming888
