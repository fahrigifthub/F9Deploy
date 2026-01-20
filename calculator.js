let currentMode = 'single';
let currentOrdo = 2;

function switchCalcMode(mode, btn) {
    currentMode = mode;
    document.querySelectorAll('#matrix-calc .genre-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('matrix-b-area').style.display = mode === 'double' ? 'block' : 'none';
    document.getElementById('single-ops').style.display = mode === 'single' ? 'grid' : 'none';
    document.getElementById('double-ops').style.display = mode === 'double' ? 'grid' : 'none';
    document.getElementById('calc-result-area').style.display = 'none';
}

function setOrdo(n) {
    currentOrdo = n;
    const grids = document.querySelectorAll('.matrix-input-grid');
    grids.forEach(grid => {
        grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        grid.innerHTML = "";
        for(let i=1; i<=(n*n); i++) {
            const prefix = (grid.id === 'mb-grid' || grid.previousElementSibling?.innerText === "MATRIX B") ? 'mb' : 'ma';
            grid.innerHTML += `<input type="number" id="${prefix}${i}" class="auth-input m-box" placeholder="0">`;
        }
    });
}

function getM(prefix, i) { return parseFloat(document.getElementById(prefix + i).value) || 0; }

function renderResult(arr, steps) {
    const resArea = document.getElementById('calc-result-area');
    const out = document.getElementById('calc-output');
    const stepBox = document.getElementById('calc-steps');
    
    resArea.style.display = 'block';
    out.innerHTML = renderMatrixDisplay(arr, currentOrdo);
    stepBox.innerHTML = steps;
}

function renderMatrixDisplay(arr, ordo) {
    if(arr.length === 1) return `<h1 style="color:var(--app-accent); margin:0">${arr[0]}</h1>`;
    return `
    <div style="display:grid; grid-template-columns:repeat(${ordo}, 1fr); gap:15px; padding:10px 20px; border-left:2px solid #fff; border-right:2px solid #fff; text-align:center; font-weight:bold; font-size:18px">
        ${arr.map(v => `<span>${v}</span>`).join("")}
    </div>`;
}

function calcSingle(type) {
    const label = document.getElementById('calc-label');
    if (currentOrdo === 2) {
        const a = getM('ma', 1), b = getM('ma', 2), c = getM('ma', 3), d = getM('ma', 4);
        let det = (a * d) - (b * c);

        if (type === 'det') {
            label.innerText = "Determinan |A|";
            renderResult([det], `det(A) = (ad - bc)<br>det(A) = (${a} × ${d}) - (${b} × ${c})<br>det(A) = ${a*d} - ${b*c} = ${det}`);
        } else if (type === 'adj') {
            label.innerText = "Adjoin A";
            renderResult([d, -b, -c, a], `Tukar diagonal utama (a↔d) dan kali -1 diagonal samping (b & c).<br>a= ${a} → ${d}, d= ${d} → ${a}<br>b= ${b} → ${-b}, c= ${c} → ${-c}`);
        } else if (type === 'inv') {
            label.innerText = "Invers A⁻¹";
            if (det === 0) renderResult(["ERR"], "Determinan 0! Matriks tidak punya invers.");
            else renderResult([(d/det).toFixed(2), (-b/det).toFixed(2), (-c/det).toFixed(2), (a/det).toFixed(2)], `A⁻¹ = 1/det(A) × Adj(A)<br>A⁻¹ = 1/${det} × [${d}, ${-b}, ${-c}, ${a}]`);
        }
    } else {
        if (type === 'det') {
            const m = [1,2,3,4,5,6,7,8,9].map(i => getM('ma', i));
            const det3 = (m[0]*m[4]*m[8] + m[1]*m[5]*m[6] + m[2]*m[3]*m[7]) - (m[2]*m[4]*m[6] + m[0]*m[5]*m[7] + m[1]*m[3]*m[8]);
            label.innerText = "Determinan |A| 3x3";
            renderResult([det3], `Metode Sarrus:<br>(${m[0]}·${m[4]}·${m[8]} + ${m[1]}·${m[5]}·${m[6]} + ${m[2]}·${m[3]}·${m[7]}) - (${m[2]}·${m[4]}·${m[6]} + ${m[0]}·${m[5]}·${m[7]} + ${m[1]}·${m[3]}·${m[8]}) = ${det3}`);
        }
    }
}

function calcArithmetic(op) {
    const label = document.getElementById('calc-label');
    let results = [];
    let stepText = "";

    if (op === 'times') {
        label.innerText = "Hasil Perkalian A × B";
        const a = [1,2,3,4].map(i => getM('ma', i));
        const b = [1,2,3,4].map(i => getM('mb', i));
        const r1 = (a[0]*b[0]) + (a[1]*b[2]), r2 = (a[0]*b[1]) + (a[1]*b[3]);
        const r3 = (a[2]*b[0]) + (a[3]*b[2]), r4 = (a[2]*b[1]) + (a[3]*b[3]);
        results = [r1, r2, r3, r4];
        stepText = `Baris × Kolom:<br>c11: (${a[0]}×${b[0]})+(${a[1]}×${b[2]}) = ${r1}<br>c12: (${a[0]}×${b[1]})+(${a[1]}×${b[3]}) = ${r2}<br>c21: (${a[2]}×${b[0]})+(${a[3]}×${b[2]}) = ${r3}<br>c22: (${a[2]}×${b[1]})+(${a[3]}×${b[3]}) = ${r4}`;
    } else {
        label.innerText = op === 'plus' ? "Hasil A + B" : "Hasil A - B";
        const symbol = op === 'plus' ? '+' : '-';
        for(let i=1; i<=(currentOrdo*currentOrdo); i++) {
            const vA = getM('ma', i), vB = getM('mb', i);
            results.push(op === 'plus' ? vA + vB : vA - vB);
        }
        stepText = `Setiap elemen yang seletak di${op === 'plus' ? 'tambahkan' : 'kurangkan'}.<br>Contoh: a11 ${symbol} b11 = ${getM('ma', 1)} ${symbol} ${getM('mb', 1)} = ${results[0]}`;
    }
    renderResult(results, stepText);
}
