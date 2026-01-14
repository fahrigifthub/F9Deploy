let studentDB = []; 
let userData = { nisn: "", nama: "", points: 0, completed: [], profilePic: "" };
let dataMateri = [];
let soalData = []; // Variabel penampung soal dari JSON
let currentSoalIdx = 0; // Penanda urutan soal
let streak = 0;

function hideLoading() {
  const loader = document.getElementById("loading-overlay");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.style.display = "none", 500);
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

  // Cek apakah elemen ada (Guard Clause)
  if (!qElem || !oElem) return;

  if (soalData.length === 0) {
    qElem.innerText = "Memuat soal...";
    return;
  }

  const currentSoal = soalData[currentSoalIdx];
  
  // Update Top Bar (Step & Progress)
  if (stepElem) stepElem.innerText = `${currentSoalIdx + 1} / ${soalData.length}`;
  if (progressElem) {
    const percent = ((currentSoalIdx) / soalData.length) * 100;
    progressElem.style.width = percent + "%";
  }

  // Render Pertanyaan
  qElem.innerHTML = currentSoal.q;

  // Render Pilihan Jawaban (Gunakan class qz-opt dan qz-index)
  oElem.innerHTML = currentSoal.o.map((v, i) => `
    <button class="qz-opt qz-${i % 4}" onclick="checkAnswer(${i})">
        ${v}
    </button>`).join("");
  
  if (window.MathJax) MathJax.typeset();
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
    const profileImgInput = document.getElementById('profile-img-input');
    if (profileImgInput) profileImgInput.addEventListener('change', handleProfilePicUpload);
});

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            userData.profilePic = e.target.result; 
            localStorage.setItem("math_user", JSON.stringify(userData));
            displayProfilePicture();
        };
        reader.readAsDataURL(file);
    }
}

function displayProfilePicture() {
    const imgDisplay = document.getElementById('profile-img-display');
    const homeAvatar = document.getElementById('home-avatar-display');
    const editPreview = document.getElementById('edit-avatar-preview');
    
    let targetSrc = userData.profilePic || "media/avatar.jpg";

    const updateImg = (el) => {
        if (el) {
            el.src = targetSrc;
            el.onerror = () => { el.src = "media/avatar.jpg"; };
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
            document.getElementById('edit-avatar-preview').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveNewProfile() {
    const newName = document.getElementById('input-full-name').value;
    const newNisn = document.getElementById('input-full-nisn').value;
    const newPic = document.getElementById('edit-avatar-preview').src;

    if (!newName || !newNisn) {
        alert("⚠️ Nama dan NISN harus diisi!");
        return;
    }

    userData.nama = newName;
    userData.nisn = newNisn;
    userData.profilePic = newPic;
    localStorage.setItem("math_user", JSON.stringify(userData));
    init();

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

async function askAI() {
    const inp = document.getElementById("ai-input");
    const box = document.getElementById("chat-box");
    const query = inp.value.trim();
    if (!query) return;

    // Tampilkan pesan user
    box.innerHTML += `<div class="chat-msg user-msg">${query}</div>`;
    inp.value = "";
    inp.style.height = 'auto';
    box.scrollTop = box.scrollHeight;

    const loadId = "load-" + Date.now();
    box.innerHTML += `
        <div id="${loadId}" class="chat-msg ai-msg" data-raw="">
            <button class="copy-btn" onclick="copyText(this, '${loadId}')">Copy</button>
            <div class="ai-content">
                <div class="typing-loader">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        </div>`;
    box.scrollTop = box.scrollHeight;
    
    try {
        const sysPrompt = "Kamu guru matematika profesional. Jawab soal matriks dengan jelas. Gunakan format LaTeX $$...$$ untuk rumus.";
        
        // Pake fetch dengan timeout biar gak nunggu kelamaan
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

        const response = await fetch(`https://api.nekolabs.web.id/text.gen/gpt/5-nano?text=${encodeURIComponent(query)}&systemPrompt=${encodeURIComponent(sysPrompt)}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Server Error (${response.status})`);
        
        const data = await response.json();
        const aiReply = data.result || data.message || "Gagal dapet jawaban.";
        
        const aiBubble = document.getElementById(loadId);
        const contentDiv = aiBubble.querySelector('.ai-content');
        
        // Simpan raw data untuk fungsi copy
        aiBubble.setAttribute('data-raw', aiReply);

        // Format tampilan
        let formattedReply = aiReply
            .replace(/---/g, '<hr>')
            .replace(/\n/g, '<br>');

        contentDiv.innerHTML = `<b style="color:var(--app-accent)">AI ASSISTANT</b><br>${formattedReply}`;

        // Penting: Render MathJax setelah konten masuk ke DOM
        if (window.MathJax) {
            await MathJax.typesetPromise([contentDiv]);
        }
        
        box.scrollTop = box.scrollHeight;

    } catch (error) {
        console.error("AI Error:", error);
        const aiBubble = document.getElementById(loadId);
        if (aiBubble) {
            aiBubble.querySelector('.ai-content').innerHTML = `
                <div style="color:#f23f43; font-size:12px; padding:10px; border:1px dashed #f23f43; border-radius:8px">
                    <b>⚠️ Error:</b> ${error.message === 'aborted' ? 'Koneksi Timeout' : error.message}<br>
                    <button onclick="askAI()" style="margin-top:8px; background:var(--app-accent); color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer">Coba Lagi</button>
                </div>`;
        }
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

// --- UPDATE HANDLER BACK BUTTON (POPSTATE) ---
window.addEventListener('popstate', function(event) {
    const bottomNav = document.getElementById("bottom-nav");
    
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


window.onload = () => {
    loadDatabase();
    init();
};