/**
 * ANIME.JS - Frontend Logic
 * Berjalan di sisi Browser, nembak ke http://localhost:3000
 */

const API_BASE = "http://localhost:3000";

let isSearchMode = false;
let searchQuery = "";
let currentType = "series";
let currentGenre = "";
let currentPage = 0; // Mobinime API biasanya 0-based index
let currentCount = 15;
let currentPlayingAnimeId = "";
let currentPlayingEpsId = "";
let currentPlayingTitle = "";

// --- CORE FUNCTIONS ---

async function searchAnime() {
    const input = document.getElementById("anime-search-input");
    const query = input.value.trim();
    if (!query) return;
    isSearchMode = true;
    searchQuery = query;
    currentPage = 0; 
    fetchAnimeResults();
}

async function fetchAnimeResults() {
    const listContainer = document.getElementById("anime-list");
    const pageNum = document.getElementById("page-num");
    const pageTop = document.getElementById("page-info-top");
    const statusLabel = document.getElementById("list-status");
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px"><div class="loader" style="margin:auto"></div></div>';
    
    const displayPage = Math.floor(currentPage / currentCount) + 1;
if (pageNum) pageNum.innerText = displayPage;
if (pageTop) pageTop.innerText = "PAGE " + displayPage;

    if (statusLabel) {
        statusLabel.innerText = isSearchMode ? "SEARCH: " + searchQuery : `${currentType.toUpperCase()} | ${currentGenre || 'LATEST'}`;
    }

    let url = isSearchMode 
        ? `${API_BASE}/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}`
        : `${API_BASE}/list?type=${currentType}&page=${currentPage}&count=${currentCount}&genre=${encodeURIComponent(currentGenre)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const results = data.result?.data || data.result;
        if (data.success && results && results.length > 0) {
            listContainer.innerHTML = results.map(anime => {
                const img = anime.image_cover || anime.imageCover;
                return `
                <div class="anime-card" onclick="viewAnimeDetailMob('${anime.id}')">
                    <div class="anime-badge">Eps ${anime.episode || '?'}</div>
                    <img src="${img}" alt="thumb" loading="lazy">
                    <div class="anime-title">${anime.title}</div>
                    <div style="font-size:10px; color:var(--app-accent); padding:0 10px 10px;">⭐ ${anime.rating || '0'} | ${anime.tahun || ''}</div>
                </div>`;
            }).join("");
        } else {
            listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--app-muted)">Tidak ditemukan.</p>';
        }
    } catch (e) {
        listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--error); padding:40px;">Gagal Konek ke Bridge API.</p>';
    }
}

async function viewAnimeDetailMob(id) {
    const detailPage = document.getElementById("anime-detail-page");
    const header = document.getElementById("detail-header-content");
    const epList = document.getElementById("episode-list");
    const nav = document.getElementById("bottom-nav");

    if (nav) nav.style.display = "none";
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    detailPage.style.display = 'block';
    setTimeout(() => detailPage.classList.add('active'), 50);

    try {
        const res = await fetch(`${API_BASE}/detail?id=${id}`);
        const data = await res.json();
        const info = data.result?.data || data.result;

        header.innerHTML = `
            <img src="${info.image_cover}" class="detail-banner" style="width:100%; height:200px; object-fit:cover; border-radius:12px; margin-bottom:15px;">
            <h2 style="margin:0; font-size: 20px; color:var(--app-fg);">${info.title}</h2>
            <p style="color:var(--app-muted); font-size:12px; margin-top:5px;">${info.content ? info.content.substring(0,150)+'...' : 'No description.'}</p>
        `;
        
        epList.innerHTML = info.episodes.map(ep => `
            <div class="episode-item" onclick="playEpisodeMob('${info.id}', '${ep.id}', 'Eps ${ep.episode}', 'HD', '${info.title.replace(/'/g, "\\'")}')" style="padding:15px; background:var(--app-surface); border:1px solid var(--app-border); border-radius:12px; display:flex; justify-content:space-between; cursor:pointer; margin-bottom:8px;">
                <span style="font-weight:600; font-size:14px; color:var(--app-fg);">Episode ${ep.episode}</span>
                <span style="color:var(--app-accent); font-size:11px; font-weight:bold;">NONTON →</span>
            </div>`).join("");
    } catch (e) {
        alert("Gagal memuat detail");
    }
}

async function playEpisodeMob(aId, eId, title, quality = 'HD', animeTitle = "") {
    currentPlayingAnimeId = aId;
    currentPlayingEpsId = eId;
    currentPlayingTitle = title;

    const streamPage = document.getElementById("anime-stream-page");
    const video = document.getElementById("video-player");
    const loading = document.getElementById("video-loading");

    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    streamPage.style.display = 'block';
    streamPage.classList.add('active');
    document.getElementById("stream-title").innerText = title;

    if(loading) loading.style.display = "flex";
    video.pause();

    try {
        const res = await fetch(`${API_BASE}/stream?id=${aId}&epsId=${eId}&quality=${quality}`);
        const data = await res.json();
        
        if (data.success && data.result) {
            if(animeTitle) updateSimpleStat(animeTitle);
            const url = data.result;
            
            const finalizeVideo = () => {
                video.play();
                if(loading) loading.style.display = "none";
                enableFullscreenLandscape(video);
            };

            if (url.includes(".m3u8")) {
                if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, finalizeVideo);
                } else { 
                    video.src = url; 
                    video.onloadedmetadata = finalizeVideo;
                }
            } else { 
                video.src = url; 
                video.onloadedmetadata = finalizeVideo;
            }
        }
    } catch (e) {
        if(loading) loading.style.display = "none";
        alert("Gagal memuat player");
    }
}

// --- UTILITIES (Stats, Profile, Nav) ---

function updateSimpleStat(title) {
    let total = parseInt(localStorage.getItem('total_viewed') || "0");
    total += 1;
    localStorage.setItem('total_viewed', total);
    localStorage.setItem('last_watch_title', title);
    renderSimpleStats();
}

function renderSimpleStats() {
    const totalEl = document.getElementById('stat-total-view');
    const lastEl = document.getElementById('stat-last-watch');
    if(totalEl) totalEl.innerText = localStorage.getItem('total_viewed') || "0";
    if(lastEl) lastEl.innerText = localStorage.getItem('last_watch_title') || "None";
}

function changePage(d) {
    // d bisa +1 (Next) atau -1 (Prev)
    // Kita kalikan d dengan currentCount (15) supaya loncatnya per rombongan
    const offsetChange = d * currentCount;
    const nextOffset = currentPage + offsetChange;

    // Cegah offset minus
    if (nextOffset < 0) return;

    // Update variable global
    currentPage = nextOffset;

    const listContainer = document.getElementById("anime-list");
    if (listContainer) listContainer.style.opacity = "0.5"; 

    window.scrollTo({ top: 0, behavior: 'smooth' });

    fetchAnimeResults().then(() => {
        if (listContainer) listContainer.style.opacity = "1";
    });
}


function selectGenre(g) {
    currentGenre = g.toLowerCase().trim().replace(/\s+/g, '-');
    currentPage = 0;
    isSearchMode = false;
    toggleGenreModal();
    fetchAnimeResults();
}

function selectCount(n) {
    currentCount = n;
    currentPage = 0; // Reset page karena jumlah per halaman berubah
    isSearchMode = false;
    // Kita gak tutup modal di sini biar user bisa ganti genre sekalian
    fetchAnimeResults(); 
}

function selectType(t) {
    currentType = t;
    currentPage = 0;
    currentGenre = ""; // Reset genre kalau ganti tipe (biar gak zonk)
    isSearchMode = false;
    fetchAnimeResults();
}


function navToAnimeList() {
    isSearchMode = false;
    const nav = document.getElementById("bottom-nav");
    if (nav) nav.style.display = "flex";
    document.querySelectorAll('.page').forEach(p => {p.classList.remove('active'); p.style.display='none';});
    document.getElementById("anime-page").style.display='block';
    document.getElementById("anime-page").classList.add('active');
}
function toggleGenreModal() {
    const m = document.getElementById("genre-modal");
    if (!m) return;
    if (m.style.display === "flex") {
        m.style.display = "none";
        m.classList.remove("active");
    } else {
        m.style.display = "flex";
        setTimeout(() => m.classList.add("active"), 10);
    }
}

function navToDetail() { 
    const v = document.getElementById("video-player"); 
    if(v){v.pause(); v.src="";} 
    document.querySelectorAll('.page').forEach(p => {p.classList.remove('active'); p.style.display='none';});
    document.getElementById("anime-detail-page").style.display='block';
    document.getElementById("anime-detail-page").classList.add('active');
}

// ... (Fungsi Upload Image, Fullscreen, Logout tetap sama) ...
function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const display = document.getElementById('profile-img-display');
            const placeholder = document.getElementById('profile-placeholder');
            if(display) { display.src = e.target.result; display.style.display = 'block'; }
            if(placeholder) placeholder.style.display = 'none';
            localStorage.setItem('user_profile_img', e.target.result);
            const miniAvatar = document.querySelector('.profile-avatar-home');
            if(miniAvatar) miniAvatar.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function loadUserProfile() {
    const savedImg = localStorage.getItem('user_profile_img');
    if (savedImg) {
        const display = document.getElementById('profile-img-display');
        const placeholder = document.getElementById('profile-placeholder');
        const miniAvatar = document.querySelector('.profile-avatar-home');
        if(display) { display.src = savedImg; display.style.display = 'block'; }
        if(placeholder) placeholder.style.display = 'none';
        if(miniAvatar) miniAvatar.src = savedImg;
    }
    renderSimpleStats();
}
function changeQuality(q) {
    playEpisodeMob(currentPlayingAnimeId, currentPlayingEpsId, currentPlayingTitle, q);
}

function enableFullscreenLandscape(videoElement) {
    videoElement.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(e => console.log("Rotate lock ignored"));
            }
        } else {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    });

    videoElement.addEventListener('play', () => {
        if (window.innerWidth < window.innerHeight) {
            console.log("Video playing, ready for landscape mode.");
        }
    }, { once: true });
}
loadUserProfile();
fetchAnimeResults();
