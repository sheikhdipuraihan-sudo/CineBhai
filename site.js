import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { 
  escapeHtml, 
  renderHeader, 
  renderFooter, 
  renderMovieCard, 
  attachWatchlistListeners, 
  renderSkeletons, 
  getWatchHistory,
  isInWatchlist,
  toggleWatchlist
} from './shared.js';

// DOM Selector Helper
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function getActivePage() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('trending.html')) return 'trending';
  if (path.endsWith('new.html')) return 'new';
  if (path.endsWith('genres.html') || path.endsWith('genre.html')) return 'genres';
  if (path.endsWith('watchlist.html')) return 'watchlist';
  if (path.endsWith('search.html')) return 'search';
  return 'home';
}

const activePage = getActivePage();
renderHeader(activePage);
renderFooter();

// Parse Query Parameters
const params = new URLSearchParams(window.location.search);
const query = (params.get('q') || '').trim().toLowerCase();
const genreParam = (params.get('genre') || '').trim();

// Setup initial skeleton placeholders
const trendingGrid = $('#trendingGrid');
const newGrid = $('#newGrid');
const allGrid = $('#allGrid');
const continueGrid = $('#continueGrid');

if (trendingGrid) trendingGrid.innerHTML = renderSkeletons(5);
if (newGrid) newGrid.innerHTML = renderSkeletons(5);
if (allGrid) allGrid.innerHTML = renderSkeletons(10);
if (continueGrid) continueGrid.innerHTML = renderSkeletons(4);

let moviesMap = new Map();

async function initCatalog() {
  try {
    const snapshot = await getDocs(collection(db, 'movies'));
    const allMovies = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    // Cache globally for the instant Spotlight Search Modal
    window.__cinebhai_all_movies = allMovies;

    moviesMap.clear();
    allMovies.forEach(m => moviesMap.set(m.id, m));

    // Handle Continue Watching
    renderContinueWatching();

    // 1. Featured Hero Billboard
    if ($('#heroSpotlight')) {
      renderHeroSpotlight(allMovies);
    }

    // 2. Filter rules
    const isSearchPage = activePage === 'search';
    const searchable = allMovies.filter((m) => m.showSearch !== false);
    
    let matched = (isSearchPage ? searchable : allMovies);
    if (query) {
      matched = matched.filter((m) => 
        `${m.title || ''} ${m.genre || ''} ${m.description || ''}`.toLowerCase().includes(query)
      );
    }

    const catalog = matched.filter((m) => m.showCatalog !== false);
    const trending = matched
      .filter((m) => m.showTrending === true)
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

    const newest = [...catalog].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));

    // Genre catalog filtering
    let genreCatalog = catalog;
    if (genreParam) {
      genreCatalog = catalog.filter((m) => 
        String(m.genre || '')
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .includes(genreParam.toLowerCase())
      );
    }

    // Populate Grids
    if (trendingGrid) {
      if (trending.length > 0) {
        trendingGrid.innerHTML = trending.map(m => renderMovieCard(m)).join('');
        $('#trendingEmpty')?.classList.add('hidden');
      } else {
        trendingGrid.innerHTML = '';
        $('#trendingEmpty')?.classList.remove('hidden');
      }
    }

    if (newGrid) {
      const displayNewest = newest.slice(0, 10);
      if (displayNewest.length > 0) {
        newGrid.innerHTML = displayNewest.map(m => renderMovieCard(m)).join('');
        $('#newEmpty')?.classList.add('hidden');
      } else {
        newGrid.innerHTML = '';
        $('#newEmpty')?.classList.remove('hidden');
      }
    }

    if (allGrid) {
      if (genreCatalog.length > 0) {
        allGrid.innerHTML = genreCatalog.map(m => renderMovieCard(m)).join('');
        $('#allEmpty')?.classList.add('hidden');
      } else {
        allGrid.innerHTML = '';
        $('#allEmpty')?.classList.remove('hidden');
      }
    }

    // Counts
    const trendingCount = $('#trendingCount');
    if (trendingCount) {
      trendingCount.textContent = `${trending.length} title${trending.length === 1 ? '' : 's'}`;
    }

    const searchCount = $('#searchCount');
    if (searchCount) {
      searchCount.textContent = `${genreCatalog.length} result${genreCatalog.length === 1 ? '' : 's'}`;
    }

    // Distinct Genres
    const uniqueGenres = [
      ...new Set(
        allMovies.flatMap((m) =>
          String(m.genre || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        )
      )
    ].sort();

    // Render Genre Cards
    const genreList = $('#genreList');
    if (genreList) {
      if (uniqueGenres.length > 0) {
        genreList.innerHTML = uniqueGenres.map((item) => `
          <a class="genre-card" href="genre.html?genre=${encodeURIComponent(item)}">
            <span>${escapeHtml(item)}</span>
            <span class="genre-arrow">→</span>
          </a>
        `).join('');
        $('#genreEmpty')?.classList.add('hidden');
      } else {
        genreList.innerHTML = '';
        $('#genreEmpty')?.classList.remove('hidden');
      }
    }

    // Render Filter Dropdown
    const filterSelect = $('#genreFilter');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">All genres</option>' + uniqueGenres.map((item) => `
        <option value="${escapeHtml(item)}" ${item.toLowerCase() === genreParam.toLowerCase() ? 'selected' : ''}>
          ${escapeHtml(item)}
        </option>
      `).join('');

      filterSelect.onchange = () => {
        const val = filterSelect.value;
        if (val) {
          window.location.href = `genre.html?genre=${encodeURIComponent(val)}`;
        } else {
          window.location.href = 'index.html#allMovies';
        }
      };
    }

    attachWatchlistListeners(moviesMap);

  } catch (error) {
    console.error('Firestore catalog error:', error);
    $$('.empty-state, .empty').forEach((el) => {
      el.innerHTML = `
        <div class="empty-icon">⚠️</div>
        <h3>Catalog temporarily unavailable</h3>
        <p class="muted">Could not reach the database. Verify your internet connection or Firebase setup.</p>
        <button class="button secondary" onclick="location.reload()">Retry Connection</button>
      `;
      el.classList.remove('hidden');
    });
    if (trendingGrid) trendingGrid.innerHTML = '';
    if (newGrid) newGrid.innerHTML = '';
    if (allGrid) allGrid.innerHTML = '';
  }
}

// Hero Billboard Renderer
function renderHeroSpotlight(movies) {
  const heroElem = $('#heroSpotlight');
  if (!heroElem) return;

  const candidates = movies.filter(m => m.showTrending && m.posterUrl);
  const featured = candidates.length > 0 
    ? candidates[Math.floor(Math.random() * candidates.length)] 
    : movies[0];

  if (!featured) {
    heroElem.style.display = 'none';
    return;
  }

  const ratingNum = featured.rating ? Number(featured.rating).toFixed(1) : null;
  const inList = isInWatchlist(featured.id);

  heroElem.style.backgroundImage = `url("${escapeHtml(featured.posterUrl)}")`;
  heroElem.innerHTML = `
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="hero-badge-wrap">
        <span class="hero-badge">SPOTLIGHT</span>
        <span class="hero-quality-pill">4K ULTRA HD</span>
        ${ratingNum ? `<span class="hero-rating">★ ${ratingNum}</span>` : ''}
      </div>
      <h1 class="hero-title">${escapeHtml(featured.title || 'Featured Movie')}</h1>
      <div class="hero-meta">
        <span>${escapeHtml(featured.year || '')}</span>
        <span>•</span>
        <span>${escapeHtml(featured.genre || '')}</span>
      </div>
      <p class="hero-synopsis">${escapeHtml(featured.description || 'Stream now in cinematic quality on CineBhai.')}</p>
      <div class="hero-actions">
        <a class="button primary" href="watch.html?id=${encodeURIComponent(featured.id)}">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Watch Now
        </a>
        <a class="button secondary" href="movie.html?id=${encodeURIComponent(featured.id)}">
          Movie Details
        </a>
        <button class="button ghost" id="heroWatchlistBtn">
          ${inList ? '✓ In Watchlist' : '+ Add to Watchlist'}
        </button>
      </div>
    </div>
  `;

  const heroBtn = $('#heroWatchlistBtn');
  if (heroBtn) {
    heroBtn.onclick = () => {
      const nowInList = toggleWatchlist(featured);
      heroBtn.textContent = nowInList ? '✓ In Watchlist' : '+ Add to Watchlist';
      heroBtn.classList.toggle('primary', nowInList);
    };
  }
}

// Continue Watching Renderer
function renderContinueWatching() {
  const section = $('#continueSection');
  const grid = $('#continueGrid');
  if (!section || !grid) return;

  const history = getWatchHistory();
  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  grid.innerHTML = history.slice(0, 6).map(m => renderMovieCard(m, { showBadge: false })).join('');
}

initCatalog();
