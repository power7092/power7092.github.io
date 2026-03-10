import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const defaultConfig = {
  githubUsername: "power7092",
  repoName: "power7092.github.io",
  siteTitle: "power7092.github.io",
  siteUrl: "https://power7092.github.io",
  githubProfileUrl: "https://github.com/power7092",
  githubScopes: "read:user",
  supabaseUrl: "",
  supabaseAnonKey: "",
};

const config = {
  ...defaultConfig,
  ...(window.SITE_CONFIG || {}),
};

const placeholders = ["YOUR_GITHUB_ID", "your_github_id", "your-github-id"];
const hasConfiguredUsername =
  typeof config.githubUsername === "string" &&
  config.githubUsername.trim() !== "" &&
  !placeholders.some((value) => config.githubUsername.includes(value));
const hasSupabaseConfig =
  typeof config.supabaseUrl === "string" &&
  typeof config.supabaseAnonKey === "string" &&
  config.supabaseUrl.trim() !== "" &&
  config.supabaseAnonKey.trim() !== "";

const siteTitle = document.getElementById("siteTitle");
const profileLink = document.getElementById("profileLink");
const siteLink = document.getElementById("siteLink");
const repoHint = document.getElementById("repoHint");
const configWarning = document.getElementById("configWarning");
const authStatus = document.getElementById("authStatus");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const repoList = document.getElementById("repoList");

let supabaseClient = null;

initializeSiteShell();
await initializeAuth();

function initializeSiteShell() {
  siteTitle.textContent = config.siteTitle;
  profileLink.href = config.githubProfileUrl;
  profileLink.textContent = hasConfiguredUsername ? `@${config.githubUsername}` : "GitHub Profile";
  siteLink.href = config.siteUrl;
  siteLink.textContent = config.siteUrl;
  repoHint.textContent = config.repoName;
  configWarning.hidden = hasConfiguredUsername && hasSupabaseConfig;

  renderProfileCard({
    avatarUrl: "https://avatars.githubusercontent.com/u/9919?s=200&v=4",
    name: hasConfiguredUsername ? config.githubUsername : "GitHub User",
    username: hasConfiguredUsername ? config.githubUsername : "your_github_id",
    bio: hasConfiguredUsername
      ? "Loading public GitHub profile data."
      : "Fill in site-config.js to connect your own GitHub profile.",
  });

  if (hasConfiguredUsername) {
    void loadGitHubProfile(config.githubUsername);
  } else {
    repoList.innerHTML = '<p class="empty-state">Add a GitHub username in site-config.js.</p>';
  }
}

async function initializeAuth() {
  if (!hasSupabaseConfig) {
    loginButton.disabled = true;
    authStatus.textContent =
      "GitHub login is disabled until you add Supabase public values in site-config.js.";
    return;
  }

  supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    authStatus.textContent = `Session check failed: ${error.message}`;
  } else {
    await renderSession(data.session?.user || null);
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    void renderSession(session?.user || null);
  });

  loginButton.addEventListener("click", handleLogin);
  logoutButton.addEventListener("click", handleLogout);
}

async function handleLogin() {
  if (!supabaseClient) {
    return;
  }

  authStatus.textContent = "Redirecting to GitHub login...";
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      scopes: config.githubScopes,
    },
  });

  if (error) {
    authStatus.textContent = `Login request failed: ${error.message}`;
  }
}

async function handleLogout() {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    authStatus.textContent = `Logout failed: ${error.message}`;
  }
}

async function renderSession(user) {
  if (!user) {
    logoutButton.hidden = true;
    loginButton.hidden = false;
    authStatus.textContent = hasConfiguredUsername
      ? "Signed out. Public GitHub profile data is shown below."
      : "Signed out. Configure site-config.js first.";

    if (hasConfiguredUsername) {
      await loadGitHubProfile(config.githubUsername);
    }
    return;
  }

  logoutButton.hidden = false;
  loginButton.hidden = true;

  const username =
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.user_metadata?.name ||
    config.githubUsername;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || username;
  const avatarUrl = user.user_metadata?.avatar_url || "https://avatars.githubusercontent.com/u/9919?s=200&v=4";
  const bio = user.user_metadata?.email
    ? `Connected with ${user.user_metadata.email}.`
    : "GitHub account connected.";

  authStatus.textContent = `Signed in as ${displayName}.`;
  renderProfileCard({
    avatarUrl,
    name: displayName,
    username,
    bio,
  });

  if (username) {
    await loadGitHubProfile(username);
  }
}

function renderProfileCard({ avatarUrl, name, username, bio }) {
  profileAvatar.src = avatarUrl;
  profileAvatar.alt = `${username} avatar`;
  profileName.textContent = name;
  profileUsername.textContent = `@${username}`;
  profileBio.textContent = bio;
}

async function loadGitHubProfile(username) {
  try {
    repoList.innerHTML = '<p class="empty-state">Loading GitHub repositories...</p>';

    const [profileResponse, repoResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`),
    ]);

    if (!profileResponse.ok || !repoResponse.ok) {
      throw new Error("GitHub API response was not successful.");
    }

    const profile = await profileResponse.json();
    const repos = await repoResponse.json();

    renderProfileCard({
      avatarUrl: profile.avatar_url,
      name: profile.name || profile.login,
      username: profile.login,
      bio: profile.bio || "No bio available for this profile.",
    });

    renderRepoList(repos);
  } catch (error) {
    repoList.innerHTML = `<p class="empty-state">Failed to load repositories: ${escapeHtml(error.message)}</p>`;
  }
}

function renderRepoList(repos) {
  if (!Array.isArray(repos) || repos.length === 0) {
    repoList.innerHTML = '<p class="empty-state">No public repositories found.</p>';
    return;
  }

  repoList.innerHTML = repos
    .map((repo) => {
      const language = escapeHtml(repo.language || "No language");
      const name = escapeHtml(repo.name);
      const description = escapeHtml(repo.description || "No repository description.");
      const repoUrl = escapeAttribute(repo.html_url);
      const updatedAt = new Date(repo.updated_at).toLocaleDateString("en-US");

      return `
        <a class="repo-item" href="${repoUrl}" target="_blank" rel="noreferrer">
          <p class="repo-name">${name}</p>
          <p class="repo-description">${description}</p>
          <div class="repo-meta">
            <span>${language}</span>
            <span>Star ${repo.stargazers_count}</span>
            <span>Updated ${updatedAt}</span>
          </div>
        </a>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

const boardSize = 15;
const cellCount = boardSize - 1;
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const restartButton = document.getElementById("restartButton");

const padding = 40;
const gridSize = (canvas.width - padding * 2) / cellCount;
const directions = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

let board = createBoard();
let moveCount = 0;
let gameOver = false;
let aiThinking = false;
let winningLine = null;

function createBoard() {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
}

function resetGame() {
  board = createBoard();
  moveCount = 0;
  gameOver = false;
  aiThinking = false;
  winningLine = null;
  setStatus("Your turn.");
  drawBoard();
}

function setStatus(message) {
  statusText.textContent = message;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWoodTexture();
  drawGrid();
  drawStarPoints();
  drawStones();
  drawWinningLine();
}

function drawWoodTexture() {
  ctx.save();
  ctx.fillStyle = "#ddb27b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const woodGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  woodGradient.addColorStop(0, "rgba(255,255,255,0.16)");
  woodGradient.addColorStop(0.5, "rgba(120,65,22,0.06)");
  woodGradient.addColorStop(1, "rgba(87,43,14,0.12)");
  ctx.fillStyle = woodGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(118, 66, 29, ${0.04 + (i % 3) * 0.01})`;
    ctx.lineWidth = 10 + i;
    ctx.moveTo(-20, 40 + i * 55);
    ctx.bezierCurveTo(
      canvas.width * 0.25,
      10 + i * 45,
      canvas.width * 0.6,
      90 + i * 46,
      canvas.width + 20,
      55 + i * 54
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(56, 31, 13, 0.78)";
  ctx.lineWidth = 1.1;

  for (let i = 0; i < boardSize; i += 1) {
    const offset = padding + i * gridSize;

    ctx.beginPath();
    ctx.moveTo(padding, offset);
    ctx.lineTo(canvas.width - padding, offset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, padding);
    ctx.lineTo(offset, canvas.height - padding);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStarPoints() {
  const points = [3, 7, 11];
  ctx.save();
  ctx.fillStyle = "rgba(56, 31, 13, 0.88)";

  points.forEach((row) => {
    points.forEach((col) => {
      const { x, y } = gridToCanvas(row, col);
      ctx.beginPath();
      ctx.arc(x, y, 4.4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  ctx.restore();
}

function drawStones() {
  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const color = board[row][col];
      if (!color) {
        continue;
      }

      const { x, y } = gridToCanvas(row, col);
      const gradient = ctx.createRadialGradient(x - 8, y - 10, 4, x, y, 24);
      if (color === "black") {
        gradient.addColorStop(0, "#666");
        gradient.addColorStop(0.35, "#2a2a2a");
        gradient.addColorStop(1, "#050505");
      } else {
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.45, "#efebe5");
        gradient.addColorStop(1, "#c9c1b5");
      }

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, gridSize * 0.38, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = color === "black" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
      ctx.arc(x, y, gridSize * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawWinningLine() {
  if (!winningLine) {
    return;
  }

  const start = gridToCanvas(winningLine.start.row, winningLine.start.col);
  const end = gridToCanvas(winningLine.end.row, winningLine.end.col);

  ctx.save();
  ctx.strokeStyle = "rgba(213, 46, 46, 0.82)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function gridToCanvas(row, col) {
  return {
    x: padding + col * gridSize,
    y: padding + row * gridSize,
  };
}

function getCellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const col = Math.round((x - padding) / gridSize);
  const row = Math.round((y - padding) / gridSize);

  if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
    return null;
  }

  const target = gridToCanvas(row, col);
  if (Math.hypot(x - target.x, y - target.y) > gridSize * 0.42) {
    return null;
  }

  return { row, col };
}

function placeStone(row, col, color) {
  board[row][col] = color;
  moveCount += 1;
  drawBoard();
}

function handlePlayerMove(event) {
  if (gameOver || aiThinking) {
    return;
  }

  const cell = getCellFromEvent(event);
  if (!cell || board[cell.row][cell.col]) {
    return;
  }

  placeStone(cell.row, cell.col, "black");

  const winInfo = getWinInfo(cell.row, cell.col, "black");
  if (winInfo) {
    winningLine = winInfo.line;
    gameOver = true;
    drawBoard();
    setStatus("You win.");
    return;
  }

  if (moveCount === boardSize * boardSize) {
    gameOver = true;
    setStatus("Draw.");
    return;
  }

  aiThinking = true;
  setStatus("AI is thinking...");
  window.setTimeout(runAiTurn, 260);
}

function runAiTurn() {
  if (gameOver) {
    return;
  }

  const move = chooseAiMove();
  if (!move) {
    gameOver = true;
    aiThinking = false;
    setStatus("Draw.");
    return;
  }

  placeStone(move.row, move.col, "white");
  aiThinking = false;

  const winInfo = getWinInfo(move.row, move.col, "white");
  if (winInfo) {
    winningLine = winInfo.line;
    gameOver = true;
    drawBoard();
    setStatus("AI wins.");
    return;
  }

  if (moveCount === boardSize * boardSize) {
    gameOver = true;
    setStatus("Draw.");
    return;
  }

  setStatus("Your turn.");
}

function chooseAiMove() {
  if (moveCount === 1 && !board[7][7]) {
    return { row: 7, col: 7 };
  }

  const candidates = getCandidateMoves();
  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of candidates) {
    if (wouldWin(move.row, move.col, "white")) {
      return move;
    }
  }

  for (const move of candidates) {
    if (wouldWin(move.row, move.col, "black")) {
      return move;
    }
  }

  for (const move of candidates) {
    const attackScore = evaluateMove(move.row, move.col, "white");
    const defenseScore = evaluateMove(move.row, move.col, "black");
    const centerBias = getCenterBias(move.row, move.col);
    const score = attackScore * 1.05 + defenseScore * 1.18 + centerBias;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function getCandidateMoves() {
  if (moveCount === 0) {
    return [{ row: 7, col: 7 }];
  }

  const candidates = [];

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      if (board[row][col]) {
        continue;
      }

      if (!hasNearbyStone(row, col, 2)) {
        continue;
      }

      candidates.push({ row, col });
    }
  }

  return candidates.length > 0 ? candidates : [{ row: 7, col: 7 }];
}

function hasNearbyStone(row, col, distance) {
  for (let r = Math.max(0, row - distance); r <= Math.min(boardSize - 1, row + distance); r += 1) {
    for (let c = Math.max(0, col - distance); c <= Math.min(boardSize - 1, col + distance); c += 1) {
      if (board[r][c]) {
        return true;
      }
    }
  }

  return false;
}

function evaluateMove(row, col, color) {
  let total = 0;

  for (const [dr, dc] of directions) {
    total += evaluateDirection(row, col, dr, dc, color);
  }

  return total;
}

function evaluateDirection(row, col, dr, dc, color) {
  const forward = scanDirection(row, col, dr, dc, color);
  const backward = scanDirection(row, col, -dr, -dc, color);
  const count = 1 + forward.count + backward.count;
  const openEnds = forward.open + backward.open;
  const jumpPotential = forward.jump + backward.jump;

  return getPatternScore(count, openEnds, jumpPotential);
}

function scanDirection(row, col, dr, dc, color) {
  let count = 0;
  let jump = 0;
  let open = 0;
  let step = 1;

  while (true) {
    const nextRow = row + dr * step;
    const nextCol = col + dc * step;
    if (!isInside(nextRow, nextCol)) {
      break;
    }

    const cell = board[nextRow][nextCol];
    if (cell === color) {
      count += 1;
      step += 1;
      continue;
    }

    if (cell === null) {
      const jumpRow = nextRow + dr;
      const jumpCol = nextCol + dc;
      if (isInside(jumpRow, jumpCol) && board[jumpRow][jumpCol] === color) {
        jump = 1;
      }
      open = 1;
    }
    break;
  }

  return { count, open, jump };
}

function getPatternScore(count, openEnds, jumpPotential) {
  if (count >= 5) {
    return 1000000;
  }
  if (count === 4 && openEnds === 2) {
    return 120000;
  }
  if (count === 4 && openEnds === 1) {
    return 22000;
  }
  if (count === 3 && openEnds === 2) {
    return jumpPotential ? 18000 : 12000;
  }
  if (count === 3 && openEnds === 1) {
    return jumpPotential ? 6000 : 2400;
  }
  if (count === 2 && openEnds === 2) {
    return jumpPotential ? 1800 : 900;
  }
  if (count === 2 && openEnds === 1) {
    return 260;
  }
  if (count === 1 && openEnds === 2) {
    return 80;
  }
  return 12;
}

function getCenterBias(row, col) {
  const center = (boardSize - 1) / 2;
  return 40 - (Math.abs(row - center) + Math.abs(col - center)) * 4;
}

function wouldWin(row, col, color) {
  board[row][col] = color;
  const result = Boolean(getWinInfo(row, col, color));
  board[row][col] = null;
  return result;
}

function getWinInfo(row, col, color) {
  for (const [dr, dc] of directions) {
    let count = 1;
    let start = { row, col };
    let end = { row, col };

    let r = row + dr;
    let c = col + dc;
    while (isInside(r, c) && board[r][c] === color) {
      count += 1;
      end = { row: r, col: c };
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = col - dc;
    while (isInside(r, c) && board[r][c] === color) {
      count += 1;
      start = { row: r, col: c };
      r -= dr;
      c -= dc;
    }

    if (count >= 5) {
      return { line: { start, end } };
    }
  }

  return null;
}

function isInside(row, col) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

canvas.addEventListener("click", handlePlayerMove);
restartButton.addEventListener("click", resetGame);

resetGame();
