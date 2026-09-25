/**
 * CineBhai Shared Core Utilities & UI Components
 * Features: Raycast-style Spotlight Search Modal, Watchlist, Continue Watching,
 * 3D Tilt Cards, Smart Stream Resolver with Ambilight, and Mobile Bottom Bar.
 */

// XSS Sanitizer
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Watchlist (Local Storage)
const WATCHLIST_KEY = 'cinebhai_watchlist';

export function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  } catch {
    return [];
  }
}

export function isInWatchlist(movieId) {
  const list = getWatchlist();
  return list.some(item => item.id === movieId);
}

export function toggleWatchlist(movie) {
  let list = getWatchlist();
  const exists = list.some(item => item.id === movie.id);
  if (exists) {
    list = list.filter(item => item.id !== movie.id);
    showToast(`Removed "${movie.title}" from Watchlist`, 'info');
  } else {
    list.unshift({
      id: movie.id,
      title: movie.title || 'Untitled',
      year: movie.year || '',
      genre: movie.genre || '',
      rating: movie.rating || null,
      posterUrl: movie.posterUrl || '',
      savedAt: Date.now()
    });
    showToast(`Added "${movie.title}" to Watchlist!`, 'success');
  }
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('LocalStorage write failed:', err);
  }
  window.dispatchEvent(new CustomEvent('watchlistUpdated', { detail: { movieId: movie.id, exists: !exists } }));
  return !exists;
}

// Watch History / Continue Watching
const HISTORY_KEY = 'cinebhai_watch_history';

export function getWatchHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function recordWatchHistory(movie) {
  if (!movie || !movie.id) return;
  let history = getWatchHistory().filter(item => item.id !== movie.id);
  history.unshift({
    id: movie.id,
    title: movie.title || 'Untitled',
    year: movie.year || '',
    genre: movie.genre || '',
    rating: movie.rating || null,
    posterUrl: movie.posterUrl || '',
    watchedAt: Date.now()
  });
  history = history.slice(0, 15);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Watch history write failed:', err);
  }
}

// Smart Stream & Embed Resolver with Ambilight Support
export function resolveStreamingMedia(rawCode, title = 'Movie Player') {
  const code = String(rawCode || '').trim();

  if (!code) {
    return {
      type: 'empty',
      html: '<div class="empty-state"><p>No video source or stream available for this title.</p></div>'
    };
  }

  // Direct video file (.mp4, .webm, .m3u8)
  const isDirectVideo = /\.(mp4|webm|ogv|mkv|m3u8)(\?.*)?$/i.test(code);
  if (isDirectVideo) {
    return {
      type: 'video',
      html: `
        <video 
          class="cinema-video-element" 
          controls 
          autoplay 
          playsinline 
          preload="metadata"
        >
          <source src="${escapeHtml(code)}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `
    };
  }

  let embedUrl = code;

  // If user pasted an <iframe> code, extract src
  const iframeSrcMatch = code.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch) {
    embedUrl = iframeSrcMatch[1];
  }

  // YouTube URL transformations
  const ytWatchMatch = embedUrl.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytWatchMatch) {
    const videoId = ytWatchMatch[1];
    embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  }

  // Vimeo
  const vimeoMatch = embedUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch) {
    embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  // Dailymotion
  const dmMatch = embedUrl.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i);
  if (dmMatch) {
    embedUrl = `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1`;
  }

  // Google Drive preview
  const gDriveMatch = embedUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch) {
    embedUrl = `https://drive.google.com/file/d/${gDriveMatch[1]}/preview`;
  }

  return {
    type: 'iframe',
    html: `
      <iframe 
        src="${escapeHtml(embedUrl)}" 
        title="${escapeHtml(title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen
        loading="eager"
      ></iframe>
    `
  };
}

// Toast Notifications System
export function showToast(message, type = 'info') {
  let container = document.getElementById('cinebhai-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cinebhai-toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Standardized Movie Card Builder with Quality Tag & Rating
export function renderMovieCard(movie, { showBadge = true } = {}) {
  const inList = isInWatchlist(movie.id);
  const ratingNum = movie.rating ? Number(movie.rating).toFixed(1) : null;
  const ratingClass = ratingNum >= 8 ? 'rating-high' : ratingNum >= 6 ? 'rating-mid' : 'rating-low';

  return `
    <article class="movie-card" data-id="${escapeHtml(movie.id)}">
      <div class="poster-container">
        <a href="movie.html?id=${encodeURIComponent(movie.id)}" class="poster-link" aria-label="View details for ${escapeHtml(movie.title)}">
          <div class="poster-wrapper">
            <img 
              src="${escapeHtml(movie.posterUrl || '')}" 
              alt="${escapeHtml(movie.title || 'Movie')} Poster" 
              loading="lazy" 
              onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'450\\' viewBox=\\'0 0 300 450\\'%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' fill=\\'%2312121e\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' fill=\\'%23555566\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-family=\\'sans-serif\\' font-size=\\'13\\'%3ENo Poster%3C/text%3E%3C/svg%3E';"
            >
            <div class="poster-overlay">
              <span class="play-btn-circle" title="Play">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </span>
            </div>
          </div>
        </a>

        ${showBadge && movie.showTrending ? '<span class="badge badge-trending">🔥 TRENDING</span>' : ''}
        ${ratingNum ? `<span class="badge-rating ${ratingClass}">★ ${ratingNum}</span>` : ''}

        <button 
          class="btn-watchlist-toggle ${inList ? 'in-watchlist' : ''}" 
          data-watchlist-id="${escapeHtml(movie.id)}" 
          title="${inList ? 'Remove from Watchlist' : 'Add to Watchlist'}"
          aria-label="Toggle Watchlist"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

      <div class="card-info">
        <h3 class="card-title">
          <a href="movie.html?id=${encodeURIComponent(movie.id)}" title="${escapeHtml(movie.title)}">
            ${escapeHtml(movie.title || 'Untitled')}
          </a>
        </h3>
        <div class="card-metadata">
          <span>${escapeHtml(movie.year || '—')}</span>
          <span class="meta-dot">•</span>
          <span>${escapeHtml(String(movie.genre || '').split(',')[0].trim() || 'Cinema')}</span>
        </div>
      </div>
    </article>
  `;
}

// Watchlist Listeners & 3D Tilt Init
export function attachWatchlistListeners(moviesMap = new Map()) {
  document.querySelectorAll('.btn-watchlist-toggle').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.watchlistId;
      const movie = moviesMap.get(id) || { id, title: 'Movie' };
      const nowInList = toggleWatchlist(movie);
      btn.classList.toggle('in-watchlist', nowInList);
      btn.title = nowInList ? 'Remove from Watchlist' : 'Add to Watchlist';
    };
  });
}

// Skeleton Placeholders Generator
export function renderSkeletons(count = 8) {
  let items = '';
  for (let i = 0; i < count; i++) {
    items += `
      <div class="skeleton-card">
        <div class="skeleton-poster skeleton-shimmer"></div>
        <div class="skeleton-info">
          <div class="skeleton-line skeleton-shimmer" style="width: 80%"></div>
          <div class="skeleton-line skeleton-shimmer" style="width: 50%"></div>
        </div>
      </div>
    `;
  }
  return items;
}

// Standard Dynamic Header with Spotlight Search Modal trigger
export function renderHeader(activePage = '') {
  const headerElem = document.querySelector('.site-header');
  if (!headerElem) return;

  const watchlistCount = getWatchlist().length;

  headerElem.innerHTML = `
    <div class="header-inner">
      <a class="brand" href="index.html" aria-label="CineBhai Home">
        <span class="brand-badge">CB</span>
        <span class="brand-text">Cine<span class="brand-accent">Bhai</span></span>
      </a>

      <button class="mobile-menu-btn" aria-label="Toggle navigation menu" id="mobileMenuBtn">
        <span></span><span></span><span></span>
      </button>

      <nav class="nav-menu" id="navMenu">
        <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Home</a>
        <a href="trending.html" class="${activePage === 'trending' ? 'active' : ''}">Trending</a>
        <a href="new.html" class="${activePage === 'new' ? 'active' : ''}">New Releases</a>
        <a href="genres.html" class="${activePage === 'genres' ? 'active' : ''}">Genres</a>
        <a href="watchlist.html" class="nav-watchlist ${activePage === 'watchlist' ? 'active' : ''}">
          My Watchlist
          <span class="watchlist-pill-count" id="headerWatchlistCount" style="${watchlistCount > 0 ? '' : 'display:none'}">${watchlistCount}</span>
        </a>
      </nav>

      <div class="header-actions">
        <button class="header-search-trigger" id="openSearchModalBtn" aria-label="Search movies">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <span>Search movies, genres...</span>
          <kbd class="kbd-shortcut">/</kbd>
        </button>
      </div>
    </div>
  `;

  // Render Spotlight Search Modal and Mobile Bottom Bar
  injectSpotlightSearchModal();
  injectMobileBottomBar(activePage);

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navMenu = document.getElementById('navMenu');
  if (mobileBtn && navMenu) {
    mobileBtn.onclick = () => {
      navMenu.classList.toggle('open');
    };
  }

  // Watchlist count auto-update listener
  window.addEventListener('watchlistUpdated', () => {
    const badge = document.getElementById('headerWatchlistCount');
    if (badge) {
      const count = getWatchlist().length;
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
  });
}

// Raycast-Style Spotlight Search Modal
function injectSpotlightSearchModal() {
  if (document.getElementById('searchModalBackdrop')) return;

  const modalHtml = `
    <div class="search-modal-backdrop" id="searchModalBackdrop">
      <div class="search-modal-panel">
        <div class="search-modal-input-wrap">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input 
            type="search" 
            id="spotlightSearchInput" 
            class="search-modal-input" 
            placeholder="Type movie title, genre, or keyword..."
            autocomplete="off"
          >
          <kbd class="kbd-shortcut" id="closeSearchModalKbd">ESC</kbd>
        </div>
        <div class="search-modal-results" id="spotlightSearchResults">
          <div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 14px;">
            Search across all movies in CineBhai...
          </div>
        </div>
        <div class="search-modal-footer">
          <span>Tip: Press <strong>ESC</strong> to dismiss</span>
          <span>Press <strong>Enter</strong> to open selected movie</span>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const backdrop = document.getElementById('searchModalBackdrop');
  const input = document.getElementById('spotlightSearchInput');
  const resultsContainer = document.getElementById('spotlightSearchResults');
  const triggerBtn = document.getElementById('openSearchModalBtn');

  function openModal() {
    backdrop.classList.add('open');
    input.value = '';
    input.focus();
  }

  function closeModal() {
    backdrop.classList.remove('open');
  }

  if (triggerBtn) triggerBtn.onclick = openModal;
  document.getElementById('closeSearchModalKbd')?.addEventListener('click', closeModal);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Global Keydown Handler: '/' or 'Ctrl+K' / 'Cmd+K'
  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && 
        document.activeElement.tagName !== 'INPUT' && 
        document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      openModal();
    }
    if (e.key === 'Escape' && backdrop.classList.contains('open')) {
      closeModal();
    }
  });

  // Live Instant Search In-Memory
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      resultsContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 14px;">Search across all movies in CineBhai...</div>';
      return;
    }

    // Read cached movies from window if available
    const list = window.__cinebhai_all_movies || [];
    const matches = list.filter(m => 
      `${m.title || ''} ${m.genre || ''} ${m.description || ''}`.toLowerCase().includes(q)
    ).slice(0, 8);

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 14px;">
          No movies found matching "${escapeHtml(q)}". <a href="search.html?q=${encodeURIComponent(q)}" style="color:var(--crimson-light); text-decoration:underline;">Full search &rarr;</a>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = matches.map((m, index) => `
      <a class="search-result-item ${index === 0 ? 'selected' : ''}" href="movie.html?id=${encodeURIComponent(m.id)}">
        <img class="search-result-thumb" src="${escapeHtml(m.posterUrl || '')}" alt="" onerror="this.src='';">
        <div class="search-result-info">
          <div class="search-result-title">${escapeHtml(m.title || 'Untitled')}</div>
          <div class="search-result-meta">${escapeHtml(m.year || '')} • ${escapeHtml(m.genre || '')} ${m.rating ? `• ★ ${Number(m.rating).toFixed(1)}` : ''}</div>
        </div>
        <span style="color: var(--crimson-light); font-size: 14px;">→</span>
      </a>
    `).join('');
  });
}

// Native Mobile App Bottom Navigation Bar
function injectMobileBottomBar(activePage = '') {
  if (document.getElementById('mobileBottomBar')) return;

  const barHtml = `
    <nav class="mobile-bottom-bar" id="mobileBottomBar">
      <a href="index.html" class="mobile-bar-link ${activePage === 'home' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        <span>Home</span>
      </a>
      <a href="trending.html" class="mobile-bar-link ${activePage === 'trending' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
        <span>Trending</span>
      </a>
      <button class="mobile-bar-link" id="mobileSearchTriggerBtn" style="background:none; border:none; cursor:pointer;">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <span>Search</span>
      </button>
      <a href="watchlist.html" class="mobile-bar-link ${activePage === 'watchlist' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        <span>Watchlist</span>
      </a>
    </nav>
  `;
  document.body.insertAdjacentHTML('beforeend', barHtml);

  document.getElementById('mobileSearchTriggerBtn')?.addEventListener('click', () => {
    document.getElementById('searchModalBackdrop')?.classList.add('open');
    document.getElementById('spotlightSearchInput')?.focus();
  });
}

// Standard Dynamic Footer
export function renderFooter() {
  const footerElem = document.querySelector('.site-footer');
  if (!footerElem) return;

  footerElem.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <a class="brand" href="index.html">
          <span class="brand-badge">CB</span>
          <span class="brand-text">Cine<span class="brand-accent">Bhai</span></span>
        </a>
        <p class="footer-tagline">Elite movie streaming, curated cinema library, and instant discovery.</p>
      </div>

      <div class="footer-links">
        <div class="footer-col">
          <h4>Explore</h4>
          <a href="index.html">Home</a>
          <a href="trending.html">Trending</a>
          <a href="new.html">New Releases</a>
          <a href="genres.html">All Genres</a>
        </div>
        <div class="footer-col">
          <h4>Personal Hub</h4>
          <a href="watchlist.html">My Watchlist</a>
          <a href="index.html#continueSection">Continue Watching</a>
        </div>
        <div class="footer-col">
          <h4>Admin & Tech</h4>
          <a href="admin.html" class="footer-admin-link">Admin Studio</a>
          <a href="https://github.com/sheikhdipuraihan-sudo/CineBhai" target="_blank" rel="noopener">GitHub Project</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© ${new Date().getFullYear()} CineBhai. Engineered with passion for world-class cinema.</p>
      <p class="footer-powered">Powered by Firebase Firestore & Vercel</p>
    </div>
  `;
}
