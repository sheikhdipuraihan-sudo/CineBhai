import { db } from './firebase.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { 
  escapeHtml, 
  renderHeader, 
  renderFooter, 
  renderMovieCard, 
  attachWatchlistListeners, 
  resolveStreamingMedia, 
  recordWatchHistory,
  isInWatchlist,
  toggleWatchlist 
} from './shared.js';

renderHeader();
renderFooter();

const id = new URLSearchParams(window.location.search).get('id');
const root = document.getElementById('watchContainer');
const upNextSection = document.getElementById('upNextSection');
const upNextGrid = document.getElementById('upNextGrid');

if (!id) {
  root.innerHTML = `
    <div class="empty-state" style="margin: 40px auto; max-width: 600px;">
      <div class="empty-icon">⚠️</div>
      <h3>Movie ID is missing</h3>
      <p>Please select a title from the catalog to launch the player.</p>
      <a class="button primary" href="index.html">← Back to Catalog</a>
    </div>
  `;
} else {
  initPlayer(id);
}

async function initPlayer(movieId) {
  try {
    const snap = await getDoc(doc(db, 'movies', movieId));
    if (!snap.exists()) {
      root.innerHTML = `
        <div class="empty-state" style="margin: 40px auto; max-width: 600px;">
          <div class="empty-icon">🎬</div>
          <h3>Movie Not Found</h3>
          <p>The requested title could not be found in the CineBhai database.</p>
          <a class="button primary" href="index.html">← Back to Library</a>
        </div>
      `;
      return;
    }

    const movie = { id: snap.id, ...snap.data() };
    document.title = `Watch ${movie.title || 'Movie'} — CineBhai`;

    // Cache movies in window for spotlight search
    if (!window.__cinebhai_all_movies) {
      getDocs(collection(db, 'movies')).then(s => {
        window.__cinebhai_all_movies = s.docs.map(d => ({ id: d.id, ...d.data() }));
      });
    }

    recordWatchHistory(movie);

    const stream = resolveStreamingMedia(movie.embedCode, `${movie.title || 'Movie'} Player`);
    const inList = isInWatchlist(movie.id);

    root.innerHTML = `
      <div class="theater-bar">
        <a class="button ghost" href="movie.html?id=${encodeURIComponent(movie.id)}">
          ← Movie Details
        </a>

        <div class="theater-controls">
          <button class="button secondary" id="ambilightToggleBtn" title="Toggle ambient lighting reflection">
            ✨ <span id="ambiLabel">Ambilight: On</span>
          </button>
          <button class="button secondary" id="lightsOffBtn" title="Toggle cinema focus lights">
            💡 <span id="lightsLabel">Lights Off</span>
          </button>
          <button class="button secondary" id="theaterModeBtn" title="Expand player width">
            ⛶ <span id="theaterLabel">Theater Mode</span>
          </button>
        </div>
      </div>

      <!-- Stage with Ambient Ambilight Glow Reflection -->
      <div class="player-ambilight-wrapper" id="ambiWrapper">
        <div 
          class="ambilight-glow" 
          id="ambiGlow"
          style="background-image: url('${escapeHtml(movie.posterUrl || '')}'); background-size: cover; background-position: center;"
        ></div>
        <div class="cinema-player-box" id="playerStage">
          ${stream.html}
        </div>
      </div>

      <div class="watch-meta-box">
        <div class="watch-title-group">
          <h1>${escapeHtml(movie.title || 'Untitled')}</h1>
          <p class="muted">
            ${escapeHtml(movie.year || '')} 
            ${movie.genre ? `• ${escapeHtml(movie.genre)}` : ''} 
            ${movie.rating ? `• ★ ${Number(movie.rating).toFixed(1)}` : ''}
          </p>
        </div>

        <div class="watch-actions-group">
          <button class="button secondary" id="watchWatchlistBtn">
            ${inList ? '✓ In Watchlist' : '+ Add to Watchlist'}
          </button>
        </div>
      </div>
    `;

    // Ambilight Toggle
    const ambiBtn = document.getElementById('ambilightToggleBtn');
    const ambiGlow = document.getElementById('ambiGlow');
    const ambiLabel = document.getElementById('ambiLabel');
    if (ambiBtn && ambiGlow && ambiLabel) {
      let ambiOn = true;
      ambiBtn.onclick = () => {
        ambiOn = !ambiOn;
        ambiGlow.style.opacity = ambiOn ? '0.85' : '0';
        ambiLabel.textContent = ambiOn ? 'Ambilight: On' : 'Ambilight: Off';
      };
    }

    // Lights off dimmer toggle
    const lightsBtn = document.getElementById('lightsOffBtn');
    const lightsLabel = document.getElementById('lightsLabel');
    if (lightsBtn && lightsLabel) {
      lightsBtn.onclick = () => {
        const isDim = document.body.classList.toggle('lights-off');
        lightsLabel.textContent = isDim ? 'Lights On' : 'Lights Off';
      };
    }

    // Theater mode toggle
    const theaterBtn = document.getElementById('theaterModeBtn');
    const theaterLabel = document.getElementById('theaterLabel');
    if (theaterBtn && theaterLabel) {
      theaterBtn.onclick = () => {
        const isWide = document.body.classList.toggle('theater-mode');
        theaterLabel.textContent = isWide ? 'Standard Mode' : 'Theater Mode';
      };
    }

    // Watchlist button on player page
    const wlBtn = document.getElementById('watchWatchlistBtn');
    if (wlBtn) {
      wlBtn.onclick = () => {
        const nowInList = toggleWatchlist(movie);
        wlBtn.textContent = nowInList ? '✓ In Watchlist' : '+ Add to Watchlist';
        wlBtn.classList.toggle('primary', nowInList);
      };
    }

    loadUpNext(movie);

  } catch (err) {
    console.error('Watch player error:', err);
    root.innerHTML = `
      <div class="empty-state" style="margin: 40px auto; max-width: 600px;">
        <div class="empty-icon">⚠️</div>
        <h3>Player Unavailable</h3>
        <p>Could not initialize streaming session. Please try again.</p>
        <button class="button secondary" onclick="location.reload()">Reload Player</button>
      </div>
    `;
  }
}

async function loadUpNext(currentMovie) {
  try {
    const snap = await getDocs(collection(db, 'movies'));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const nextMovies = all
      .filter(m => m.id !== currentMovie.id && m.showCatalog !== false)
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 5);

    if (nextMovies.length > 0 && upNextSection && upNextGrid) {
      upNextSection.style.display = 'block';
      upNextGrid.innerHTML = nextMovies.map(m => renderMovieCard(m)).join('');
      const upNextMap = new Map();
      nextMovies.forEach(m => upNextMap.set(m.id, m));
      attachWatchlistListeners(upNextMap);
    }
  } catch (e) {
    console.warn('Could not load up next movies:', e);
  }
}
