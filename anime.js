let isSearchMode = false;
let searchQuery = "";
let currentGenre = "action";
let currentPage = 1;

// Tambahkan alias fungsi agar script.js tidak error
function fetchAnime() {
    fetchAnimeResults();
}

async function searchAnime() {
    const input = document.getElementById("anime-search-input");
    const query = input.value.trim();
    if (!query) return;

    isSearchMode = true;
    searchQuery = query;
    currentPage = 1;

    const statusLabel = document.getElementById("list-status");
    if (statusLabel) statusLabel.innerText = "SEARCH: " + query.toUpperCase();
    fetchAnimeResults();
}

async function fetchAnimeResults() {
    const listContainer = document.getElementById("anime-list");
    const pageDisplay = document.getElementById("page-num");
    const prevBtn = document.getElementById("prev-btn");

    if (!listContainer) return;

    listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px"><div class="loader" style="margin:auto"></div></div>';
    
    if (pageDisplay) pageDisplay.innerText = currentPage;
    if (prevBtn) prevBtn.disabled = currentPage === 1;

    let url = isSearchMode 
        ? `https://api.nekolabs.web.id/discovery/animob/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}`
        : `https://api.nekolabs.web.id/discovery/animob/genre?genre=${currentGenre}&page=${currentPage}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.result.data && data.result.data.length > 0) {
            listContainer.innerHTML = data.result.data.map(anime => {
                const safeTitle = anime.title.replace(/'/g, "\\'");
                return `
                <div class="anime-card" onclick="viewAnimeDetail('${anime.data_id}', '${safeTitle}', '${anime.poster}')">
                    <div class="anime-badge">${anime.tvInfo.eps || anime.tvInfo.sub || 'EP'}</div>
                    <img src="${anime.poster}" alt="thumb" loading="lazy">
                    <div class="anime-title">${anime.title}</div>
                </div>
            `}).join("");
        } else {
            listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding:20px; color:var(--app-muted)">Anime tidak ditemukan.</p>';
        }
    } catch (error) {
        listContainer.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--error)">Gagal memuat data.</p>';
    }
}

async function viewAnimeDetail(animeId, title, poster) {
    const detailPage = document.getElementById("anime-detail-page");
    const headerContent = document.getElementById("detail-header-content");
    const epContainer = document.getElementById("episode-list");
    const nav = document.getElementById("bottom-nav");

    if (!detailPage || !headerContent || !epContainer) return;

    // Sembunyikan Navigasi & Tampilkan Detail
    if (nav) nav.style.display = "none";
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    detailPage.style.display = 'block';
    setTimeout(() => detailPage.classList.add('active'), 50);
    window.scrollTo(0, 0);

    headerContent.innerHTML = `
        <img src="${poster}" class="detail-banner" style="width:100%; height:200px; object-fit:cover; border-radius:12px; margin-bottom:15px;">
        <h2 id="current-anime-title" style="margin:0; font-size: 20px; color:var(--app-fg);">${title}</h2>
        <p style="color:var(--app-muted); font-size:12px; margin-top:5px;">ID: ${animeId}</p>
    `;

    epContainer.innerHTML = '<div style="text-align:center; padding:50px;"><div class="loader" style="margin:auto"></div><p>Memuat Episode...</p></div>';

    try {
        const response = await fetch(`https://api.nekolabs.web.id/discovery/animob/detail?animeId=${encodeURIComponent(animeId)}`);
        const data = await response.json();

        if (data.success && data.result.episodes) {
            epContainer.innerHTML = data.result.episodes.map(ep => {
                const safeEpTitle = ep.title.replace(/'/g, "\\'");
                return `
                <div class="episode-item" onclick="playEpisode('${ep.id}', '${safeEpTitle}')" style="margin-bottom:10px; padding:15px; background:var(--app-surface); border:1px solid var(--app-border); border-radius:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                    <div style="font-weight:600; font-size:14px; color:var(--app-fg);">${ep.title}</div>
                    <div style="font-size:11px; color:var(--app-accent); font-weight:bold;">NONTON →</div>
                </div>`;
            }).join("");
        }
    } catch (error) {
        epContainer.innerHTML = '<p style="text-align:center; color:var(--error); padding:20px;">Gagal memuat episode.</p>';
    }
}

async function playEpisode(epsId, epTitle) {
    const video = document.getElementById("video-player");
    const titleDisp = document.getElementById("stream-title");
    const logStatus = document.getElementById("video-log-status");
    const nav = document.getElementById("bottom-nav");

    // Fungsi pembantu buat nulis log
    const writeLog = (msg, isError = false) => {
        const time = new Date().toLocaleTimeString();
        logStatus.innerHTML += `<div style="color:${isError ? '#ff4444' : '#00ff00'}">[${time}] ${msg}</div>`;
        logStatus.scrollTop = logStatus.scrollHeight;
    };

    if (nav) nav.style.display = "none";
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    document.getElementById("anime-stream-page").style.display = 'block';
    document.getElementById("anime-stream-page").classList.add('active');
    
    logStatus.innerHTML = ""; // Reset log
    writeLog("Memulai request ke API...");

    try {
        const response = await fetch(`https://api.nekolabs.web.id/discovery/animob/episode?epsId=${encodeURIComponent(epsId)}`);
        const data = await response.json();
        
        if (data.success && data.result?.streamingLink) {
            const m3u8Url = data.result.streamingLink;
            writeLog("Link M3U8 didapat. Mencoba memuat manifest...");
            titleDisp.innerText = epTitle;

            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                const hls = new Hls({
                    debug: false,
                    enableWorker: true
                });

                hls.loadSource(m3u8Url);
                hls.attachMedia(video);

                // Log Event HLS
                hls.on(Hls.Events.MANIFEST_LOADED, () => writeLog("Manifest berhasil dimuat."));
                hls.on(Hls.Events.LEVEL_LOADED, () => writeLog("Kualitas video terdeteksi."));
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    writeLog("Memulai pemutaran otomatis...");
                    video.play().catch(e => writeLog("Autoplay dicegah browser, silakan klik play manual.", true));
                });

                // TAMPILKAN ERROR KE LOG
                hls.on(Hls.Events.ERROR, function (event, data) {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                writeLog(`ERROR JARINGAN: ${data.details} (Mungkin diblokir/403)`, true);
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                writeLog("ERROR MEDIA: File rusak atau tidak support.", true);
                                break;
                            default:
                                writeLog(`ERROR FATAL: ${data.details}`, true);
                                break;
                        }
                    } else {
                        writeLog(`Warning: ${data.details}`);
                    }
                });

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                writeLog("Menggunakan Native Player (Safari/iOS)...");
                video.src = m3u8Url;
                video.play();
            }
        } else {
            writeLog("Gagal: API tidak memberikan link streaming.", true);
        }
    } catch (e) {
        writeLog("Gagal: Terjadi kesalahan pada script/koneksi.", true);
    }
}


function navToDetail() {
    const video = document.getElementById("video-player");
    const nav = document.getElementById("bottom-nav");
    if (video) { video.pause(); video.src = ""; }
    if (nav) nav.style.display = "none"; // Tetap sembunyi di detail
    
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    const target = document.getElementById("anime-detail-page");
    target.style.display = 'block';
    target.classList.add('active');
}

function navToAnimeList() {
    const nav = document.getElementById("bottom-nav");
    if (nav) nav.style.display = "flex"; // Munculkan kembali nav saat ke list utama
    
    document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    const target = document.getElementById("anime-page");
    target.style.display = 'block';
    target.classList.add('active');
}

function toggleGenreModal() {
    const modal = document.getElementById("genre-modal");
    if(modal) modal.classList.toggle("active");
}

function selectGenre(genre) {
    isSearchMode = false;
    currentGenre = genre;
    currentPage = 1;
    fetchAnimeResults();
    toggleGenreModal();
}

function changePage(dir) {
    if (currentPage + dir < 1) return;
    currentPage += dir;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchAnimeResults();
}

// Jalankan inisialisasi
fetchAnimeResults();
