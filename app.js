(() => {
  const N = 3;
  const LS_SCORE = "ttt3d_score_v1";
  const LS_VIEW = "ttt3d_view_v1";

  const $ = (id) => document.getElementById(id);
  const stackEl = $("stack");
  const sceneEl = $("scene");
  const turnEl = $("turn");
  const scoreXEl = $("scoreX");
  const scoreOEl = $("scoreO");
  const scoreDEl = $("scoreD");

  const btnNew = $("btnNew");
  const btnReset = $("btnReset");
  const btn3d = $("btn3d");
  const btnFlat = $("btnFlat");
  const btnViewReset = $("btnViewReset");
  const layerTabs = $("layerTabs");

  let viewMode = "3d"; // '3d' | 'flat'
  let activeLayer = 1; // default middle layer in flat mode

  /** @type {(null|"X"|"O")[]} */
  let cells = Array(N * N * N).fill(null);
  let current = "X";
  let locked = false;
  let winningLine = null;

  const lines = generateLines(N);

  let score = loadScore();
  renderScore();

  // View state
  const view = loadView();
  applyView(view);
  setViewMode(viewMode);

  function idx(x, y, z) {
    return z * N * N + y * N + x;
  }

  function coords(i) {
    const z = Math.floor(i / (N * N));
    const rem = i % (N * N);
    const y = Math.floor(rem / N);
    const x = rem % N;
    return { x, y, z };
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
    if (cells.every(Boolean)) {
      return { player: "D", line: [] };
    }
    return null;
  }

  function handleMove(i) {
    if (locked) return;
    if (cells[i]) return;

    cells[i] = current;
    draw();

    const w = winner();
    if (w) {
      locked = true;
      winningLine = w.line;
      draw();

      if (w.player === "D") {
        score.D++;
        saveScore();
        renderScore();
        setStatus(`It's a <strong>draw</strong>. Tap <strong>New game</strong>.`);
      } else {
        score[w.player]++;
        saveScore();
        renderScore();
        setStatus(`<strong>${w.player}</strong> wins! Tap <strong>New game</strong>.`);
      }
      return;
    }

    current = current === "X" ? "O" : "X";
    setStatus(`Turn: <strong>${current}</strong>`);
  }

  function generateLines(n) {
    const dirs = [];
    for (let dx of [-1, 0, 1]) {
      for (let dy of [-1, 0, 1]) {
        for (let dz of [-1, 0, 1]) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          // canonical direction to avoid duplicates
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
            // start must be minimal along this direction
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

    // Expect 49 lines for 3x3x3
    return out;
  }

  function draw() {
    stackEl.innerHTML = "";

    for (let z = 0; z < N; z++) {
      const layer = document.createElement("section");
      layer.className = "layer";
      layer.dataset.z = String(z);
      layer.dataset.label = `Layer ${z + 1}`;
      layer.style.transform = stackEl.classList.contains("flat")
        ? "none"
        : `translateZ(${(z - 1) * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--layer-gap'))}px)`;

      if (viewMode === "flat") {
        layer.style.display = z === activeLayer ? "block" : "none";
      }

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

          btn.addEventListener("click", () => {
            if (suppressClick) return;
            handleMove(i);
          });

          grid.appendChild(btn);
        }
      }

      layer.appendChild(grid);
      stackEl.appendChild(layer);
    }

    // tabs
    if (viewMode === "flat") {
      layerTabs.style.display = "flex";
      for (const t of layerTabs.querySelectorAll(".tab")) {
        const z = Number(t.getAttribute("data-layer"));
        t.classList.toggle("active", z === activeLayer);
      }
    } else {
      layerTabs.style.display = "none";
    }
  }

  // --- View controls ---
  function loadView() {
    try {
      const raw = localStorage.getItem(LS_VIEW);
      if (!raw) return { rx: -55, ry: 35, mode: "3d" };
      const v = JSON.parse(raw);
      return {
        rx: Number(v.rx ?? -55),
        ry: Number(v.ry ?? 35),
        mode: v.mode === "flat" ? "flat" : "3d",
      };
    } catch {
      return { rx: -55, ry: 35, mode: "3d" };
    }
  }

  function saveView(rx, ry, mode) {
    localStorage.setItem(LS_VIEW, JSON.stringify({ rx, ry, mode }));
  }

  function applyView(v) {
    setRotation(v.rx, v.ry);
    viewMode = v.mode;
  }

  function setRotation(rxDeg, ryDeg) {
    document.documentElement.style.setProperty("--rx", `${rxDeg}deg`);
    document.documentElement.style.setProperty("--ry", `${ryDeg}deg`);
  }

  function setViewMode(mode) {
    viewMode = mode;

    btn3d.classList.toggle("active", mode === "3d");
    btnFlat.classList.toggle("active", mode === "flat");

    stackEl.classList.toggle("flat", mode === "flat");
    saveView(currentRx, currentRy, mode);
    draw();
  }

  // Layer tabs
  layerTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    activeLayer = Number(btn.getAttribute("data-layer"));
    draw();
  });

  btn3d.addEventListener("click", () => setViewMode("3d"));
  btnFlat.addEventListener("click", () => setViewMode("flat"));

  btnViewReset.addEventListener("click", () => {
    currentRx = -55;
    currentRy = 35;
    setRotation(currentRx, currentRy);
    saveView(currentRx, currentRy, viewMode);
  });

  // New/reset
  btnNew.addEventListener("click", () => {
    const w = winner();
    if (w && (w.player === "X" || w.player === "O")) {
      newGame(w.player);
    } else {
      newGame(current);
    }
  });

  btnReset.addEventListener("click", () => {
    const ok = confirm("Reset game + score?");
    if (ok) resetAll();
  });

  // --- Drag to rotate in 3D view ---
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startRx = -55;
  let startRy = 35;
  let suppressClick = false;
  let currentRx = -55;
  let currentRy = 35;

  // Initialize current rot from CSS variables
  currentRx = loadView().rx;
  currentRy = loadView().ry;

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  stackEl.addEventListener("pointerdown", (e) => {
    if (viewMode !== "3d") return;
    dragging = true;
    suppressClick = false;
    startX = e.clientX;
    startY = e.clientY;
    startRx = currentRx;
    startRy = currentRy;
    stackEl.setPointerCapture(e.pointerId);
  });

  stackEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (viewMode !== "3d") return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.hypot(dx, dy) > 8) suppressClick = true;

    // drag right => rotate Y positive, drag down => rotate X less negative
    currentRy = startRy + dx * 0.18;
    currentRx = startRx - dy * 0.18;

    currentRx = clamp(currentRx, -85, -15);
    currentRy = clamp(currentRy, -70, 70);

    setRotation(currentRx, currentRy);
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    saveView(currentRx, currentRy, viewMode);
    // allow click again shortly
    setTimeout(() => (suppressClick = false), 0);
  }

  stackEl.addEventListener("pointerup", endDrag);
  stackEl.addEventListener("pointercancel", endDrag);

  // Service worker for offline
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  // Init
  draw();
  setStatus(`Turn: <strong>${current}</strong>`);
})();
