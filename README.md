# CineBhai

CineBhai is a focused, responsive movie catalog with separate pages for Home, Trending, New Releases, Genres, Search, Movie Details, Watch, and Admin. The public header does not expose the admin area.

## Pages

- `index.html` — home, trending preview, new releases, genres, and all catalog titles.
- `trending.html` — full trending catalog.
- `new.html` — newest titles.
- `genres.html` — direct genre links.
- `search.html?q=...` — search-only results.
- `movie.html?id=...` — Firestore movie detail page.
- `watch.html?id=...` — Firestore embed player page.
- `admin.html` — Firebase email/password login and editable movie CRUD.

Every poster is a link containing the Firestore document ID. The admin editor supports title, description, year, genre, rating, direct poster URL, streaming URL or iframe code, and three publishing destinations: **Trending**, **All movies**, and **Search**. Uncheck all destinations to keep a movie hidden.

## Firebase setup

The Firebase web config is in `firebase.js`. In Firebase Console:

1. Enable **Authentication → Email/Password**.
2. Create the admin user email/password under Authentication → Users.
3. Create a Firestore database.
4. Apply `firestore.rules` so public visitors can read movies while only signed-in users can write.
5. Add movies from `admin.html`. Use a direct image URL from Catbox, ImgBB, Cloudinary, or another host. Paste a YouTube embed URL or a full iframe code in the streaming field.

This project does not use Firebase Storage, which keeps poster hosting compatible with the Firebase free tier.

## Local run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/index.html`.
