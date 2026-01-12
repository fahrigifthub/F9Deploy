let studentDB = []; 
let userData = { nisn: "", nama: "", points: 0, completed: [], profilePic: "" };
let dataMateri = [];

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
  document.getElementById("display-nisn").innerText = userData.nisn;
  document.getElementById("prof-nisn").innerText = userData.nama;
  const h = new Date().getHours();
  const sapa = h < 11 ? "Pagi" : h < 15 ? "Siang" : h < 19 ? "Sore" : "Malam";
  document.getElementById("greeting").innerText = `Selamat ${sapa}, ${userData.nama}! 🚀`;
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
    const placeholder = document.getElementById('profile-placeholder');
    const homeAvatar = document.getElementById('home-avatar-display');
    
    let targetSrc = userData.profilePic || `media/profile/${userData.nisn}.jpg`;

    if (imgDisplay) {
        imgDisplay.src = targetSrc;
        imgDisplay.style.display = 'block';
        placeholder.style.display = 'none';
        imgDisplay.onerror = () => {
            imgDisplay.style.display = 'none';
            placeholder.style.display = 'flex';
            if (homeAvatar) homeAvatar.src = "media/avatar.jpg";
        };
    }

    if (homeAvatar) {
        homeAvatar.src = targetSrc;
        homeAvatar.onerror = () => { homeAvatar.src = "media/avatar.jpg"; };
    }
}

function updateStats(){
  document.getElementById("exp-val").innerText=userData.points;
  document.getElementById("prof-exp").innerText=userData.points;
  const m1Badge = document.getElementById("m1-badge");
  m1Badge.innerText=userData.completed.includes("m1")?"✅ Selesai":"Belum Selesai";
  document.getElementById("pangkat").innerText=userData.points>=500?"Master Matriks":"Pemula";
  localStorage.setItem("math_user",JSON.stringify(userData));
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

const quizData={q:"Berapakah jumlah elemen pada matriks ordo 2x3?",o:["5 elemen","6 elemen","2 elemen","3 elemen"],a:1};

function renderQuiz(){
  document.getElementById("quiz-feedback").style.display="none";
  document.getElementById("question").innerText=quizData.q;
  document.getElementById("options").innerHTML=quizData.o.map((v,i)=>`<button class="auth-input" style="text-align:left; cursor:pointer; margin-bottom:10px" onclick="checkAnswer(${i})">${v}</button>`).join("");
}

function checkAnswer(i){
  const fb = document.getElementById("quiz-feedback");
  fb.style.display="block";
  if(i===quizData.a){
    fb.innerHTML="<span style='color:#34a853'>SUCCESS: +100 Point 🏆</span>";
    userData.points+=100;
    showPop("🔥 +100 Point!");
    updateStats();
  }else{
    fb.innerHTML="<span style='color:#ea4335'>FAILED: Try again! ❌</span>";
  }
}

const aiInput = document.getElementById("ai-input");

if (aiInput) {
    aiInput.addEventListener('focus', () => {
        document.body.classList.add('keyboard-open');
        setTimeout(() => {
            const box = document.getElementById("chat-box");
            box.scrollTop = box.scrollHeight;
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
    box.scrollTop = box.scrollHeight;
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
        const params = new URLSearchParams({ text: query, systemPrompt: sysPrompt });
        const response = await fetch(`https://api.nekolabs.web.id/text.gen/gpt/5-nano?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const aiReply = data.result || "Gagal dapet jawaban.";
        const aiBubble = document.getElementById(loadId);
        const contentDiv = aiBubble.querySelector('.ai-content');
        aiBubble.setAttribute('data-raw', aiReply);
        let formattedReply = aiReply
            .replace(/>\s*(.*?)(?:\n|$)/g, '<blockquote>$1</blockquote>')
            .replace(/---/g, '<hr>')
            .replace(/\n/g, '<br>');
        contentDiv.innerHTML = `<b>AI ASSISTANT</b>${formattedReply}`;
        if (window.MathJax) await MathJax.typesetPromise([contentDiv]);
        box.scrollTop = box.scrollHeight;
    } catch (error) {
        const aiBubble = document.getElementById(loadId);
        if (aiBubble) {
            aiBubble.querySelector('.ai-content').innerHTML = `
                <div style="color:var(--error); font-size:12px; padding:10px; border:1px dashed var(--error); border-radius:8px">
                    <b>⚠️ Error:</b> ${error.message}<br>
                    <button onclick="askAI()" style="margin-top:8px; background:var(--app-accent); color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer">Coba Lagi</button>
                </div>`;
        }
    }
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
    setTimeout(() => {
        targetPage.classList.add("active");
    }, 10);
  }

  if (btn) {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }

  if (id === "materi") {
    if (dataMateri.length === 0) loadMateri(); else renderListMateri();
  }
  if (id === "soal") renderQuiz();
  if (id === "anime-page") fetchAnime();
  
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

window.onload = () => {
    loadDatabase();
    init();
};
