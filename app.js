(() => {
  const N = 3;
  const LS_SCORE = "ttt3d_score_v2";
  const LS_VIEW = "ttt3d_view_v2";

  const $ = (id) => document.getElementById(id);
  const stackEl = $("stack");
  const turnEl = $("turn");
  const scoreXEl = $("scoreX");
  const scoreOEl = $("scoreO");
  const scoreDEl = $("scoreD");
  const btnNew = $("btnNew");
  const btnReset = $("btnReset");
  const btn3d = $("btn3d");
  const btnFlat = $("btnFlat");
  const layerTabs = $("layerTabs");

  let viewMode = loadViewMode();
  let activeLayer = 1;
  let cells = Array(N * N * N).fill(null);
  let current = "X";
  let locked = false;
  let winningLine = null;
  const lines = generateLines(N);

  let score = loadScore();
  renderScore();

  function idx(x, y, z) {
    return z * N * N + y * N + x;
  }

  function loadScore() {
    try {
      const raw = localStorage.getItem(LS_SCORE);
      if (!raw) return { X: 0, O: 0, D: 0 };
      const s = JSON.parse(raw);
      return { X: Number(s.X || 0), O: Number(s.O || 0), D: Number(s.D || 0) };
    } catch {
      return { X: 0, O: 0, D: 0 };
    }
  }

  function saveScore() {
    localStorage.setItem(LS_SCORE, JSON.stringify(score));
  }

  function renderScore() {
    scoreXEl.textContent = String(score.X);
    scoreOEl.textContent = String(score.O);
    scoreDEl.textContent = String(score.D);
  }

  function setStatus(html) {
    turnEl.innerHTML = html;
  }

  function loadViewMode() {
    try {
      const raw = localStorage.getItem(LS_VIEW);
      return raw === "flat" ? "flat" : "3d";
    } catch {
      return "3d";
    }
  }

  function saveViewMode(mode) {
    localStorage.setItem(LS_VIEW, mode);
  }

  function newGame(next = "X") {
    cells = Array(N * N * N).fill(null);
    current = next;
    locked = false;
    winningLine = null;
    draw();
    setStatus(`Turn: <strong>${current}</strong>`);
  }

  function resetAll() {
    score = { X: 0, O: 0, D: 0 };
    saveScore();
    renderScore();
    newGame("X");
  }

  function winner() {
    for (const line of lines) {
      const a = cells[line[0]];
      if (!a) continue;
      if (a === cells[line[1]] && a === cells[line[2]]) {
        return { player: a, line };
      }
    }
    if (cells.every(Boolean)) return { player: "D", line: [] };
    return null;
  }

  function handleMove(i) {
    if (locked || cells[i]) return;
    cells[i] = current;

    const w = winner();
    if (w) {
      locked = true;
      winningLine = w.line;
      if (w.player === "D") {
        score.D++;
        setStatus(`It's a <strong>draw</strong>. Tap <strong>New game</strong>.`);
      } else {
        score[w.player]++;
        setStatus(`<strong>${w.player}</strong> wins! Tap <strong>New game</strong>.`);
      }
      saveScore();
      renderScore();
      draw();
      return;
    }

    current = current === "X" ? "O" : "X";
    draw();
    setStatus(`Turn: <strong>${current}</strong>`);
  }

  function generateLines(n) {
    const dirs = [];
    for (let dx of [-1, 0, 1]) {
      for (let dy of [-1, 0, 1]) {
        for (let dz of [-1, 0, 1]) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          if (dx > 0 || (dx === 0 && dy > 0) || (dx === 0 && dy === 0 && dz > 0)) {
            dirs.push([dx, dy, dz]);
          }
        }
      }
    }

    const out = [];
    const inb = (x, y, z) => x >= 0 && x < n && y >= 0 && y < n && z >= 0 && z < n;

    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          for (const [dx, dy, dz] of dirs) {
            if (inb(x - dx, y - dy, z - dz)) continue;
            const line = [];
            for (let t = 0; t < n; t++) {
              const xx = x + dx * t;
              const yy = y + dy * t;
              const zz = z + dz * t;
              if (!inb(xx, yy, zz)) {
                line.length = 0;
                break;
              }
              line.push(idx(xx, yy, zz));
            }
            if (line.length === n) out.push(line);
          }
        }
      }
    }

    return out;
  }

  function draw() {
    stackEl.innerHTML = "";
    stackEl.className = `stack ${viewMode === "3d" ? "mode-3d" : "mode-flat"}`;

    for (let z = 0; z < N; z++) {
      const layer = document.createElement("section");
      layer.className = "layer";
      layer.dataset.z = String(z);
      if (viewMode === "flat" && z !== activeLayer) {
        layer.style.display = "none";
      }

      const label = document.createElement("div");
      label.className = "layerLabel";
      label.textContent = `Layer ${z + 1}`;
      layer.appendChild(label);

      const grid = document.createElement("div");
      grid.className = "grid";

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = idx(x, y, z);
          const btn = document.createElement("button");
          btn.className = "cell";
          btn.type = "button";
          btn.dataset.idx = String(i);
          btn.setAttribute("role", "gridcell");
          btn.setAttribute("aria-label", `Cell x${x + 1} y${y + 1} z${z + 1}`);
          btn.textContent = cells[i] || "";
          if (cells[i] || locked) btn.disabled = true;
          if (winningLine && winningLine.includes(i)) btn.classList.add("win");
          btn.addEventListener("click", () => handleMove(i));
          grid.appendChild(btn);
        }
      }

      layer.appendChild(grid);
      stackEl.appendChild(layer);
    }

    if (viewMode === "flat") {
      layerTabs.style.display = "flex";
      for (const t of layerTabs.querySelectorAll(".tab")) {
        const z = Number(t.getAttribute("data-layer"));
        t.classList.toggle("active", z === activeLayer);
      }
    } else {
      layerTabs.style.display = "none";
    }

    btn3d.classList.toggle("active", viewMode === "3d");
    btnFlat.classList.toggle("active", viewMode === "flat");
  }

  btn3d.addEventListener("click", () => {
    viewMode = "3d";
    saveViewMode(viewMode);
    draw();
  });

  btnFlat.addEventListener("click", () => {
    viewMode = "flat";
    saveViewMode(viewMode);
    draw();
  });

  layerTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    activeLayer = Number(btn.dataset.layer);
    draw();
  });

  btnNew.addEventListener("click", () => {
    const w = winner();
    if (w && (w.player === "X" || w.player === "O")) newGame(w.player);
    else newGame(current);
  });

  btnReset.addEventListener("click", () => {
    if (confirm("Reset game + score?")) resetAll();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  draw();
  setStatus(`Turn: <strong>${current}</strong>`);
})();
