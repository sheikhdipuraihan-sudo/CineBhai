import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const query = (params.get('q') || '').trim().toLowerCase();
const genre = params.get('genre') || '';
const isSearch = location.pathname.endsWith('search.html');
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function card(movie) { return `<a class="movie-card" href="movie.html?id=${encodeURIComponent(movie.id)}"><div class="poster"><img src="${esc(movie.posterUrl)}" alt="${esc(movie.title)} poster" loading="lazy">${movie.showTrending ? '<span class="badge">TRENDING</span>' : ''}</div><div class="card-copy"><h3>${esc(movie.title || 'Untitled')}</h3><p>${esc(movie.year || '')} · ${esc(movie.genre || '')} ${movie.rating ? `· ★ ${Number(movie.rating).toFixed(1)}` : ''}</p></div></a>`; }
function fill(id, list) { const element = $(id); if (element) element.innerHTML = list.map(card).join(''); }
function empty(id, show) { const element = $(id); if (element) element.classList.toggle('hidden', !show); }
try {
  const snapshot = await getDocs(collection(db, 'movies'));
  const movies = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const searchable = movies.filter((movie) => movie.showSearch !== false);
  const matched = (isSearch ? searchable : movies).filter((movie) => !query || `${movie.title} ${movie.genre} ${movie.description}`.toLowerCase().includes(query));
  const catalog = matched.filter((movie) => movie.showCatalog !== false);
  const trending = matched.filter((movie) => movie.showTrending === true).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const newest = [...catalog].sort((a, b) => (b.year || 0) - (a.year || 0));
  const genreCatalog = genre ? catalog.filter((movie) => String(movie.genre || '').split(',').map((item) => item.trim()).includes(genre)) : catalog;
  fill('#trendingGrid', trending); fill('#newGrid', newest.slice(0, 10)); fill('#allGrid', genreCatalog);
  empty('#trendingEmpty', trending.length > 0); empty('#newEmpty', newest.length > 0); empty('#allEmpty', genreCatalog.length > 0);
  const count = $('#trendingCount'); if (count) count.textContent = `${trending.length} title${trending.length === 1 ? '' : 's'}`;
  const genres = [...new Set(movies.flatMap((movie) => String(movie.genre || '').split(',').map((item) => item.trim()).filter(Boolean)))].sort();
  const genreList = $('#genreList'); if (genreList) genreList.innerHTML = genres.map((item) => `<a class="genre-link" href="genre.html?genre=${encodeURIComponent(item)}">${esc(item)} <span>→</span></a>`).join('');
  empty('#genreEmpty', genres.length > 0);
  const filter = $('#genreFilter'); if (filter) { filter.innerHTML = '<option value="">All genres</option>' + genres.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join(''); filter.value = genre; filter.addEventListener('change', () => { location.href = filter.value ? `genre.html?genre=${encodeURIComponent(filter.value)}` : 'index.html#movies'; }); }
  const input = $('#searchInput'); if (input && query) input.value = query;
} catch (error) { console.error(error); document.querySelectorAll('.empty').forEach((element) => { element.textContent = 'Catalog unavailable. Check Firebase setup.'; element.classList.remove('hidden'); }); }
const form = $('#searchForm'); if (form) form.addEventListener('submit', (event) => { event.preventDefault(); const value = $('#searchInput').value.trim(); location.href = value ? `search.html?q=${encodeURIComponent(value)}` : 'index.html#movies'; });
