let studentDB = []; 
let userData = { nisn: "", nama: "", points: 0, completed: [], profilePic: "" };
let dataMateri = [];
let currentDailyData = null;

async function loadDailyQuestion() {
  const container = document.getElementById("daily-options");
  const content = document.getElementById("daily-math-content");
  const statusCard = document.getElementById("daily-status-card");
  
  if (!container || !content) return;

  content.innerHTML = '<div class="loader" style="margin:auto"></div>';

  try {
    const response = await fetch('database/daily.json');
    currentDailyData = await response.json();
    
    const userAttempts = JSON.parse(localStorage.getItem("daily_attempts") || "{}");
    const status = userAttempts[currentDailyData.id];

    content.innerHTML = currentDailyData.pertanyaan;
    
    if (window.MathJax) {
      MathJax.typesetClear([content]);
      MathJax.typesetPromise([content]);
    }

    if (status) {
      container.innerHTML = "";
      statusCard.innerHTML = `
        <div class="card" style="border: 2px solid ${status === 'benar' ? '#23a55a' : '#f23f42'}; text-align: center; background: rgba(0,0,0,0.05);">
          <h3 style="color: ${status === 'benar' ? '#23a55a' : '#f23f42'}; margin: 0;">
            ${status === 'benar' ? '✅ Jawaban Kamu Benar!' : '❌ Kesempatan Kamu Habis'}
          </h3>
          <p style="margin: 5px 0 0; font-size: 13px;">Soal ini sudah kamu kerjakan.</p>
        </div>
      `;
    } else {
      statusCard.innerHTML = "";
      container.innerHTML = currentDailyData.pilihan.map(p => `
        <button class="quality-btn-full" onclick="submitDailyAnswer('${p}')">${p}</button>
      `).join("");
    }
  } catch (error) {
    content.innerHTML = "Gagal memuat soal harian.";
  }
}

function submitDailyAnswer(choice) {
  if (!currentDailyData) return;

  const isCorrect = choice === currentDailyData.jawaban;
  let userAttempts = JSON.parse(localStorage.getItem("daily_attempts") || "{}");
  
  if (isCorrect) {
    userAttempts[currentDailyData.id] = "benar";
    userData.points += 100;
    showPop("🔥 +100 Point!");
  } else {
    userAttempts[currentDailyData.id] = "salah";
    alert("Yah salah bre! Coba lagi besok ya.");
  }

  localStorage.setItem("daily_attempts", JSON.stringify(userAttempts));
  updateStats();
  loadDailyQuestion();
}

function hideLoading() {
  const loader = document.getElementById("loading-overlay");
  loader.style.opacity = "0";
  setTimeout(() => loader.style.display = "none", 500);
}

function showLoading() {
  const loader = document.getElementById("loading-overlay");
  loader.style.display = "flex"; loader.style.opacity = "1";
}

async function loadDatabase() {
  try {
    const response = await fetch('database/login.json');
    studentDB = await response.json();
    init();
    hideLoading();
  } catch (error) {
    console.error("DB Load Error", error);
    hideLoading();
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
  
  updateStats();
  displayProfilePicture(); 

  navTo('home');
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
    let targetSrc = userData.profilePic || `media/profile/${userData.nisn}.jpg`;

    if (imgDisplay) {
        imgDisplay.src = targetSrc;
        imgDisplay.onerror = () => { imgDisplay.src = "media/avatar.jpg"; };
    }

    if (homeAvatar) {
        homeAvatar.src = targetSrc;
        homeAvatar.onerror = () => { homeAvatar.src = "media/avatar.jpg"; };
    }
}

function updateStats(){
  localStorage.setItem("math_user", JSON.stringify(userData));

  const elements = {
    "exp-val": userData.points,
    "exp-val-profile": userData.points + " XP",
    "display-nisn": userData.nisn,
    "user-name-display": userData.nama,
    "prof-nisn-display": "nisn_" + userData.nisn + "#2026",
    "stat-total-view": localStorage.getItem('total_viewed') || "0",
    "stat-last-watch": localStorage.getItem('last_watch_title') || "None"
  };

  for (let id in elements) {
    const el = document.getElementById(id);
    if(el) el.innerText = elements[id];
  }

  const m1Badge = document.getElementById("m1-badge");
  if(m1Badge) m1Badge.innerText = userData.completed.includes("m1") ? "✅ Selesai" : "Belum Selesai";

  const h = new Date().getHours();
  const sapa = h < 11 ? "Pagi" : h < 15 ? "Siang" : h < 19 ? "Sore" : "Malam";
  const greeting = document.getElementById("greeting");
  if(greeting) greeting.innerText = `Selamat ${sapa}, ${userData.nama}! 🚀`;
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

function showPop(txt){
  const pop = document.getElementById("point-pop");
  pop.innerText = txt; pop.style.display="block";
  setTimeout(()=>pop.style.display="none",2000);
}

function navTo(id, btn) {
  const pages = document.querySelectorAll(".page");
  pages.forEach(p => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  const targetPage = document.getElementById(id);
  if (targetPage) {
    targetPage.style.display = "block";
    setTimeout(() => targetPage.classList.add("active"), 10);
    if (!history.state || history.state.pageId !== id) {
        history.pushState({ pageId: id }, "", `#${id}`);
    }
  }

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    document.querySelectorAll(".nav-btn").forEach(b => {
      if(b.getAttribute('onclick')?.includes(`'${id}'`)) b.classList.add("active");
    });
  }

  if (id === "materi") {
    if (dataMateri.length === 0) loadMateri(); else renderListMateri();
  }
  if (id === "soal-harian") loadDailyQuestion();
  
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('dark_mode', isDark);
    document.getElementById("theme-btn").innerText = isDark ? "☀️" : "🌙";
}

function logout(){
  if(confirm("Logout sekarang?")) {
    localStorage.removeItem("math_user");
    location.reload();
  }
}

window.onpopstate = (event) => {
    if (event.state && event.state.pageId) navTo(event.state.pageId);
};

window.onload = () => {
    loadDatabase();
};

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
    const box = document.getElementById("chat-box");
    if(box) box.scrollTop = box.scrollHeight;
}
