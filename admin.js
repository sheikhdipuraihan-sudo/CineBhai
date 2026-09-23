import { auth, db } from './firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const $ = (selector) => document.querySelector(selector);
const loginPanel = $('#loginPanel');
const dashboard = $('#dashboard');
const form = $('#movieForm');
let movies = [];

onAuthStateChanged(auth, async (user) => {
  loginPanel.classList.toggle('hidden', Boolean(user));
  dashboard.classList.toggle('hidden', !user);
  if (user) await loadRows();
});

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = $('#loginError');
  error.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, $('#loginEmail').value.trim(), $('#loginPassword').value);
  } catch (err) {
    error.textContent = readableError(err);
  }
});

$('#logoutButton').addEventListener('click', () => signOut(auth));

async function loadRows() {
  try {
    const snapshot = await getDocs(collection(db, 'movies'));
    movies = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    $('#movieRows').innerHTML = movies.map((movie) => {
      const sections = [movie.showHero && 'Hero', movie.showTrending && 'Trending', movie.showCatalog !== false && 'Catalog', movie.showSearch !== false && 'Search'].filter(Boolean).join(', ');
      return `<tr><td>${escapeHtml(movie.title)}</td><td>${movie.year || ''}</td><td>${escapeHtml(movie.genre || '')}</td><td>${sections || 'Hidden'}</td><td><button class="table-action" data-edit="${movie.id}" type="button">Edit</button><button class="table-action danger" data-delete="${movie.id}" type="button">Delete</button></td></tr>`;
    }).join('');
    document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => fillForm(movies.find((movie) => movie.id === button.dataset.edit))));
    document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => removeMovie(button.dataset.delete)));
  } catch (err) {
    showFormMessage(`Could not load movies: ${readableError(err)}`, true);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const saveButton = form.querySelector('button[type="submit"]');
  const movieId = $('#movieId').value.trim();
  const movie = {
    title: $('#title').value.trim(),
    year: Number($('#year').value),
    genre: $('#genre').value.trim(),
    rating: $('#rating').value === '' ? null : Number($('#rating').value),
    description: $('#description').value.trim(),
    posterUrl: $('#posterUrl').value.trim(),
    embedCode: $('#embedCode').value.trim(),
    showHero: $('#showHero').checked,
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
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';
  showFormMessage('Saving movie...', false);
  try {
    if (movieId) await setDoc(doc(db, 'movies', movieId), movie, { merge: true });
    else await addDoc(collection(db, 'movies'), { ...movie, createdAt: serverTimestamp() });
    showFormMessage('Movie saved successfully.', false);
    resetForm();
    await loadRows();
  } catch (err) {
    showFormMessage(`Save failed: ${readableError(err)}`, true);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save movie';
  }
});

async function removeMovie(id) {
  if (!confirm('Delete this movie?')) return;
  try {
    await deleteDoc(doc(db, 'movies', id));
    await loadRows();
    showFormMessage('Movie deleted.', false);
  } catch (err) {
    showFormMessage(`Delete failed: ${readableError(err)}`, true);
  }
}

function fillForm(movie) {
  if (!movie) return;
  $('#movieId').value = movie.id;
  ['title', 'year', 'genre', 'rating', 'description', 'posterUrl', 'embedCode'].forEach((key) => { $(`#${key}`).value = movie[key] ?? ''; });
  $('#showHero').checked = Boolean(movie.showHero);
  $('#showTrending').checked = Boolean(movie.showTrending);
  $('#showCatalog').checked = movie.showCatalog !== false;
  $('#showSearch').checked = movie.showSearch !== false;
  $('#cancelEdit').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  $('#movieId').value = '';
  $('#showCatalog').checked = true;
  $('#showSearch').checked = true;
  $('#cancelEdit').classList.add('hidden');
}

$('#cancelEdit').addEventListener('click', resetForm);
function validateMovie(movie) {
  if (!movie.title || !movie.year || !movie.genre || !movie.description || !movie.posterUrl || !movie.embedCode) return 'Please complete all required movie fields.';
  if (!Number.isFinite(movie.year) || movie.year < 1900 || movie.year > 2100) return 'Enter a valid release year.';
  if (!/^https?:\/\//i.test(movie.posterUrl)) return 'Poster URL must start with http:// or https://.';
  return '';
}
function showFormMessage(message, isError) { const element = $('#formMessage'); element.textContent = message; element.classList.toggle('error', isError); }
function readableError(error) { if (error?.code === 'permission-denied') return 'Permission denied. Deploy firestore.rules and make sure you are signed in.'; if (error?.code === 'failed-precondition') return 'Firestore is not enabled for this Firebase project.'; return error?.message || 'Unknown Firebase error.'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;' }[character])); }
