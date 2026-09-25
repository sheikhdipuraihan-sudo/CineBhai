import { 
  renderHeader, 
  renderFooter, 
  renderMovieCard, 
  attachWatchlistListeners, 
  getWatchlist, 
  showToast 
} from './shared.js';

renderHeader('watchlist');
renderFooter();

const grid = document.getElementById('watchlistGrid');
const emptyState = document.getElementById('watchlistEmpty');
const clearBtn = document.getElementById('clearWatchlistBtn');

function loadWatchlist() {
  const list = getWatchlist();
  
  if (list.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    clearBtn.style.display = 'none';
    return;
  }

  emptyState.classList.add('hidden');
  clearBtn.style.display = 'inline-flex';
  
  grid.innerHTML = list.map(m => renderMovieCard(m, { showBadge: false })).join('');

  const map = new Map();
  list.forEach(m => map.set(m.id, m));
  attachWatchlistListeners(map);
}

clearBtn.onclick = () => {
  if (confirm('Clear all saved movies from your watchlist?')) {
    localStorage.removeItem('cinebhai_watchlist');
    window.dispatchEvent(new CustomEvent('watchlistUpdated'));
    showToast('Watchlist cleared', 'info');
    loadWatchlist();
  }
};

window.addEventListener('watchlistUpdated', loadWatchlist);

loadWatchlist();
