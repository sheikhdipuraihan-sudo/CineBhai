# CineBhai

CineBhai is a responsive movie streaming catalog inspired by the supplied dark blue streaming layout. It is implemented as a self-contained vanilla HTML/CSS/JavaScript site, so it can be deployed to any static host.

## Included

- Responsive CineBhai branded header, hero, movie grid, genre browsing, and footer.
- Search by movie title, genre, or year with live filtering.
- Clickable movie cards that open a streaming detail modal with poster metadata, description, and an embedded trailer/player URL.
- Surprise Me button that opens a random title.
- Admin panel for adding, editing, and deleting movies.
- Fields for movie name, description, year, genre, rating, poster URL, and streaming embed URL.
- Catalog changes persisted in browser `localStorage` under `cinebhai_movies`.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

The included catalog uses remote image and YouTube embed URLs as demo content. Replace those values in the Admin panel with your own licensed poster and streaming URLs for production use.
