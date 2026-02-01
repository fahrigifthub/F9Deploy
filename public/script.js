let studentDB = []; 
let userData = { nisn: "", nama: "", points: 0, completed: [], profilePic: "" };
let dataMateri = [];
let soalData = []; // Variabel penampung soal dari JSON
let currentSoalIdx = 0; // Penanda urutan soal
let streak = 0;

function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 2200); // Sesuai durasi transisi di CSS
    }
}

function showLoading() {
  const loader = document.getElementById("loading-overlay");
  if (loader) {
    loader.style.display = "flex"; loader.style.opacity = "1";
  }
}

async function loadDatabase() {
  try {
    const response = await fetch('database/login.json');
    studentDB = await response.json();
    hideLoading();
  } catch (error) {
    console.error("DB Load Error", error);
    hideLoading();
  }
}

async function loadSoalDatabase() {
  try {
    const response = await fetch('database/soal.json');
    soalData = await response.json();
    console.log("Database soal berhasil dimuat");
  } catch (error) {
    console.error("Gagal load soal.json:", error);
    soalData = [{q: "Gagal memuat soal. Cek database/soal.json", o: ["Error"], a: 0}];
  }
}

function renderQuiz() {
  const qElem = document.getElementById("qz-question");
  const oElem = document.getElementById("qz-options");
  const stepElem = document.getElementById("qz-step-text");
  const progressElem = document.getElementById("qz-progress-fill");

  if (!qElem || !oElem) return;

  if (soalData.length === 0) {
    qElem.innerText = "Memuat soal...";
    return;
  }

  // AMBIL DATA & VALIDASI
  let currentSoal = soalData[currentSoalIdx];

  // JIKA TERNYATA currentSoal ADALAH STRING (JSON Mentah), PARSE DULU
  if (typeof currentSoal === 'string') {
    try {
      currentSoal = JSON.parse(currentSoal);
    } catch (e) {
      console.error("Soal bukan objek valid:", currentSoal);
    }
  }
  
  // Update Top Bar
  if (stepElem) stepElem.innerText = `${currentSoalIdx + 1} / ${soalData.length}`;
  if (progressElem) {
    const percent = (currentSoalIdx / soalData.length) * 100;
    progressElem.style.width = percent + "%";
  }

  // RENDER PERTANYAAN (Pake properti .q)
  // Kita pastiin cuma nampilin properti q, bukan seluruh objek
  qElem.innerHTML = currentSoal.q || "Soal tidak terbaca";

  // RENDER PILIHAN JAWABAN
  if (currentSoal.o && Array.isArray(currentSoal.o)) {
    oElem.innerHTML = currentSoal.o.map((v, i) => `
      <button class="qz-opt qz-${i % 4}" onclick="checkAnswer(${i})">
          ${v}
      </button>`).join("");
  } else {
    oElem.innerHTML = "<p>Pilihan jawaban tidak ditemukan.</p>";
  }
  
  // Render MathJax (Pake Promise biar lebih stabil)
  if (window.MathJax) {
    MathJax.typesetPromise([qElem, oElem]).catch(err => console.log("MathJax Error:", err));
  }
}
function saveQuizProgress() {
    localStorage.setItem("quiz_current_idx", currentSoalIdx);
}

// Fungsi buat ngambil progress kuis (dipanggil pas init atau navTo soal)
function loadQuizProgress() {
    const savedIdx = localStorage.getItem("quiz_current_idx");
    if (savedIdx !== null) {
        currentSoalIdx = parseInt(savedIdx);
    } else {
        currentSoalIdx = 0;
    }
}

// Update fungsi checkAnswer buat nyimpen progress tiap kali jawab bener
function checkAnswer(i) {
    const currentSoal = soalData[currentSoalIdx];
    const overlay = document.getElementById("qz-feedback-overlay");
    const msg = document.getElementById("qz-feedback-msg");
    const sub = document.getElementById("qz-feedback-sub");
    const streakDisp = document.getElementById("qz-streak-val");

    if (!overlay) return;

    const isCorrect = (i === currentSoal.a);

    if (isCorrect) {
        streak++;
        userData.points += 100;
        msg.innerText = "MANTAP! 🔥";
        msg.style.color = "#23a55a"; // Discord Green
        sub.innerText = "Jawaban kamu benar. +100 Points";
        showPop("🔥 +100 Point!");
    } else {
        streak = 0;
        msg.innerText = "SALAH! 💀";
        msg.style.color = "#f23f43"; // Discord Red
        sub.innerText = "Kurang tepat, coba lagi ya!";
    }

    if (streakDisp) streakDisp.innerText = streak;
    overlay.style.display = "flex";
    updateStats();
}

// Update fungsi closeFeedback buat simpen progress sebelum lanjut
function closeFeedback() {
    const overlay = document.getElementById("qz-feedback-overlay");
    if (overlay) overlay.style.display = "none";

    currentSoalIdx++;
    
    // SIMPAN PROGRESS DI SINI
    saveQuizProgress();

    if (currentSoalIdx < soalData.length) {
        renderQuiz();
    } else {
        // Kalau udah tamat, reset progressnya biar bisa main lagi dari awal nanti
        localStorage.removeItem("quiz_current_idx");
        currentSoalIdx = 0;
        
        const qElem = document.getElementById("qz-question");
        const oElem = document.getElementById("qz-options");
        if (qElem) qElem.innerHTML = "🎉 SEMUA SOAL SELESAI!";
        if (oElem) oElem.innerHTML = `<button class='qz-tap-continue' onclick='navTo("home")' style="grid-column: span 2">Balik ke Home</button>`;
    }
}

async function checkAuth() {
  showLoading();
  if (studentDB.length === 0) await loadDatabase();
  const n = document.getElementById("nisn-input").value;
  const p = document.getElementById("pass-input").value;
  const user = studentDB.find(u => u.nisn === n && u.pass === p);
  
  setTimeout(() => {
    if (user) {
      userData.nisn = user.nisn;
      userData.nama = user.nama;
      userData.points = 0;
      userData.completed = [];
      // Ambil profilePic jika ada di login.json, jika tidak kosongkan dulu
      userData.profilePic = user.profilePic || ""; 
      
      localStorage.setItem("math_user", JSON.stringify(userData));
      init();
      hideLoading();
    } else {
      hideLoading();
      document.getElementById("auth-err").style.display = "block";
    }
  }, 800);
}

function init() {
  const saved = localStorage.getItem("math_user");
  if (!saved) return;
  const parsedData = JSON.parse(saved);
  if (!parsedData.nama) {
    localStorage.removeItem("math_user");
    location.reload();
    return;
  }
  userData = parsedData;
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("bottom-nav").style.display = "flex";
  document.getElementById("display-nisn").innerText = userData.nisn;
  document.getElementById("prof-nisn").innerText = userData.nama;
  const h = new Date().getHours();
  const sapa = h < 11 ? "Pagi" : h < 15 ? "Siang" : h < 19 ? "Sore" : "Malam";
  document.getElementById("greeting").innerText = `Selamat ${sapa}, ${userData.nama}! 🚀`;
  updateStats();
  displayProfilePicture(); 
  loadSoalDatabase(); // Panggil load soal saat init
  
  navTo('home', null, false); 
}

document.addEventListener('DOMContentLoaded', () => {
    // Listener untuk halaman Profil
    const profInput = document.getElementById('profile-img-input');
    if (profInput) {
        profInput.addEventListener('change', function() {
            previewEditImage(this); 
        });
    }

    // Listener untuk halaman Edit Profil
    const editInput = document.getElementById('edit-photo-input');
    if (editInput) {
        editInput.addEventListener('change', function() {
            previewEditImage(this);
        });
    }
});



function displayProfilePicture() {
    const imgDisplay = document.getElementById('profile-img-display');
    const homeAvatar = document.getElementById('home-avatar-display');
    const editPreview = document.getElementById('edit-avatar-preview');
    
    let targetSrc = "";

    // 1. Cek dulu ada gak foto di LocalStorage (Base64)
    if (userData.profilePic && userData.profilePic.startsWith('data:image')) {
        targetSrc = userData.profilePic;
    } 
    // 2. Kalo gak ada, coba cari di folder media (pake NISN)
    else if (userData.nisn) {
        const timestamp = new Date().getTime();
        targetSrc = `media/${userData.nisn}.jpg?t=${timestamp}`;
    } 
    // 3. Kalo zonk, pake avatar default
    else {
        targetSrc = "media/avatar.jpg";
    }

    const updateImg = (el) => {
        if (el) {
            el.src = targetSrc;
            // Kalo error (misal file media/1111.jpg gak ada), lari ke default
            el.onerror = () => { 
                if (el.src !== "media/avatar.jpg") {
                    el.src = "media/avatar.jpg"; 
                }
            };
        }
    };

    updateImg(imgDisplay);
    updateImg(homeAvatar);
    updateImg(editPreview);
}



function goToEditProfile() {
    document.getElementById('input-full-name').value = userData.nama || "";
    document.getElementById('input-full-nisn').value = userData.nisn || "";
    syncPreview();
    navTo('edit-profile-page');
}

function syncPreview() {
    const name = document.getElementById('input-full-name').value;
    const nisn = document.getElementById('input-full-nisn').value;
    if(document.getElementById('preview-name')) document.getElementById('preview-name').innerText = name || "User";
    if(document.getElementById('preview-tag')) document.getElementById('preview-tag').innerText = `math_pro#${nisn || '2026'}`;
}

function previewEditImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Update semua preview yang ada di layar
            const previewIds = ['edit-avatar-preview', 'profile-img-display', 'home-avatar-display'];
            previewIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.src = e.target.result;
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
}


function saveNewProfile() {
    const newName = document.getElementById('input-full-name').value;
    const newNisn = document.getElementById('input-full-nisn').value;
    
    // Cek input file dari halaman profil ATAU halaman edit
    const fileInputProfil = document.getElementById('profile-img-input');
    const fileInputEdit = document.getElementById('edit-photo-input');
    const fileToUpload = (fileInputEdit && fileInputEdit.files[0]) || (fileInputProfil && fileInputProfil.files[0]);

    if (!newName || !newNisn) {
        alert("⚠️ Nama dan NISN harus diisi!");
        return;
    }

    showLoading();

    // Jika ada foto baru yang dipilih
    if (fileToUpload) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // e.target.result isinya string Base64 dari foto
            userData.profilePic = e.target.result; 
            userData.nama = newName;
            userData.nisn = newNisn;
            
            finishSave();
        };
        reader.readAsDataURL(fileToUpload);
    } else {
        // Jika cuma ganti nama/nisn tanpa ganti foto
        userData.nama = newName;
        userData.nisn = newNisn;
        finishSave();
    }
}

// Fungsi pembantu biar gak ngetik ulang
function finishSave() {
    localStorage.setItem("math_user", JSON.stringify(userData));
    
    // Reset input file
    document.getElementById('profile-img-input').value = "";
    document.getElementById('edit-photo-input').value = "";

    // Refresh UI
    init();
    hideLoading();

    const toast = document.getElementById('save-toast');
    if(toast) {
        toast.classList.add('toast-active');
        setTimeout(() => {
            toast.classList.remove('toast-active');
            navTo('profil');
        }, 1500);
    } else {
        navTo('profil');
    }
}



function updateStats(){
  const expVal = document.getElementById("exp-val");
  if(expVal) expVal.innerText = userData.points;
  const profExp = document.getElementById("prof-exp");
  if(profExp) profExp.innerText = userData.points;
  const m1Badge = document.getElementById("m1-badge");
  if(m1Badge) m1Badge.innerText = userData.completed.includes("m1") ? "✅ Selesai" : "Belum Selesai";
  const pangkat = document.getElementById("pangkat");
  if(pangkat) pangkat.innerText = userData.points >= 500 ? "Master Matriks" : "Pemula";
  localStorage.setItem("math_user", JSON.stringify(userData));
}

async function loadMateri() {
  try {
    const response = await fetch('database/materi.json');
    dataMateri = await response.json();
    renderListMateri();
  } catch (error) {
    console.error("Gagal load materi:", error);
  }
}

function renderListMateri(){
  const container = document.getElementById("materi-list-container");
  if (!container) return;
  if (dataMateri.length === 0) {
    container.innerHTML = "<p style='text-align:center'>Loading docs...</p>";
    return;
  }
  container.innerHTML = dataMateri.map(m => `
    <div class="card" onclick="openDetail('${m.id}')" style="display:flex; align-items:center; gap:15px; cursor:pointer">
      <div class="icon-circle">${userData.completed.includes(m.id) ? '✅' : m.id.toUpperCase()}</div>
      <div style="flex:1"><b style="color:var(--app-fg)">${m.title}</b><br><small style="color:var(--app-muted)">${m.desc}</small></div>
      <div style="color:var(--app-muted)">➔</div>
    </div>`).join("");
}

function openDetail(id){
  const m=dataMateri.find(v=>v.id===id);
  document.getElementById("detail-content").innerHTML=`<div class="card"><h2 class="gradient-text">${m.title}</h2><div style="color:var(--app-fg); line-height:1.6">${m.content}</div></div>`;
  if(!userData.completed.includes(id)){
    userData.completed.push(id);
    userData.points+=50;
    showPop("🎉 +50 Point!");
    updateStats();
  }
  navTo("detail-materi");
  if(window.MathJax)MathJax.typeset();
}



// --- LANJUTAN KODE ASLI ---

const aiInput = document.getElementById("ai-input");
if (aiInput) {
    aiInput.addEventListener('focus', () => {
        document.body.classList.add('keyboard-open');
        setTimeout(() => {
            const box = document.getElementById("chat-box");
            if(box) box.scrollTop = box.scrollHeight;
        }, 100);
    });
    aiInput.addEventListener('blur', () => {
        document.body.classList.remove('keyboard-open');
    });
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
    const box = document.getElementById("chat-box");
    if(box) box.scrollTop = box.scrollHeight;
}

function copyText(btn, textId) {
    const el = document.getElementById(textId);
    const rawContent = el.getAttribute('data-raw');
    if (!rawContent) return;
    const cleanText = rawContent
        .replace(/\\\[/g, '$$$') 
        .replace(/\\\]/g, '$$$')
        .replace(/\\\(|\\\)/g, '$'); 
    navigator.clipboard.writeText(cleanText).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "Copied! ✅";
        btn.style.background = "#34a853";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = "var(--app-bg)";
        }, 2000);
    });
}

async function searchYT() {
    const q = document.getElementById('yt-input').value;
    const list = document.getElementById('yt-list');
    if(!q) return;

    list.innerHTML = '<div class="loader" style="margin:30px auto"></div>';

    try {
        // NEMBAK KE API BARU (FathurDevs)
        const res = await fetch(`https://fathurweb.qzz.io/api/search/youtube?q=${encodeURIComponent(q)}`);
        const json = await res.json();

        if(json.status && json.result) {
            list.innerHTML = '';
            json.result.forEach(v => {
                // Ambil Video ID dari link (https://youtube.com/watch?v=xxxxx)
                const vidId = v.link.split('v=')[1];
                
                const card = document.createElement('div');
                card.className = 'card';
                card.style = 'display:flex; gap:12px; padding:10px; align-items:center; cursor:pointer; background:var(--app-surface); border:1px solid var(--app-border)';
                
                // Pas diklik panggil fungsi play pake vidId yang baru dapet
                card.onclick = () => startPlayingYT(vidId, v.title, v.channel);
                
                card.innerHTML = `
                    <div style="position:relative; width:120px; height:68px; flex-shrink:0;">
                        <img src="${v.imageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                        <span style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.8); color:#fff; font-size:10px; padding:2px 4px; border-radius:4px;">${v.duration}</span>
                    </div>
                    <div style="flex:1">
                        <h4 style="font-size:13px; margin:0; color:#fff; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${v.title}</h4>
                        <p style="font-size:11px; color:var(--app-muted); margin:4px 0 0 0;">${v.channel}</p>
                    </div>
                `;
                list.appendChild(card);
            });
        } else {
            list.innerHTML = '<p style="color:var(--app-muted); text-align:center;">Video tidak ditemukan bre.</p>';
        }
    } catch(e) {
        list.innerHTML = '<p style="color:var(--error); text-align:center;">API FathurDevs lagi down atau koneksi lu bermasalah.</p>';
        console.error("YT Search Error:", e);
    }
}


function startPlayingYT(id, title, channel) {
    const playerView = document.getElementById('yt-player-view');
    const searchView = document.getElementById('yt-search-view');
    const playerContainer = document.getElementById('yt-actual-player');

    searchView.style.display = 'none';
    playerView.style.display = 'block';
    
    document.getElementById('playing-title').innerText = title;
    document.getElementById('playing-chan').innerText = channel;
    document.getElementById('chan-initial').innerText = channel.charAt(0).toUpperCase();

    // UPDATE DI SINI: Tambahkan allow="fullscreen" secara eksplisit
    playerContainer.innerHTML = `
        <iframe 
            id="main-yt-iframe"
            src="https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
            allowfullscreen="true"
            webkitallowfullscreen="true" 
            mozallowfullscreen="true"
            style="width:100%; height:100%; border:none;">
        </iframe>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// Tambahin tombol Fullscreen Manual di UI jika perlu
function requestFullScreenPlayer() {
    const iframe = document.getElementById('main-yt-iframe');
    if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
    } else if (iframe.webkitRequestFullscreen) { /* Safari */
        iframe.webkitRequestFullscreen();
    } else if (iframe.msRequestFullscreen) { /* IE11 */
        iframe.msRequestFullscreen();
    }
}
async function forceLandscape() {
    const container = document.getElementById('player-wrapper');
    
    try {
        // 1. Masuk ke Fullscreen dulu (Syarat wajib buat lock orientation)
        if (container.requestFullscreen) {
            await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            await container.webkitRequestFullscreen();
        }

        // 2. Paksa rotasi ke landscape
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape').catch(err => {
                console.log("Sistem lu ngeblok rotasi otomatis bre.");
            });
        }
    } catch (error) {
        alert("Klik oke terus miringin HP lu manual ya bre, browser lu agak ketat.");
    }
}

// Pas keluar dari fullscreen, balikin ke normal
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
});


function backToYTSearch() {
    // Balikin tampilan ke mode cari
    document.getElementById('yt-search-view').style.display = 'block';
    document.getElementById('yt-player-view').style.display = 'none';
    document.getElementById('yt-actual-player').innerHTML = ''; // Stop video
}



let currentAiSession = null; // Penampung session ID supaya AI ingat chat sebelumnya

async function askAI() {
    const inp = document.getElementById("ai-input");
    const box = document.getElementById("chat-box");
    const userQuery = inp.value.trim();
    if (!userQuery) return;

    // Tampilkan pesan user
    box.innerHTML += `<div class="chat-msg user-msg">${userQuery}</div>`;
    inp.value = "";
    inp.style.height = 'auto';
    box.scrollTop = box.scrollHeight;

    const loadId = "load-" + Date.now();
    box.innerHTML += `
        <div id="${loadId}" class="chat-msg ai-msg">
            <button class="copy-btn" onclick="copyText(this, '${loadId}')">Copy</button>
            <div class="ai-content">
                <div class="typing-loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            </div>
        </div>`;
    box.scrollTop = box.scrollHeight;

    try {
        // NEMBAK KE BRIDGE API GEMINI
        const response = await fetch('http://localhost:3000/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: userQuery,
                sessionId: currentAiSession 
            })
        });

        const data = await response.json();
        
                if (data.success) {
            const aiReply = data.result.text;
            currentAiSession = data.result.sessionId; 

            const aiBubble = document.getElementById(loadId);
            const contentDiv = aiBubble.querySelector('.ai-content');
            aiBubble.setAttribute('data-raw', aiReply);
            
            // LOGIKA PENGGANTIAN FORMAT
            let formatted = aiReply
                // 1. Ubah Bold Gemini (**text**) jadi HTML Bold
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                
                // 2. Normalisasi format LaTeX bawaan Gemini (\[ \] atau \( \)) jadi $$
                .replace(/\\\[|\\\]|\\\(|\\\)/g, '$$')
                
                // 3. LOGIKA UTAMA: Ubah tanda $ tunggal jadi $$ ganda
                // Regex ini nyari teks di dalam $...$ tapi bukan yang udah $$$...$$$
                .replace(/(?<!\$)\$([^\$]+)\$(?!\$)/g, '$$$$$1$$$$')
                
                // 4. Ubah line break jadi <br> untuk HTML
                .replace(/\n/g, '<br>');

            contentDiv.innerHTML = `<b style="color:var(--app-accent)">GEMINI AI</b><br><div class="math-result">${formatted}</div>`;

            // Render ulang pake MathJax
            if (window.MathJax) {
                MathJax.typesetPromise([contentDiv]).then(() => {
                    box.scrollTop = box.scrollHeight;
                }).catch(err => console.log("MathJax Error: ", err));
            }
        }

        
    } catch (error) {
        const el = document.getElementById(loadId);
        if (el) el.querySelector('.ai-content').innerHTML = `<b style="color:#f23f43">Error: Gagal terhubung ke Gemini.</b>`;
    }
}




function showPop(txt){
  const pop = document.getElementById("point-pop");
  if (pop) {
    pop.innerText = txt; pop.style.display="block";
    setTimeout(()=>pop.style.display="none",2000);
  }
}

// --- UPDATE FUNGSI NAVTO ---
function navTo(id, btn, push = true) {
  const pages = document.querySelectorAll(".page");
  const bottomNav = document.getElementById("bottom-nav");
  
  if (push) history.pushState({ page: id }, "", "");

  pages.forEach(p => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  const targetPage = document.getElementById(id);
  if (targetPage) {
    targetPage.style.display = "block";
    setTimeout(() => { targetPage.classList.add("active"); }, 10);
  }

  // --- LOGIKA MUNCUL/SEMBUNYI BOTTOM NAV ---
  // Daftar halaman yang BOLEH nampilin bottom nav
  const mainPages = ['home', 'materi', 'soal', 'profil', 'ai-chat', 'anime-page']; 
  
  if (bottomNav) {
      if (mainPages.includes(id)) {
          bottomNav.style.display = "flex";
          // Tambahkan sedikit delay biar animasinya halus
          setTimeout(() => bottomNav.style.opacity = "1", 10);
      } else {
          // Sembunyikan navigasi di halaman detail atau halaman kuis tertentu jika mau
          bottomNav.style.opacity = "0";
          setTimeout(() => bottomNav.style.display = "none", 300);
      }
  }

  // Update status tombol aktif di bottom nav
  document.querySelectorAll(".nav-btn").forEach(b => {
      const onclickAttr = b.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes(`'${id}'`)) {
          document.querySelectorAll(".nav-btn").forEach(x => x.classList.remove("active"));
          b.classList.add("active");
      }
  });

  // Handle Konten Khusus
  if (id === "materi") {
    if (dataMateri.length === 0) loadMateri(); else renderListMateri();
  }
  if (id === "soal") {
    loadQuizProgress(); 
    if (soalData.length === 0) {
        loadSoalDatabase().then(() => renderQuiz());
    } else {
        renderQuiz();
    }
  }
  
  window.scrollTo({top: 0, behavior: 'smooth'});
}
function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// --- UPDATE HANDLER BACK BUTTON (POPSTATE) ---
window.addEventListener('popstate', function(event) {
    const bottomNav = document.getElementById("bottom-nav");
    const sidebar = document.getElementById('main-sidebar');
    if (sidebar.classList.contains('active')) {
        toggleSidebar();
    }
    if (event.state && event.state.page) {
        // Jika ada state history, balik ke halaman tersebut
        navTo(event.state.page, null, false);
    } else {
        // Jika history habis (misal dari detail anime dipaksa back)
        // Pastikan balik ke home dan nampilin bottom nav
        navTo('home', null, false);
        if (bottomNav) bottomNav.style.display = "flex"; 
    }
});

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('dark_mode', isDark);
    const themeBtn = document.getElementById("theme-btn");
    if(themeBtn) themeBtn.innerText = isDark ? "☀️" : "🌙";
}

function logout(){
  if(confirm("Logout sekarang?")) {
    localStorage.removeItem("math_user");
    location.reload();
  }
}


    // Memastikan autoplay jalan (karena beberapa browser pelit)
    document.addEventListener('DOMContentLoaded', () => {
        const raidenVid = document.querySelector('.raiden-video');
        if (raidenVid) {
            raidenVid.play().catch(() => {
                console.log("Ei butuh klik pertama user buat jalan, bre.");
            });
        }
    });
document.addEventListener('click', function() {
    const video = document.getElementById('raidenVideo');
    if (video) {
        video.muted = false;
        video.play();
    }
}, { once: true });


window.onload = () => {
    loadDatabase();
    init();
};