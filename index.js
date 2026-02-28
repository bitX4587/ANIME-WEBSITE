// ══════════════════════════════════════════════════════════════════
//  utils.js  –  Shared utilities
//  APIs:
//    • Jikan (MyAnimeList)  → https://api.jikan.moe/v4
//    • HiAnime              → https://api.hianime.to   (aniwatch v2)
//    • MangaHook            → configure MANGA_BASE below (self-hosted)
// ══════════════════════════════════════════════════════════════════

// ── API Base URLs ────────────────────────────────────────────────
const JIKAN_BASE = "https://api.jikan.moe/v4";
const HIANIME_BASE = "#"; // public instance
const MANGA_BASE = "#"; // ← change to your deployed MangaHook URL

// ══════════════════════════════════════════════════════════════════
//  SECTION 1 – JIKAN (MyAnimeList metadata)
// ══════════════════════════════════════════════════════════════════

/**
 * Build an anime card HTML string from a Jikan anime object.
 * Clicking navigates to watch.html with the MAL ID.
 */
function buildCard(anime, index = 0) {
  const title = anime.title || "Unknown";
  const score = anime.score ? `★ ${anime.score}` : "";
  const episodes = anime.episodes ? `${anime.episodes} eps` : anime.type || "";
  const img =
    anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "";
  const malId = anime.mal_id;

  return `
    <div class="anime-card" style="animation-delay:${index * 0.04}s" onclick="goWatch(${malId})">
      <img class="anime-card-img" src="${img}" alt="${title}" loading="lazy"
           onerror="this.src='https://placehold.co/300x420/1a1a26/888?text=No+Image'"/>
      ${score ? `<div class="anime-card-score">${score}</div>` : ""}
      <div class="anime-card-play">▶</div>
      <div class="anime-card-overlay">
        <div class="anime-card-title">${title}</div>
        ${episodes ? `<div class="anime-card-meta">${episodes}</div>` : ""}
      </div>
    </div>
  `;
}

/** Navigate to the watch page */
function goWatch(malId, ep = 1) {
  window.location.href = `watch.html?id=${malId}&ep=${ep}`;
}

/** Navigate to the manga reader page */
function goManga(mangaId) {
  window.location.href = `manga.html?id=${encodeURIComponent(mangaId)}`;
}

/**
 * Load a Jikan section into a container element.
 * @param {string} url         - Full Jikan endpoint URL
 * @param {string} containerId - ID of the target DOM element
 */
async function loadSection(url, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const res = await fetch(url);
    const data = await res.json();
    container.innerHTML = "";
    data.data.forEach((anime, i) => {
      container.insertAdjacentHTML("beforeend", buildCard(anime, i));
    });
  } catch (e) {
    if (container)
      container.innerHTML =
        '<p style="color:var(--muted);font-size:14px">Failed to load.</p>';
  }
}

// ══════════════════════════════════════════════════════════════════
//  SECTION 2 – HIANIME API
//  Docs: https://github.com/ghoshRitesh12/aniwatch-api
//  All endpoints are GET and return { success, data }
// ══════════════════════════════════════════════════════════════════

const HiAnime = {
  /**
   * Search HiAnime for an anime by name.
   * Returns { animes: [...], totalPages, hasNextPage }
   *
   * @example
   * const { animes } = await HiAnime.search('Naruto', 1);
   */
  async search(query, page = 1) {
    const url = `${HIANIME_BASE}/api/v2/hianime/search?q=${encodeURIComponent(query)}&page=${page}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error("HiAnime search failed");
    return json.data; // { animes, totalPages, hasNextPage }
  },

  /**
   * Get full anime info (title, poster, description, genres, etc.)
   * plus season/episode counts.
   *
   * @param {string} animeId  – HiAnime slug, e.g. "one-piece-100"
   * @example
   * const { anime } = await HiAnime.getInfo('death-note-60');
   */
  async getInfo(animeId) {
    const url = `${HIANIME_BASE}/api/v2/hianime/anime/${encodeURIComponent(animeId)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success)
      throw new Error(`HiAnime getInfo failed for "${animeId}"`);
    return json.data; // { anime, seasons, relatedAnimes, recommendedAnimes }
  },

  /**
   * Get the full episode list for an anime.
   * Returns { totalEpisodes, episodes: [{ number, title, episodeId, isFiller }] }
   *
   * @param {string} animeId  – HiAnime slug
   * @example
   * const { episodes } = await HiAnime.getEpisodes('death-note-60');
   */
  async getEpisodes(animeId) {
    const url = `${HIANIME_BASE}/api/v2/hianime/anime/${encodeURIComponent(animeId)}/episodes`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success)
      throw new Error(`HiAnime getEpisodes failed for "${animeId}"`);
    return json.data; // { totalEpisodes, episodes }
  },

  /**
   * Get streaming sources for a specific episode.
   * Returns { headers, sources: [{url, type, quality}], tracks (subtitles), intro, outro }
   *
   * @param {string} episodeId  – Full episode ID string, e.g. "death-note-60?ep=1234"
   * @param {string} [server]   – "hd-1" | "hd-2" | "megacd" (default "hd-1")
   * @param {string} [category] – "sub" | "dub" | "raw" (default "sub")
   *
   * @example
   * const src = await HiAnime.getSources('death-note-60?ep=1464');
   * // src.sources[0].url → m3u8 stream URL
   * // src.tracks        → subtitle/caption files
   */
  async getSources(episodeId, server = "hd-1", category = "sub") {
    const params = new URLSearchParams({
      animeEpisodeId: episodeId,
      server,
      category,
    });
    const url = `${HIANIME_BASE}/api/v2/hianime/episode/sources?${params}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success)
      throw new Error(`HiAnime getSources failed for "${episodeId}"`);
    return json.data; // { headers, sources, tracks, intro, outro, anilistID, malID }
  },

  /**
   * Get homepage data: spotlight, trending, top10, latest episodes, etc.
   * Useful for building a discover/home section.
   */
  async getHome() {
    const res = await fetch(`${HIANIME_BASE}/api/v2/hianime/home`);
    const json = await res.json();
    if (!json.success) throw new Error("HiAnime getHome failed");
    return json.data;
  },

  /**
   * Build a HiAnime anime card (uses HiAnime data shape, not Jikan).
   * Clicking navigates to watch.html with the HiAnime slug.
   *
   * @param {{ id, name, poster, episodes }} anime
   * @param {number} index
   */
  buildCard(anime, index = 0) {
    const title = anime.name || "Unknown";
    const img = anime.poster || "";
    const sub = anime.episodes?.sub ?? "";
    const dub = anime.episodes?.dub ?? "";
    const badge = sub ? `SUB ${sub}` : "";

    return `
      <div class="anime-card" style="animation-delay:${index * 0.04}s"
           onclick="window.location.href='watch.html?hiid=${encodeURIComponent(anime.id)}&ep=1'">
        <img class="anime-card-img" src="${img}" alt="${title}" loading="lazy"
             onerror="this.src='https://placehold.co/300x420/1a1a26/888?text=No+Image'"/>
        ${badge ? `<div class="anime-card-score">${badge}</div>` : ""}
        <div class="anime-card-play">▶</div>
        <div class="anime-card-overlay">
          <div class="anime-card-title">${title}</div>
          ${dub ? `<div class="anime-card-meta">DUB ${dub}</div>` : ""}
        </div>
      </div>
    `;
  },
};

// ══════════════════════════════════════════════════════════════════
//  SECTION 3 – MANGAHOOK API
//  Docs: https://mangahook-api.vercel.app
//  Self-hosted — set MANGA_BASE to your instance URL
// ══════════════════════════════════════════════════════════════════

const MangaHook = {
  /**
   * Fetch a paginated manga list.
   * @param {number} [page=1]
   * @param {string} [type="newest"] – "newest" | "topview" | "newest" | genre id
   * @param {string} [state=""]      – "" | "Completed" | "Ongoing"
   * @param {string} [category="all"]
   *
   * @returns {{ mangaList, metaData }}
   * @example
   * const { mangaList } = await MangaHook.getList(1, 'newest');
   */
  async getList(page = 1, type = "newest", state = "", category = "all") {
    const params = new URLSearchParams({ page, type, state, category });
    const res = await fetch(`${MANGA_BASE}/api/mangaList?${params}`);
    const data = await res.json();
    return data; // { mangaList, metaData }
  },

  /**
   * Fetch details + chapter list for a single manga.
   * @param {string} mangaId  – e.g. "1manga-oa952283"
   *
   * @returns {{ manga, chapterList }}
   * manga has: { id, title, image, authors, genres, status, description }
   * chapterList: [{ id, title, uploadedDate }]
   *
   * @example
   * const { manga, chapterList } = await MangaHook.getManga('1manga-oa952283');
   */
  async getManga(mangaId) {
    const res = await fetch(
      `${MANGA_BASE}/api/mangaList/${encodeURIComponent(mangaId)}`,
    );
    const data = await res.json();
    return data; // { manga, chapterList }
  },

  /**
   * Fetch all page images for a chapter.
   * @param {string} mangaId   – e.g. "1manga-oa952283"
   * @param {string} chapterId – e.g. "chapter-139"
   *
   * @returns {{ chapterImages: string[], chapterInfo }}
   * chapterImages → array of image URLs (serve via proxy for CORS)
   *
   * @example
   * const { chapterImages } = await MangaHook.getChapter('1manga-oa952283', 'chapter-139');
   */
  async getChapter(mangaId, chapterId) {
    const res = await fetch(
      `${MANGA_BASE}/api/mangaList/${encodeURIComponent(mangaId)}/${encodeURIComponent(chapterId)}`,
    );
    const data = await res.json();
    return data; // { chapterImages, chapterInfo }
  },

  /**
   * Search manga by keyword.
   * @param {string} query
   * @param {number} [page=1]
   *
   * @returns {{ mangaList, metaData }}
   *
   * @example
   * const { mangaList } = await MangaHook.search('One Piece');
   */
  async search(query, page = 1) {
    const res = await fetch(
      `${MANGA_BASE}/api/search/${encodeURIComponent(query)}?page=${page}`,
    );
    const data = await res.json();
    return data; // { mangaList, metaData }
  },

  /**
   * Build a manga card HTML string.
   * Clicking navigates to manga.html with the manga ID.
   *
   * @param {{ id, title, image, chapter, view }} manga
   * @param {number} index
   */
  buildCard(manga, index = 0) {
    const title = manga.title || "Unknown";
    const img = manga.image || "";
    const chapter = manga.chapter || "";
    const views = manga.view ? `👁 ${manga.view}` : "";

    return `
      <div class="manga-card" style="animation-delay:${index * 0.04}s"
           onclick="goManga('${manga.id}')">
        <img class="manga-card-img" src="${img}" alt="${title}" loading="lazy"
             onerror="this.src='https://placehold.co/300x420/1a1a26/888?text=No+Image'"/>
        <div class="manga-card-overlay">
          <div class="manga-card-title">${title}</div>
          ${chapter ? `<div class="manga-card-meta">${chapter.replace(/-/g, " ")}</div>` : ""}
          ${views ? `<div class="manga-card-views">${views}</div>` : ""}
        </div>
      </div>
    `;
  },
};

// ══════════════════════════════════════════════════════════════════
//  SECTION 4 – SHARED UI UTILITIES
// ══════════════════════════════════════════════════════════════════

/** Navigate to navbar search results */
function navSearchGo(e) {
  if (e.key !== "Enter") return;
  const val = document.getElementById("navSearch")?.value?.trim();
  if (val) window.location.href = `search.html?q=${encodeURIComponent(val)}`;
}

/** Toggle mobile menu */
function toggleMenu() {
  document.getElementById("mobileMenu")?.classList.toggle("open");
}

/** Toast notification */
let _toastTimer;
function showToast(msg, duration = 2500) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("show"), duration);
}

/** Close mobile menu on outside click */
document.addEventListener("click", (e) => {
  const menu = document.getElementById("mobileMenu");
  const ham = document.querySelector(".hamburger");
  if (
    menu?.classList.contains("open") &&
    !menu.contains(e.target) &&
    !ham?.contains(e.target)
  ) {
    menu.classList.remove("open");
  }
});

// Export for module environments (optional – safe to ignore in plain HTML)
if (typeof module !== "undefined") {
  module.exports = {
    HiAnime,
    MangaHook,
    buildCard,
    goWatch,
    goManga,
    loadSection,
    showToast,
  };
}
