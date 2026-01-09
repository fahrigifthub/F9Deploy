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
    const streamPage = document.getElementById("anime-stream-page");
    const video = document.getElementById("video-player");
    const titleDisp = document.getElementById("stream-title");
    const nav = document.getElementById("bottom-nav");

    if (!streamPage || !video) return;
    if (nav) nav.style.display = "none";

    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    streamPage.style.display = 'block';
    streamPage.classList.add('active');
    titleDisp.innerText = "Bypassing Security...";

    try {
        const response = await fetch(`https://api.nekolabs.web.id/discovery/animob/episode?epsId=${encodeURIComponent(epsId)}`);
        const data = await response.json();
        
        if (data.success && data.result?.streamingLink) {
            let m3u8Url = data.result.streamingLink;
            
            // GUNAKAN PROXY UNTUK MENEMBUS CLOUDFLARE
            // Kita bungkus link aslinya lewat m3u8.dev atau proxy lain
            const proxiedUrl = `https://worker-crimson-glade-52a0.neko-id.workers.dev/?url=${encodeURIComponent(m3u8Url)}`;

            titleDisp.innerText = epTitle;

            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                const hls = new Hls({
                    // Paksa header agar terlihat seperti akses resmi
                    xhrSetup: function(xhr, url) {
                        xhr.withCredentials = false;
                    }
                });
                hls.loadSource(m3u8Url); // Coba aslinya dulu
                hls.attachMedia(video);
                
                hls.on(Hls.Events.ERROR, function (event, data) {
                    if (data.fatal) {
                        console.log("Switching to Proxy Mode...");
                        hls.loadSource(proxiedUrl); // Kalau gagal (diblokir), pindah ke proxy
                    }
                });

                hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            } else {
                video.src = m3u8Url;
                video.play();
            }
        }
    } catch (e) {
        alert("Gagal memuat video.");
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
