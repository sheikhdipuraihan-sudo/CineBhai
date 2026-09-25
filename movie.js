import { db } from './firebase.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { 
  escapeHtml, 
  renderHeader, 
  renderFooter, 
  renderMovieCard, 
  attachWatchlistListeners, 
  isInWatchlist, 
  toggleWatchlist, 
  showToast 
} from './shared.js';

renderHeader();
renderFooter();

const id = new URLSearchParams(window.location.search).get('id');
const root = document.getElementById('movieDetail');
const relatedSection = document.getElementById('relatedSection');
const relatedGrid = document.getElementById('relatedGrid');

if (!id) {
  root.innerHTML = `
    <div class="empty-state" style="margin: 40px auto; max-width: 600px;">
      <div class="empty-icon">⚠️</div>
      <h3>Movie ID missing</h3>
      <p>No movie was specified. Return to the catalog to choose a title.</p>
      <a class="button primary" href="index.html">← Back to Catalog</a>
    </div>
  `;
} else {
  loadMovie(id);
}

async function loadMovie(movieId) {
  try {
    const snap = await getDoc(doc(db, 'movies', movieId));
    if (!snap.exists()) {
      root.innerHTML = `
        <div class="empty-state" style="margin: 40px auto; max-width: 600px;">
          <div class="empty-icon">🎬</div>
          <h3>Movie Not Found</h3>
          <p>The requested movie could not be located in the CineBhai database.</p>
          <a class="button primary" href="index.html">← Browse All Movies</a>
        </div>
      `;
      return;
    }

    const movie = { id: snap.id, ...snap.data() };
    document.title = `${movie.title || 'Movie'} — CineBhai`;

    // Cache in window for spotlight search
    if (!window.__cinebhai_all_movies) {
      getDocs(collection(db, 'movies')).then(s => {
        window.__cinebhai_all_movies = s.docs.map(d => ({ id: d.id, ...d.data() }));
      });
    }

    const inList = isInWatchlist(movie.id);
    const ratingNum = movie.rating ? Number(movie.rating).toFixed(1) : null;
    const genres = String(movie.genre || '').split(',').map(g => g.trim()).filter(Boolean);

    root.innerHTML = `
      <div class="detail-backdrop" style="background-image: url('${escapeHtml(movie.posterUrl || '')}');"></div>
      <div class="detail-container">
        <div class="detail-poster-box">
          <img 
            src="${escapeHtml(movie.posterUrl || '')}" 
            alt="${escapeHtml(movie.title || 'Movie')} Poster"
            onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'450\\' viewBox=\\'0 0 300 450\\'%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' fill=\\'%2312121e\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' fill=\\'%23555566\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-family=\\'sans-serif\\' font-size=\\'14\\'%3ENo Poster%3C/text%3E%3C/svg%3E';"
          >
        </div>

        <div class="detail-info">
          <div class="detail-kicker">
            <span class="kicker">CINEBHAI CINEMA</span>
            ${movie.showTrending ? '<span class="badge-trending" style="position:static; display:inline-block; font-size:11px; padding:3px 9px; border-radius:4px;">🔥 TRENDING</span>' : ''}
          </div>

          <h1 class="detail-title">${escapeHtml(movie.title || 'Untitled Movie')}</h1>

          <div class="detail-chips">
            ${movie.year ? `<span class="detail-chip">${escapeHtml(movie.year)}</span>` : ''}
            <span class="detail-chip" style="color:#fff; font-weight:800; border-color:rgba(255,255,255,0.2);">4K ULTRA HD</span>
            <span class="detail-chip" style="color:#fff; font-weight:800; border-color:rgba(255,255,255,0.2);">DOLBY ATMOS</span>
            ${ratingNum ? `<span class="detail-chip" style="color:var(--accent-gold); border-color:rgba(251,191,36,0.4); font-weight:800;">★ ${ratingNum} Rating</span>` : ''}
            ${genres.map(g => `<a href="genre.html?genre=${encodeURIComponent(g)}" class="detail-chip">${escapeHtml(g)}</a>`).join('')}
          </div>

          <h3 class="detail-synopsis-head">Storyline Overview</h3>
          <p class="detail-synopsis">${escapeHtml(movie.description || 'No storyline summary recorded for this title.')}</p>

          <div class="detail-actions-row">
            <a class="button primary" href="watch.html?id=${encodeURIComponent(movie.id)}">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Watch Movie
            </a>
            
            <button class="button secondary" id="detailWatchlistBtn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span id="watchlistBtnLabel">${inList ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>

            <button class="button ghost" id="shareBtn" title="Share movie link">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
    `;

    // Interactive button bindings
    const watchlistBtn = document.getElementById('detailWatchlistBtn');
    const label = document.getElementById('watchlistBtnLabel');
    if (watchlistBtn && label) {
      watchlistBtn.onclick = () => {
        const nowInList = toggleWatchlist(movie);
        label.textContent = nowInList ? 'In Watchlist' : 'Add to Watchlist';
        watchlistBtn.classList.toggle('primary', nowInList);
      };
    }

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      shareBtn.onclick = async () => {
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(window.location.href);
            showToast('Movie link copied to clipboard!', 'success');
          } else {
            prompt('Copy link:', window.location.href);
          }
        } catch {
          prompt('Copy link:', window.location.href);
        }
      };
    }

    loadRelatedMovies(movie);

  } catch (err) {
    console.error('Movie detail error:', err);
    root.innerHTML = `
      <div class="empty-state" style="margin: 40px auto; max-width: 600px;">
        <div class="empty-icon">⚠️</div>
        <h3>Unable to load movie</h3>
        <p>A network or database connection issue occurred.</p>
        <button class="button secondary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

async function loadRelatedMovies(currentMovie) {
  try {
    const snap = await getDocs(collection(db, 'movies'));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const currentGenres = String(currentMovie.genre || '')
      .split(',')
      .map(g => g.trim().toLowerCase());

    const related = all.filter(m => {
      if (m.id === currentMovie.id) return false;
      const mGenres = String(m.genre || '').split(',').map(g => g.trim().toLowerCase());
      return mGenres.some(g => currentGenres.includes(g));
    }).slice(0, 5);

    if (related.length > 0 && relatedSection && relatedGrid) {
      relatedSection.style.display = 'block';
      relatedGrid.innerHTML = related.map(m => renderMovieCard(m)).join('');
      const relatedMap = new Map();
      related.forEach(m => relatedMap.set(m.id, m));
      attachWatchlistListeners(relatedMap);
    }
  } catch (e) {
    console.warn('Could not load related titles:', e);
  }
}
