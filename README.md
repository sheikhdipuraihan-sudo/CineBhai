<div align="center">

# 🎬 CineBhai — Elite Movie Streaming & Discovery Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-cine--bhai.vercel.app-e50914?style=for-the-badge&logo=vercel&logoColor=white)](https://cine-bhai.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Vanilla_ES_Modules-HTML5_/_CSS3-blue?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Database](https://img.shields.io/badge/Backend-Firebase_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**CineBhai** is a modern, responsive movie streaming catalog and cinema hub engineered with pure web standards. It delivers a fluid streaming experience featuring a **Hero Spotlight**, **Smart Video Stream Resolver**, **Cinema Theater Mode**, **Continue Watching tracker**, **Local-first Watchlist**, and a **Pro Admin Studio**.

[Explore Live Demo](https://cine-bhai.vercel.app) • [Report Issue](https://github.com/sheikhdipuraihan-sudo/CineBhai/issues) • [Feature Requests](https://github.com/sheikhdipuraihan-sudo/CineBhai/pulls)

</div>

---

## 🌟 Key Highlights & Features

### 1. 🎭 Cinematic Visual Experience
* **Hero Spotlight Banner**: Dynamic banner featuring trending movies with high-resolution backdrop art, rating badges, genre chips, and one-click play.
* **Modern Design System**: Obsidian black backdrop (`#08080c`), glassmorphic navigation blur, electric crimson accents (`#e50914`), and smooth micro-interactions.
* **Animated Skeleton Shimmers**: Eliminates layout jumping with fluid placeholder pulse animations while content loads from Firestore.
* **Mobile-Responsive Drawer**: Seamless layout on smartphones, tablets, laptops, and ultra-wide displays.

### 2. ⚡ Smart Stream & Video Engine
* **Universal Link Resolver**:
  * **YouTube**: Automatically resolves regular `watch?v=...`, `youtu.be/...`, or `shorts/...` links into privacy-enhanced `youtube-nocookie.com/embed/...` containers (bypassing `X-Frame-Options` blocks).
  * **Direct Video Streams**: Renders `.mp4`, `.webm`, or `.m3u8` video files directly in a native HTML5 video player.
  * **Third-Party Providers**: Native embed support for Vimeo, Dailymotion, Google Drive, and custom `<iframe>` codes.
* **Cinema Focus & Theater Mode**:
  * **"Lights Off"**: Dims surrounding ambient page elements for zero-distraction movie immersion.
  * **"Theater Mode"**: Expands player stage width.
* **Up Next Queue**: Smart recommendations rendered directly beneath the player to keep viewers engaged.

### 3. 🔖 Personal Hub (Zero Login Required)
* **Private Watchlist**: 1-click bookmarking on cards and movie detail pages, stored locally with instant toast notifications.
* **Continue Watching**: Automatically tracks recently viewed movies and makes them accessible from the homepage.
* **Instant Search & Hotkeys**: Press `/` from anywhere on the page to focus the search bar.

### 4. 🛡️ Pro Admin Studio (`admin.html`)
* **Firebase Authentication**: Protected with email/password authentication.
* **Catalog Analytics**: Real-time metrics counters for Total Titles, Trending Active, Catalog Visible, and Average Rating.
* **Live Poster & Stream Preview**: Verifies poster image URLs and video streams prior to publishing.
* **Searchable Database Table**: Live instant filtering across all records with quick Edit, Test, and Delete controls.

---

## 📁 Project Architecture

```plaintext
CineBhai/
├── index.html         # Homepage: Hero Spotlight, Continue Watching, Trending, New, All
├── movie.html         # Cinematic Movie Details, Metadata, Storyline & Recommendations
├── movie.js           # Movie details loader & recommendation engine
├── watch.html         # Cinema Theater Player with Lights-Off & Up Next queue
├── watch.js           # Smart stream resolver & playback history tracker
├── trending.html      # Full curated trending catalog
├── new.html           # Contemporary new releases catalog
├── genres.html        # Visual genre directories
├── genre.html         # Category-filtered movie catalog
├── search.html        # Dedicated search results with match counter
├── watchlist.html     # User's personal bookmarked movies hub
├── watchlist.js       # Watchlist state manager & card renderer
├── admin.html         # Pro Admin Studio console
├── admin.js           # Admin authentication, CRUD, and live preview logic
├── styles.css         # Unified design system & responsive stylesheet
├── shared.js          # Shared utilities (stream resolver, cards, watchlist, toasts)
├── firebase.js        # Firebase App, Auth & Firestore initialization
└── firestore.rules    # Cloud Firestore security rules
```

---

## 🚀 Quick Start / Local Development

Since CineBhai is built with vanilla ES modules, you can serve it with any lightweight HTTP server:

### Prerequisites
* Any modern web browser (Chrome, Firefox, Safari, Edge)
* Python, Node.js, or VS Code Live Server

### Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/sheikhdipuraihan-sudo/CineBhai.git
cd CineBhai

# 2. Start a local HTTP server
# Option A: Python 3
python -m http.server 4173

# Option B: Node.js (npx)
npx serve .

# Option C: PHP
php -S localhost:4173
```

Open your browser to `http://localhost:4173/index.html`.

---

## ⚙️ Firebase Setup Guide

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** → Select **Email/Password** provider.
3. Create an administrator user in **Authentication** → **Users**.
4. Create a **Cloud Firestore** database.
5. Deploy the security rules from `firestore.rules`:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /movies/{movieId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
6. Update your web app credentials in `firebase.js`.

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)
1. Fork or push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your `CineBhai` repository.
4. Deploy! No build step or environment commands are required.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more details.

---

<div align="center">
  <sub>Engineered with precision for CineBhai. Handcrafted for cinema lovers worldwide.</sub>
</div>
