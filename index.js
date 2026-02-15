// ── Shared utility used by all pages ──

// Build an anime card HTML string
function buildCard(anime, index = 0) {
  const title    = anime.title || 'Unknown';
  const score    = anime.score ? `★ ${anime.score}` : '';
  const episodes = anime.episodes ? `${anime.episodes} eps` : anime.type || '';
  const img      = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
  const malId    = anime.mal_id;

  return `
    <div class="anime-card" style="animation-delay:${index * 0.04}s" onclick="goWatch(${malId})">
      <img class="anime-card-img" src="${img}" alt="${title}" loading="lazy"
           onerror="this.src='https://placehold.co/300x420/1a1a26/888?text=No+Image'"/>
      ${score ? `<div class="anime-card-score">${score}</div>` : ''}
      <div class="anime-card-play">▶</div>
      <div class="anime-card-overlay">
        <div class="anime-card-title">${title}</div>
        ${episodes ? `<div class="anime-card-meta">${episodes}</div>` : ''}
      </div>
    </div>
  `;
}

// Navigate to watch page
function goWatch(malId) {
  window.location.href = `watch.html?id=${malId}&ep=1`;
}

// Load a section (home page rows)
async function loadSection(url, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    container.innerHTML = '';
    data.data.forEach((anime, i) => {
      container.insertAdjacentHTML('beforeend', buildCard(anime, i));
    });
  } catch(e) {
    if (container) container.innerHTML = '<p style="color:var(--muted);font-size:14px">Failed to load.</p>';
  }
}

// Navbar search
function navSearchGo(e) {
  if (e.key !== 'Enter') return;
  const val = document.getElementById('navSearch')?.value?.trim();
  if (val) window.location.href = `search.html?q=${encodeURIComponent(val)}`;
}

// Mobile menu toggle
function toggleMenu() {
  document.getElementById('mobileMenu')?.classList.toggle('open');
}

// Toast notification
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// Close mobile menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('mobileMenu');
  const ham  = document.querySelector('.hamburger');
  if (menu?.classList.contains('open') && !menu.contains(e.target) && !ham?.contains(e.target)) {
    menu.classList.remove('open');
  }
});