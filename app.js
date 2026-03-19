(() => {
  const LS_KEY = "ttt_score_v1";

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  const turnEl = $("turn");
  const scoreXEl = $("scoreX");
  const scoreOEl = $("scoreO");
  const scoreDEl = $("scoreD");

  const btnNew = $("btnNew");
  const btnClear = $("btnClear");

  /** @type {(null|"X"|"O")[]} */
  let cells = Array(9).fill(null);
  let current = "X";
  let locked = false;

  let score = loadScore();
  renderScore();

  function loadScore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { X: 0, O: 0, D: 0 };
      const s = JSON.parse(raw);
      return {
        X: Number(s.X || 0),
        O: Number(s.O || 0),
        D: Number(s.D || 0),
      };
    } catch {
      return { X: 0, O: 0, D: 0 };
    }
  }

  function saveScore() {
    localStorage.setItem(LS_KEY, JSON.stringify(score));
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
    cells = Array(9).fill(null);
    current = next;
    locked = false;
    drawBoard();
    setStatus(`Turn: <strong>${current}</strong>`);
  }

  function resetAll() {
    score = { X: 0, O: 0, D: 0 };
    saveScore();
    renderScore();
    newGame("X");
  }

  function lines() {
    return [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];
  }

  function winner() {
    for (const [a,b,c] of lines()) {
      const v = cells[a];
      if (v && v === cells[b] && v === cells[c]) {
        return { player: v, line: [a,b,c] };
      }
    }
    if (cells.every(Boolean)) return { player: "D", line: [] };
    return null;
  }

  function handleMove(idx) {
    if (locked) return;
    if (cells[idx]) return;

    cells[idx] = current;
    drawBoard();

    const w = winner();
    if (w) {
      locked = true;
      if (w.player === "D") {
        score.D++;
        saveScore();
        renderScore();
        setStatus(`It's a <strong>draw</strong>. Tap <strong>New game</strong>.`);
      } else {
        score[w.player]++;
        saveScore();
        renderScore();
        highlightWin(w.line);
        setStatus(`<strong>${w.player}</strong> wins! Tap <strong>New game</strong>.`);
      }
      return;
    }

    current = current === "X" ? "O" : "X";
    setStatus(`Turn: <strong>${current}</strong>`);
  }

  function highlightWin(line) {
    for (const i of line) {
      const el = boardEl.querySelector(`[data-idx="${i}"]`);
      if (el) el.classList.add("win");
    }
  }

  function drawBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.type = "button";
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", `Cell ${i+1}`);
      btn.dataset.idx = String(i);
      btn.textContent = cells[i] || "";
      if (cells[i] || locked) btn.disabled = true;
      btn.addEventListener("click", () => handleMove(i));
      boardEl.appendChild(btn);
    }
  }

  // Buttons
  btnNew.addEventListener("click", () => {
    // Winner starts next game (nice feel). If draw or fresh, keep alternating.
    const w = winner();
    if (w && (w.player === "X" || w.player === "O")) {
      newGame(w.player);
    } else {
      newGame(current);
    }
  });

  btnClear.addEventListener("click", () => {
    const ok = confirm("Reset game + score?");
    if (ok) resetAll();
  });

  // Service worker for offline
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  // Init
  drawBoard();
  setStatus(`Turn: <strong>${current}</strong>`);
})();
