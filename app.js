/* global Chess, Peer */
const PIECES = { p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚" };
const $ = (id) => document.getElementById(id);
let chess = new Chess(), mode = "computer", difficulty = "easy", selected = null, peer = null, connection = null, roomCode = "", resigned = false, playerColor = "w";
let lastMove = null;

function show(id, visible) { $(id).classList.toggle("hidden", !visible); }
function toast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2800); }
function beginGame(nextMode, level = "easy") {
  mode = nextMode; difficulty = level; chess = new Chess(); selected = null; lastMove = null; resigned = false;
  show("lobby", false); show("game", true); render();
}
function render() {
  const board = $("board"); board.innerHTML = "";
  const history = chess.history({ verbose: true }); lastMove = history.at(-1);
  const isHumanTurn = mode === "local" || (mode === "computer" && chess.turn() === "w") || (mode === "online" && chess.turn() === playerColor);
  const legalTargets = selected ? chess.moves({ square: selected, verbose: true }).map((m) => m.to) : [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const square = String.fromCharCode(97 + col) + (8 - row), piece = chess.get(square);
    const el = document.createElement("div");
    el.className = `square ${(row + col) % 2 ? "dark" : "light"}`;
    if (selected === square) el.classList.add("selected");
    if (lastMove && (lastMove.from === square || lastMove.to === square)) el.classList.add("last");
    if (legalTargets.includes(square)) {
      el.classList.add("legal");
      if (piece) el.classList.add("capture");
    }
    el.innerHTML = piece ? `<span class="piece ${piece.color === "w" ? "white" : "black"}">${PIECES[piece.type]}</span>` : "";
    el.addEventListener("click", () => clickSquare(square));
    board.appendChild(el);
  }
  const turn = chess.turn() === "w" ? "White" : "Black";
  const over = resigned || chess.game_over();
  $("game-title").textContent = over ? resultText() : (isHumanTurn ? "Your turn" : mode === "online" ? "Waiting for your friend…" : mode === "computer" ? "Computer is thinking…" : `${turn} to move`);
  $("status-text").textContent = over ? resultText() : `${turn} to move`;
  $("status-detail").textContent = over
    ? "Start a new game for a rematch."
    : mode === "computer" && !isHumanTurn
      ? `${difficulty[0].toUpperCase() + difficulty.slice(1)} difficulty`
      : mode === "online" && !isHumanTurn
        ? "Waiting for your friend to move."
        : "Select a piece to begin.";
  const cardPiece = $("white-player").querySelector(".player-piece");
  const cardName = $("white-player").querySelector("strong");
  const cardColor = $("white-player").querySelector("small");
  if (mode === "online") {
    cardPiece.textContent = playerColor === "w" ? "♔" : "♚";
    cardName.textContent = "You";
    cardColor.textContent = playerColor === "w" ? "White" : "Black";
  } else {
    cardPiece.textContent = "♔";
    cardName.textContent = "You";
    cardColor.textContent = "White";
  }
  $("white-player").classList.toggle("active", chess.turn() === playerColor && !over);
  $("move-list").innerHTML = "";
  for (let i = 0; i < history.length; i += 2) {
    const li = document.createElement("li"); li.innerHTML = `<span>${i / 2 + 1}</span><b>${history[i]?.san || ""}</b><b>${history[i + 1]?.san || ""}</b>`; $("move-list").appendChild(li);
  }
  if (isHumanTurn === false && !over && mode === "computer") setTimeout(computerMove, 280);
}
function resultText() {
  if (resigned) return "You resigned";
  if (chess.in_checkmate()) return `${chess.turn() === "w" ? "Black" : "White"} wins`;
  if (chess.in_draw()) return "Draw game";
  return "Game over";
}
function clickSquare(square) {
  if (chess.game_over() || (mode === "computer" && chess.turn() !== "w") || (mode === "online" && chess.turn() !== playerColor)) return;
  const piece = chess.get(square);
  if (selected) {
    const move = chess.moves({ square: selected, verbose: true }).find((m) => m.to === square);
    if (move) { makeMove({ from: selected, to: square, promotion: "q" }); selected = null; render(); return; }
  }
  if (piece && piece.color === chess.turn() && (mode === "local" || piece.color === playerColor)) { selected = square; render(); }
}
function makeMove(move, broadcast = true) {
  if (mode === "online" && broadcast && !connection?.open) {
    toast("Friend connection was lost. Rejoin using the invite link.");
    return false;
  }
  let result;
  try { result = chess.move(move); } catch (error) {
    toast(`Move could not be made: ${error.message}`);
    return false;
  }
  if (result && broadcast && mode === "online") {
    connection.send({ type: "move", move: { from: result.from, to: result.to, promotion: result.promotion } });
  }
  return Boolean(result);
}
function computerMove() {
  if (mode !== "computer" || chess.turn() !== "b" || chess.game_over()) return;
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return;
  let chosen = moves[Math.floor(Math.random() * moves.length)];
  if (difficulty !== "easy") {
    const scored = moves.map((move) => {
      chess.move(move); const score = evaluatePosition() + (move.captured ? 80 : 0); chess.undo(); return { move, score };
    }).sort((a, b) => b.score - a.score);
    const count = difficulty === "hard" ? Math.min(3, scored.length) : Math.min(7, scored.length);
    chosen = scored[Math.floor(Math.random() * count)].move;
  }
  if (difficulty === "hard") chosen = minimaxRoot(2);
  makeMove({ from: chosen.from, to: chosen.to, promotion: chosen.promotion || "q" }); render();
}
function evaluatePosition() {
  const values = { p:100, n:320, b:330, r:500, q:900, k:20000 }; let score = 0;
  for (const file of "abcdefgh") for (let rank = 1; rank <= 8; rank++) { const p = chess.get(`${file}${rank}`); if (p) score += (p.color === "b" ? 1 : -1) * values[p.type]; }
  return score;
}
function minimaxRoot(depth) {
  let best = -Infinity, choice = chess.moves({ verbose: true })[0];
  for (const move of chess.moves({ verbose: true })) { chess.move(move); const score = minimax(depth - 1, false); chess.undo(); if (score > best) { best = score; choice = move; } }
  return choice;
}
function minimax(depth, maximizing) {
  if (!depth || chess.game_over()) return evaluatePosition();
  let best = maximizing ? -Infinity : Infinity;
  for (const move of chess.moves({ verbose: true })) { chess.move(move); const score = minimax(depth - 1, !maximizing); chess.undo(); best = maximizing ? Math.max(best, score) : Math.min(best, score); }
  return best;
}
function createOnlineRoom() {
  if (!window.Peer) { toast("Online service could not load. Check your connection."); return; }
  playerColor = "w"; peer = new Peer();
  peer.on("open", (id) => {
    roomCode = id; $("invite-code").textContent = id.slice(-6).toUpperCase();
    const url = `${location.href.split("#")[0]}#join=${id}`;
    $("copy-link").dataset.link = url; show("invite-panel", true);
  });
  peer.on("connection", (conn) => {
    if (connection?.open) { conn.close(); return; }
    setupConnection(conn);
    beginGame("online");
    $("invite-status").textContent = "Friend connected. You are White.";
    toast("Friend joined your game.");
  });
  peer.on("error", (error) => {
    $("invite-status").textContent = error.message || "Could not create an invite. Please try again.";
    toast("Could not create an invite. Please try again.");
  });
}
function joinOnlineRoom(id) {
  if (!window.Peer) { toast("Online service could not load. Check your connection."); return; }
  playerColor = "b"; peer = new Peer();
  peer.on("open", () => {
    connection = peer.connect(id);
    setupConnection(connection);
  });
  peer.on("error", (error) => {
    $("invite-status").textContent = error.message || "Could not join this game. Check the invite link and try again.";
    toast("Could not join this game. Check the invite link and try again.");
  });
}
function setupConnection(conn) {
  connection = conn;
  conn.on("open", () => {
    if (playerColor === "b") beginGame("online");
    $("invite-status").textContent = playerColor === "w" ? "Friend connected. You are White." : "Connected. You are Black.";
  });
  conn.on("data", (data) => {
    if (!data || data.type !== "move" || !data.move || chess.turn() === playerColor) return;
    const moved = makeMove(data.move, false);
    if (!moved) {
      toast("Received an invalid move. The game may be out of sync.");
      return;
    }
    render();
  });
  conn.on("close", () => {
    $("invite-status").textContent = "Friend disconnected. Share a new invite link to play again.";
    toast("Friend disconnected.");
  });
  conn.on("error", () => {
    $("invite-status").textContent = "Connection error. Check both players' internet connections.";
    toast("Connection error. Check your internet connection.");
  });
}
$("computer-btn").onclick = () => beginGame("computer", $("difficulty").value);
$("local-btn").onclick = () => beginGame("local");
$("online-btn").onclick = createOnlineRoom;
$("copy-link").onclick = async (event) => { const link = event.currentTarget.dataset.link; try { await navigator.clipboard.writeText(link); toast("Invite link copied."); } catch { toast(link); } };
$("back-btn").onclick = () => { show("game", false); show("lobby", true); };
$("new-game-btn").onclick = () => beginGame(mode, difficulty);
$("resign-btn").onclick = () => { if (!chess.game_over() && !resigned) { toast("You resigned."); resigned = true; render(); } };
const joinId = new URLSearchParams(location.hash.replace("#", "?")).get("join");
if (joinId) { joinOnlineRoom(joinId); $("invite-status").textContent = "Connecting to your friend's game…"; show("invite-panel", true); }
