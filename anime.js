let isSearchMode = false;
let searchQuery = "";
let currentType = "series";
let currentGenre = "action";
let currentPage = 1;
let currentCount = 15;
let currentPlayingAnimeId = "";
let currentPlayingEpsId = "";
let currentPlayingTitle = "";

async function searchAnime() {
    const input = document.getElementById("anime-search-input");
    const query = input.value.trim();
    if (!query) return;
    isSearchMode = true;
    searchQuery = query;
    currentPage = 1;
    fetchAnimeResults();
}

async function fetchAnimeResults() {
    const listContainer = document.getElementById("anime-list");
    const pageNum = document.getElementById("page-num");
    const pageTop = document.getElementById("page-info-top");
    const statusLabel = document.getElementById("list-status");
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px"><div class="loader" style="margin:auto"></div></div>';
    if (pageNum) pageNum.innerText = currentPage;
    if (pageTop) pageTop.innerText = "PAGE " + currentPage;

    if (statusLabel) {
        statusLabel.innerText = isSearchMode ? "SEARCH: " + searchQuery : `${currentType.toUpperCase()} | ${currentGenre.toUpperCase()}`;
    }

    let url = isSearchMode 
        ? `https://api.nekolabs.web.id/discovery/mobinime/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}`
        : `https://api.nekolabs.web.id/discovery/mobinime/anime-list?type=${currentType}&page=${currentPage}&count=${currentCount}&genre=${currentGenre}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const results = data.result;

        if (data.success && results && results.length > 0) {
            listContainer.innerHTML = results.map(anime => {
                const img = anime.imageCover || anime.image_cover;
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
        listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--error); padding:40px;">Koneksi Gagal.</p>';
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
        const res = await fetch(`https://api.nekolabs.web.id/discovery/mobinime/detail?animeId=${id}`);
        const data = await res.json();
        const info = data.result;
        header.innerHTML = `
            <img src="${info.image_cover}" class="detail-banner" style="width:100%; height:200px; object-fit:cover; border-radius:12px; margin-bottom:15px;">
            <h2 style="margin:0; font-size: 20px; color:var(--app-fg);">${info.title}</h2>
            <p style="color:var(--app-muted); font-size:12px; margin-top:5px;">${info.content ? info.content.substring(0,120)+'...' : ''}</p>
        `;
        epList.innerHTML = info.episodes.map(ep => `
            <div class="episode-item" onclick="playEpisodeMob('${info.id}', '${ep.id}', 'Eps ${ep.episode}')" style="padding:15px; background:var(--app-surface); border:1px solid var(--app-border); border-radius:12px; display:flex; justify-content:space-between; cursor:pointer; margin-bottom:8px;">
                <span style="font-weight:600; font-size:14px; color:var(--app-fg);">Episode ${ep.episode}</span>
                <span style="color:var(--app-accent); font-size:11px; font-weight:bold;">NONTON →</span>
            </div>`).join("");
    } catch (e) {
        alert("Gagal memuat detail");
    }
}

async function playEpisodeMob(aId, eId, title, quality = 'SD') {
    currentPlayingAnimeId = aId;
    currentPlayingEpsId = eId;
    currentPlayingTitle = title;

    const streamPage = document.getElementById("anime-stream-page");
    const video = document.getElementById("video-player");
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    streamPage.style.display = 'block';
    streamPage.classList.add('active');
    document.getElementById("stream-title").innerText = title;

    const lastTime = video.currentTime;
    video.pause();

    document.querySelectorAll('.quality-btn-full').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${quality.toLowerCase()}`);
    if (activeBtn) activeBtn.classList.add('active');

    try {
        const res = await fetch(`https://api.nekolabs.web.id/discovery/mobinime/stream?animeId=${aId}&epsId=${eId}&quality=${quality}`);
        const data = await res.json();
        if (data.success && data.result) {
            const url = data.result;
            
            if (url.includes(".m3u8")) {
                if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        if (lastTime > 0) video.currentTime = lastTime;
                        video.play();
                        enableFullscreenLandscape(video);
                    });
                } else { 
                    video.src = url; 
                    if (lastTime > 0) video.currentTime = lastTime;
                    video.play();
                    enableFullscreenLandscape(video);
                }
            } else { 
                video.src = url; 
                if (lastTime > 0) video.currentTime = lastTime;
                video.play();
                enableFullscreenLandscape(video);
            }
        }
    } catch (e) {
        alert("Gagal memuat player");
    }
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

function selectType(t) {
    currentType = t;
    currentPage = 1;
    isSearchMode = false;
    toggleGenreModal();
    fetchAnimeResults();
}

function selectGenre(g) {
    currentGenre = g;
    currentPage = 1;
    isSearchMode = false;
    toggleGenreModal();
    fetchAnimeResults();
}

function selectCount(n) {
    currentCount = n;
    currentPage = 1;
    isSearchMode = false;
    fetchAnimeResults();
}

function changePage(d) {
    if (currentPage + d < 1) return;
    currentPage += d;
    window.scrollTo({top: 0, behavior: 'smooth'});
    fetchAnimeResults();
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

function navToAnimeList() {
    isSearchMode = false;
    const nav = document.getElementById("bottom-nav");
    if (nav) nav.style.display = "flex";
    document.querySelectorAll('.page').forEach(p => {p.classList.remove('active'); p.style.display='none';});
    document.getElementById("anime-page").style.display='block';
    document.getElementById("anime-page").classList.add('active');
}

fetchAnimeResults();
