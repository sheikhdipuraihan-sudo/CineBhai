import { auth, db } from './firebase.js';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escapeHtml, showToast } from './shared.js';

const $ = (selector) => document.querySelector(selector);
const loginPanel = $('#loginPanel');
const dashboard = $('#dashboard');
const form = $('#movieForm');
const posterInput = $('#posterUrl');
const posterPreview = $('#livePosterPreview');
const tableSearch = $('#tableSearchInput');

let allMovies = [];

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginPanel.classList.add('hidden');
    dashboard.classList.remove('hidden');
    await loadMovies();
  } else {
    loginPanel.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
});

// Admin Sign In Handler
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorElem = $('#loginError');
  errorElem.textContent = '';
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast('Signed in successfully!', 'success');
  } catch (err) {
    errorElem.textContent = readableError(err);
  }
});

// Sign Out Handler
$('#logoutButton').addEventListener('click', async () => {
  await signOut(auth);
  showToast('Signed out of admin console', 'info');
});

// Live Poster Preview Synchronizer
posterInput.addEventListener('input', () => {
  const url = posterInput.value.trim();
  if (/^https?:\/\//i.test(url)) {
    posterPreview.src = url;
    posterPreview.onerror = () => {
      posterPreview.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='100%25' height='100%25' fill='%2314141e'/%3E%3Ctext x='50%25' y='50%25' fill='%23e50914' dominant-baseline='middle' text-anchor='middle' font-size='11'%3EInvalid Image URL%3C/text%3E%3C/svg%3E";
    };
  }
});

// Load Movies from Firestore
async function loadMovies() {
  try {
    const snapshot = await getDocs(collection(db, 'movies'));
    allMovies = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    updateMetrics();
    renderTableRows(allMovies);
  } catch (err) {
    console.error('Load movies error:', err);
    showToast(`Error loading library: ${readableError(err)}`, 'error');
  }
}

// Update Metric Cards
function updateMetrics() {
  $('#statTotal').textContent = allMovies.length;
  $('#statTrending').textContent = allMovies.filter(m => m.showTrending).length;
  $('#statCatalog').textContent = allMovies.filter(m => m.showCatalog !== false).length;

  const rated = allMovies.filter(m => Number(m.rating) > 0);
  if (rated.length > 0) {
    const avg = (rated.reduce((sum, m) => sum + Number(m.rating), 0) / rated.length).toFixed(1);
    $('#statRating').textContent = `★ ${avg}`;
  } else {
    $('#statRating').textContent = '—';
  }
}

// Render Database Table Rows
function renderTableRows(movies) {
  const tbody = $('#movieRows');
  if (movies.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No matching movies found in database.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = movies.map((movie) => {
    const sections = [
      movie.showTrending && '<span style="color:var(--crimson)">🔥 Trending</span>',
      movie.showCatalog !== false && '<span style="color:var(--green)">Catalog</span>',
      movie.showSearch !== false && '<span style="color:var(--blue)">Search</span>'
    ].filter(Boolean).join(', ') || '<span style="color:var(--text-dim)">Hidden</span>';

    return `
      <tr>
        <td>
          <div class="table-movie-cell">
            <img class="table-thumb" src="${escapeHtml(movie.posterUrl || '')}" alt="" onerror="this.src='';">
            <div>
              <strong style="color: #fff; display: block;">${escapeHtml(movie.title || 'Untitled')}</strong>
              <small class="muted" style="font-size: 11px;">ID: ${escapeHtml(movie.id)}</small>
            </div>
          </div>
        </td>
        <td>${escapeHtml(movie.year || '—')}</td>
        <td>${escapeHtml(movie.genre || '—')}</td>
        <td>${movie.rating ? `★ ${Number(movie.rating).toFixed(1)}` : '—'}</td>
        <td>${sections}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="button secondary" style="padding: 6px 12px; font-size: 12px;" data-edit="${movie.id}" type="button">Edit</button>
            <a class="button ghost" style="padding: 6px 12px; font-size: 12px;" href="watch.html?id=${encodeURIComponent(movie.id)}" target="_blank">Test</a>
            <button class="button danger" style="padding: 6px 12px; font-size: 12px;" data-delete="${movie.id}" type="button">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button triggers
  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.onclick = () => fillForm(allMovies.find(m => m.id === btn.dataset.edit));
  });

  tbody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.onclick = () => removeMovie(btn.dataset.delete);
  });
}

// Table Filter
tableSearch.addEventListener('input', () => {
  const q = tableSearch.value.trim().toLowerCase();
  const filtered = allMovies.filter(m => 
    `${m.title || ''} ${m.genre || ''} ${m.year || ''}`.toLowerCase().includes(q)
  );
  renderTableRows(filtered);
});

// Movie Form Submit (Add / Edit)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const saveBtn = $('#saveMovieBtn');
  const movieId = $('#movieId').value.trim();

  const movie = {
    title: $('#title').value.trim(),
    year: Number($('#year').value),
    genre: $('#genre').value.trim(),
    rating: $('#rating').value === '' ? null : Number($('#rating').value),
    description: $('#description').value.trim(),
    posterUrl: $('#posterUrl').value.trim(),
    embedCode: $('#embedCode').value.trim(),
    showTrending: $('#showTrending').checked,
    showCatalog: $('#showCatalog').checked,
    showSearch: $('#showSearch').checked,
    updatedAt: serverTimestamp()
  };

  const validationError = validateMovie(movie);
  if (validationError) {
    showFormMessage(validationError, true);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  showFormMessage('Saving movie to database...', false);

  try {
    if (movieId) {
      await setDoc(doc(db, 'movies', movieId), movie, { merge: true });
      showToast(`Updated "${movie.title}" successfully!`, 'success');
    } else {
      await addDoc(collection(db, 'movies'), { ...movie, createdAt: serverTimestamp() });
      showToast(`Published "${movie.title}" to CineBhai!`, 'success');
    }

    resetForm();
    await loadMovies();
    showFormMessage('Movie saved successfully.', false);
  } catch (err) {
    console.error('Save failed:', err);
    showFormMessage(`Save failed: ${readableError(err)}`, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = movieId ? 'Update Movie' : 'Save Movie';
  }
});

// Delete Movie
async function removeMovie(id) {
  const target = allMovies.find(m => m.id === id);
  const name = target ? target.title : 'this movie';

  if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

  try {
    await deleteDoc(doc(db, 'movies', id));
    showToast(`Deleted "${name}"`, 'info');
    await loadMovies();
  } catch (err) {
    showToast(`Delete failed: ${readableError(err)}`, 'error');
  }
}

// Fill Form for Editing
function fillForm(movie) {
  if (!movie) return;
  $('#formTitle').textContent = `Editing: ${movie.title}`;
  $('#saveMovieBtn').textContent = 'Update Movie';
  $('#movieId').value = movie.id;

  ['title', 'year', 'genre', 'rating', 'description', 'posterUrl', 'embedCode'].forEach((key) => {
    $(`#${key}`).value = movie[key] ?? '';
  });

  $('#showTrending').checked = Boolean(movie.showTrending);
  $('#showCatalog').checked = movie.showCatalog !== false;
  $('#showSearch').checked = movie.showSearch !== false;

  posterInput.dispatchEvent(new Event('input'));
  $('#cancelEdit').classList.remove('hidden');

  window.scrollTo({ top: $('#movieForm').offsetTop - 90, behavior: 'smooth' });
}

// Reset Form
function resetForm() {
  form.reset();
  $('#movieId').value = '';
  $('#formTitle').textContent = 'Add New Movie';
  $('#saveMovieBtn').textContent = 'Save Movie';
  $('#showCatalog').checked = true;
  $('#showSearch').checked = true;
  $('#cancelEdit').classList.add('hidden');
  posterPreview.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='100%25' height='100%25' fill='%2314141e'/%3E%3Ctext x='50%25' y='50%25' fill='%23555566' dominant-baseline='middle' text-anchor='middle' font-size='12'%3EImage Preview%3C/text%3E%3C/svg%3E";
}

$('#cancelEdit').addEventListener('click', resetForm);

// Helper Validator
function validateMovie(movie) {
  if (!movie.title || !movie.year || !movie.genre || !movie.description || !movie.posterUrl || !movie.embedCode) {
    return 'Please complete all required fields.';
  }
  if (!Number.isFinite(movie.year) || movie.year < 1888 || movie.year > 2100) {
    return 'Please enter a valid release year.';
  }
  if (!/^https?:\/\//i.test(movie.posterUrl)) {
    return 'Poster URL must be a valid HTTP/HTTPS link.';
  }
  return '';
}

function showFormMessage(msg, isError) {
  const elem = $('#formMessage');
  elem.textContent = msg;
  elem.style.color = isError ? 'var(--crimson)' : 'var(--text-muted)';
}

function readableError(error) {
  if (error?.code === 'permission-denied') return 'Permission denied. Ensure your Firestore rules are applied and you are signed in.';
  if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password') return 'Invalid email or password.';
  if (error?.code === 'auth/user-not-found') return 'No administrator account found with this email.';
  return error?.message || 'An unknown error occurred.';
}
