const courses = {
  beginner: [
    { icon: "F J", title: "找到基准键", desc: "认识键盘与正确坐姿，记住双手的起点。", text: "fff jjj fjf jfj fff jjj fjfj jfjj", status: "completed" },
    { icon: "ASDF", title: "左手的节奏", desc: "掌握 A S D F，建立左手肌肉记忆。", text: "asdf fdsa sad dad fad sass add fall", status: "current" },
    { icon: "JKL;", title: "右手的节奏", desc: "掌握 J K L ;，让右手稳定地找到位置。", text: "jkl; ;lkj jkj l;l ask lad fall flask", status: "open" },
    { icon: "A—Z", title: "字母大集合", desc: "覆盖全部字母，开始输入完整英文单词。", text: "quick brown fox jumps over the lazy dog", status: "locked" }
  ],
  intermediate: [
    { icon: "⏱", title: "速度热身", desc: "用短词组建立稳定节拍，突破 40 WPM。", text: "time and tide wait for no one keep moving", status: "open" },
    { icon: "，。", title: "中文标点", desc: "练习常用标点与中英文符号切换。", text: "学习，不只是抵达；也是一路发现。", status: "open" },
    { icon: "Aa", title: "大小写切换", desc: "熟练使用 Shift，保持节奏不被打断。", text: "Practice Makes Progress Every Single Day", status: "open" },
    { icon: "123", title: "数字与符号", desc: "掌握数字行和工作中的常用特殊字符。", text: "2026 goal: accuracy > 96% & speed > 60", status: "locked" }
  ],
  advanced: [
    { icon: "</>", title: "代码疾速", desc: "针对括号、缩进和程序符号的专项训练。", text: "const focus = speed => speed * accuracy;", status: "open" },
    { icon: "稿", title: "长文耐力", desc: "在长时间输入中保持速度和准确率。", text: "Great work is built one thoughtful keystroke at a time.", status: "open" },
    { icon: "⚡", title: "极限冲刺", desc: "短时间高强度训练，冲击个人最高速度。", text: "fast focused fluid fearless forward", status: "open" },
    { icon: "🏆", title: "高手认证", desc: "完成综合测试，获得你的键途高手徽章。", text: "Accuracy builds confidence and confidence builds speed.", status: "locked" }
  ]
};

const levelNames = { beginner: "初级", intermediate: "中级", advanced: "高级" };
const courseGrid = document.querySelector("#courseGrid");
const modal = document.querySelector("#practiceModal");
const typingInput = document.querySelector("#typingInput");
const typingText = document.querySelector("#typingText");
const keyboard = document.querySelector("#virtualKeyboard");
const nextLessonButton = document.querySelector("#nextLessonButton");
let activeLevel = "beginner";
let activeCourse = 1;
let targetText = "";
let startedAt = null;
let timerInterval = null;
let mistakes = 0;
let soundEnabled = true;
let audioContext;
const defaultPlayer = { username: "guest", displayName: "游客" };
let authMode = "login";
let currentPlayer = loadCurrentPlayer();
let cloudClient = null;
let cloudUser = null;

function getAccounts() {
  return JSON.parse(localStorage.getItem("keypathAccounts") || "{}");
}

function saveAccounts(accounts) {
  localStorage.setItem("keypathAccounts", JSON.stringify(accounts));
}

function loadCurrentPlayer() {
  return JSON.parse(localStorage.getItem("keypathCurrentPlayer") || "null") || defaultPlayer;
}

function setCurrentPlayer(player) {
  currentPlayer = player;
  localStorage.setItem("keypathCurrentPlayer", JSON.stringify(player));
  saved = getStats();
  refreshAccountUi();
  refreshDashboard();
}

function statsKey() {
  return currentPlayer.username === "guest" ? "keypathStats" : `keypathStats:${currentPlayer.username}`;
}

function getStats() {
  return JSON.parse(localStorage.getItem(statsKey()) || "{}");
}

function saveStats(stats) {
  localStorage.setItem(statsKey(), JSON.stringify(stats));
}

function isCloudConfigured() {
  const config = window.KEYPATH_SUPABASE;
  return Boolean(
    config?.ENABLE_CLOUD_SYNC &&
    config.URL &&
    config.ANON_KEY &&
    window.supabase?.createClient
  );
}

function cloudEnabled() {
  return Boolean(cloudClient && cloudUser);
}

function authEmailFromInput(value) {
  const input = value.trim().toLowerCase();
  if (input.includes("@")) return input;
  return `${cleanUsername(input)}@keypath.local`;
}

function displayNameFromInput(value) {
  const input = value.trim();
  if (input.includes("@")) return input.split("@")[0];
  return cleanUsername(input);
}

async function initCloudSync() {
  if (!isCloudConfigured()) return;

  const config = window.KEYPATH_SUPABASE;
  cloudClient = window.supabase.createClient(config.URL, config.ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const { data } = await cloudClient.auth.getSession();
  if (data.session?.user) {
    await applyCloudUser(data.session.user);
  }

  cloudClient.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) await applyCloudUser(session.user);
    else {
      cloudUser = null;
      setCurrentPlayer(defaultPlayer);
    }
  });
}

async function applyCloudUser(user) {
  cloudUser = user;
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "玩家";
  currentPlayer = { username: user.id, displayName };
  localStorage.setItem("keypathCurrentPlayer", JSON.stringify(currentPlayer));

  const { data: score } = await cloudClient
    .from("scores")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (score) {
    saveStats({
      wpm: score.best_wpm || 0,
      accuracy: score.best_accuracy || 0,
      gameHighScore: score.game_high_score || 0,
      sessions: score.sessions || 0,
      gameSessions: score.game_sessions || 0
    });
  }

  refreshAccountUi();
  refreshDashboard();
}

async function syncStatsToCloud(stats) {
  if (!cloudEnabled()) return;

  const displayName = currentPlayer.displayName || cloudUser.email?.split("@")[0] || "玩家";
  await cloudClient.from("profiles").upsert({
    id: cloudUser.id,
    display_name: displayName,
    updated_at: new Date().toISOString()
  });

  await cloudClient.from("scores").upsert({
    user_id: cloudUser.id,
    display_name: displayName,
    best_wpm: stats.wpm || 0,
    best_accuracy: stats.accuracy || 0,
    game_high_score: stats.gameHighScore || 0,
    sessions: stats.sessions || 0,
    game_sessions: stats.gameSessions || 0,
    updated_at: new Date().toISOString()
  });
}

function cleanUsername(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function playerInitial(name) {
  return (name || "游").slice(0, 1).toUpperCase();
}

function refreshAccountUi() {
  const display = currentPlayer.displayName || currentPlayer.username || "游客";
  document.querySelector("#accountName").textContent = display;
  document.querySelector("#accountAvatar").textContent = playerInitial(display);
  document.querySelector("#authCurrentName").textContent = display;
  document.querySelector("#authCurrentAvatar").textContent = playerInitial(display);
  document.querySelector("#logoutButton").hidden = currentPlayer.username === "guest";
}

function refreshDashboard() {
  const stats = getStats();
  document.querySelector("#averageWpm").textContent = Math.max(32, stats.wpm || 0);
  document.querySelector("#averageAccuracy").textContent = Math.max(94, stats.accuracy || 0);
  document.querySelector("#gameHighScore").textContent = stats.gameHighScore || 0;
  refreshLeaderboards();
}

function getAllPlayerRows() {
  const accounts = getAccounts();
  const rows = [];

  Object.values(accounts).forEach(account => {
    const stats = JSON.parse(localStorage.getItem(`keypathStats:${account.username}`) || "{}");
    rows.push({
      username: account.username,
      displayName: account.displayName || account.username,
      wpm: stats.wpm || 0,
      accuracy: stats.accuracy || 0,
      gameHighScore: stats.gameHighScore || 0,
      sessions: stats.sessions || 0,
      gameSessions: stats.gameSessions || 0
    });
  });

  const guestStats = JSON.parse(localStorage.getItem("keypathStats") || "{}");
  if ((guestStats.wpm || 0) > 0 || (guestStats.gameHighScore || 0) > 0) {
    rows.push({
      username: "guest",
      displayName: "游客",
      wpm: guestStats.wpm || 0,
      accuracy: guestStats.accuracy || 0,
      gameHighScore: guestStats.gameHighScore || 0,
      sessions: guestStats.sessions || 0,
      gameSessions: guestStats.gameSessions || 0
    });
  }

  return rows;
}

async function getCloudPlayerRows() {
  if (!cloudClient) return [];

  const { data, error } = await cloudClient
    .from("scores")
    .select("user_id, display_name, best_wpm, best_accuracy, game_high_score, sessions, game_sessions")
    .order("game_high_score", { ascending: false })
    .limit(100);

  if (error) {
    showToast("云端排行榜读取失败，请检查 Supabase 权限");
    return [];
  }

  return (data || []).map(row => ({
    username: row.user_id,
    displayName: row.display_name || "玩家",
    wpm: row.best_wpm || 0,
    accuracy: row.best_accuracy || 0,
    gameHighScore: row.game_high_score || 0,
    sessions: row.sessions || 0,
    gameSessions: row.game_sessions || 0
  }));
}

function renderLeaderboard(listId, rows, scoreKey, emptyText, unit) {
  const list = document.querySelector(listId);
  const ranked = rows
    .filter(row => row[scoreKey] > 0)
    .sort((a, b) => b[scoreKey] - a[scoreKey])
    .slice(0, 10);

  if (!ranked.length) {
    list.innerHTML = `<li class="leaderboard-empty">${emptyText}</li>`;
    return ranked;
  }

  list.innerHTML = ranked.map((row, index) => `
    <li class="${row.username === currentPlayer.username ? "current-player" : ""}">
      <span class="rank-number">${index + 1}</span>
      <span class="rank-player">
        <strong>${escapeHtml(row.displayName)}</strong>
        <small>${row.sessions + row.gameSessions} 次记录</small>
      </span>
      <span class="rank-score">${row[scoreKey]}${unit}</span>
    </li>
  `).join("");

  return ranked;
}

async function refreshLeaderboards() {
  const rows = cloudClient ? await getCloudPlayerRows() : getAllPlayerRows();
  const speedRanked = renderLeaderboard("#speedLeaderboard", rows, "wpm", "还没有速度记录。完成一次练习后就会上榜。", "");
  const gameRanked = renderLeaderboard("#gameLeaderboard", rows, "gameHighScore", "还没有游戏记录。玩一局游戏后就会上榜。", "");
  const speedIndex = speedRanked.findIndex(row => row.username === currentPlayer.username);
  const gameIndex = gameRanked.findIndex(row => row.username === currentPlayer.username);
  const parts = [];

  if (speedIndex >= 0) parts.push(`速度榜第 ${speedIndex + 1} 名`);
  if (gameIndex >= 0) parts.push(`游戏榜第 ${gameIndex + 1} 名`);

  document.querySelector("#myRankText").textContent = parts.length
    ? parts.join(" · ")
    : "先登录并完成一次练习或游戏";
}

function renderCourses(level) {
  activeLevel = level;
  courseGrid.innerHTML = courses[level].map((course, index) => {
    const labels = { completed: "再练一次", current: "继续学习 →", open: "开始练习 →", locked: "🔒 完成前一课程后解锁" };
    return `
      <article class="course-card ${course.status}">
        <span class="course-index">LESSON ${String(index + 1).padStart(2, "0")}</span>
        <div class="course-icon">${course.icon}</div>
        <h3>${course.title}</h3>
        <p>${course.desc}</p>
        <button data-index="${index}" ${course.status === "locked" ? "disabled" : ""}>${labels[course.status]}</button>
      </article>`;
  }).join("");

  courseGrid.querySelectorAll("button:not(:disabled)").forEach(button => {
    button.addEventListener("click", () => openPractice(level, Number(button.dataset.index)));
  });
}

document.querySelectorAll(".level-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelector(".level-tab.active").classList.remove("active");
    tab.classList.add("active");
    renderCourses(tab.dataset.level);
  });
});

function renderKeyboard() {
  const rows = ["QWERTYUIOP", "ASDFGHJKL;", "ZXCVBNM", " "];
  keyboard.innerHTML = rows.map(row => `
    <div class="key-row">${[...row].map(key =>
      `<span class="key ${key === " " ? "space" : ""}" data-key="${key === " " ? "Space" : key.toUpperCase()}">${key === " " ? "SPACE" : key}</span>`
    ).join("")}</div>`).join("");
}

function openPractice(level, index) {
  activeLevel = level;
  activeCourse = index;
  const course = courses[level][index];
  targetText = course.text;
  document.querySelector("#practiceLevel").textContent = `${levelNames[level]} · 第 ${index + 1} 课`;
  document.querySelector("#practiceTitle").textContent = course.title;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  resetPractice();
  setTimeout(() => typingInput.focus(), 100);
}

function closePractice() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  clearInterval(timerInterval);
}

function resetPractice() {
  typingInput.value = "";
  startedAt = null;
  mistakes = 0;
  clearInterval(timerInterval);
  document.querySelector("#timer").textContent = "00:00";
  document.querySelector("#liveWpm").textContent = "0";
  document.querySelector("#liveAccuracy").textContent = "100%";
  nextLessonButton.hidden = true;
  renderText();
}

function renderText() {
  const typed = typingInput.value;
  typingText.innerHTML = [...targetText].map((char, index) => {
    let state = "";
    if (index < typed.length) state = typed[index] === char ? "correct" : "wrong";
    else if (index === typed.length) state = "current";
    return `<span class="${state}">${char === " " ? "&nbsp;" : escapeHtml(char)}</span>`;
  }).join("");
}

function escapeHtml(char) {
  return char.replace(/[&<>"']/g, match => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[match]);
}

function updateStats() {
  if (!startedAt) return;
  const elapsedSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
  const minutes = elapsedSeconds / 60;
  const typed = typingInput.value;
  const correct = [...typed].filter((char, i) => char === targetText[i]).length;
  const accuracy = typed.length ? Math.round(correct / typed.length * 100) : 100;
  const wpm = Math.round((correct / 5) / minutes);
  const min = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const sec = String(elapsedSeconds % 60).padStart(2, "0");
  document.querySelector("#timer").textContent = `${min}:${sec}`;
  document.querySelector("#liveWpm").textContent = Math.min(wpm, 300);
  document.querySelector("#liveAccuracy").textContent = `${accuracy}%`;
}

function playKeySound(isError = false) {
  if (!soundEnabled) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = isError ? 120 : 250 + Math.random() * 40;
  gain.gain.setValueAtTime(.045, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .045);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + .05);
}

typingInput.addEventListener("input", event => {
  if (!startedAt && typingInput.value.length) {
    startedAt = Date.now();
    timerInterval = setInterval(updateStats, 500);
  }
  const lastIndex = typingInput.value.length - 1;
  const isError = lastIndex >= 0 && typingInput.value[lastIndex] !== targetText[lastIndex];
  if (isError) mistakes++;
  playKeySound(isError);
  renderText();
  updateStats();

  if (typingInput.value.length >= targetText.length) finishPractice();
});

typingInput.addEventListener("keydown", event => {
  const keyName = event.code === "Space" ? "Space" : event.key.toUpperCase();
  const key = keyboard.querySelector(`[data-key="${CSS.escape(keyName)}"]`);
  key?.classList.add("active");
  setTimeout(() => key?.classList.remove("active"), 90);
});

function finishPractice() {
  clearInterval(timerInterval);
  updateStats();
  nextLessonButton.hidden = false;
  const wpm = Number(document.querySelector("#liveWpm").textContent);
  const accuracy = Number(document.querySelector("#liveAccuracy").textContent.replace("%", ""));
  const best = getStats();
  best.wpm = Math.max(best.wpm || 0, wpm);
  best.accuracy = Math.max(best.accuracy || 0, accuracy);
  best.sessions = (best.sessions || 0) + 1;
  saveStats(best);
  syncStatsToCloud(best);
  document.querySelector("#averageWpm").textContent = Math.max(32, best.wpm);
  document.querySelector("#averageAccuracy").textContent = Math.max(94, best.accuracy);
  refreshDashboard();
  showToast(`完成！${wpm} WPM · ${accuracy}% 准确率`);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

document.querySelector("#typingArea").addEventListener("click", () => typingInput.focus());
document.querySelector("#closeModal").addEventListener("click", closePractice);
document.querySelector(".modal-backdrop").addEventListener("click", closePractice);
document.querySelector("#restartButton").addEventListener("click", () => { resetPractice(); typingInput.focus(); });
document.querySelector("#continueButton").addEventListener("click", () => openPractice("beginner", 1));
document.querySelector("#cardStartButton").addEventListener("click", () => openPractice("beginner", 1));
document.querySelector("#quickTestButton").addEventListener("click", () => openPractice("intermediate", 0));
document.querySelector("#soundToggle").addEventListener("click", event => {
  soundEnabled = !soundEnabled;
  event.currentTarget.classList.toggle("muted", !soundEnabled);
  showToast(soundEnabled ? "按键声音已开启" : "按键声音已关闭");
});
document.querySelector("#reportButton").addEventListener("click", () => showToast("完整学习报告正在路上 ✦"));

function openAuth() {
  document.querySelector("#authModal").classList.add("open");
  document.querySelector("#authModal").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.querySelector("#authUsername").focus(), 100);
}

function closeAuth() {
  document.querySelector("#authModal").classList.remove("open");
  document.querySelector("#authModal").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === "register";
  document.querySelector("#showLogin").classList.toggle("active", !isRegister);
  document.querySelector("#showRegister").classList.toggle("active", isRegister);
  document.querySelector("#authSubmit").innerHTML = isRegister ? "创建账号 <span>→</span>" : "登录 <span>→</span>";
  document.querySelector("#authNote").textContent = isRegister
    ? "可以直接输入玩家名注册；也可以输入邮箱注册。"
    : "登录后会切换到该玩家的独立练习记录、游戏最高分和全站排行榜。";
  document.querySelector("#authPassword").autocomplete = isRegister ? "new-password" : "current-password";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const rawName = document.querySelector("#authUsername").value;
  const username = cleanUsername(rawName);
  const password = document.querySelector("#authPassword").value;

  if (!rawName.trim() || (!rawName.includes("@") && username.length < 3)) {
    showToast("请输入邮箱，或至少 3 位玩家名");
    return;
  }

  if (!password || password.length < 4) {
    showToast("密码至少 4 位");
    return;
  }

  if (cloudClient) {
    const email = authEmailFromInput(rawName);
    const displayName = displayNameFromInput(rawName);

    if (authMode === "register") {
      const { data, error } = await cloudClient.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } }
      });

      if (error) {
        showToast(error.message);
        return;
      }

      if (data.user && data.session) {
        await applyCloudUser(data.user);
        await syncStatsToCloud(getStats());
        showToast(`云端账号已创建：${displayName}`);
        closeAuth();
      } else {
        showToast("账号已创建，请先完成邮箱确认再登录");
      }
      return;
    }

    const { data, error } = await cloudClient.auth.signInWithPassword({ email, password });
    if (error) {
      showToast(error.message);
      return;
    }

    await applyCloudUser(data.user);
    showToast(`已云端登录：${displayName}`);
    closeAuth();
    return;
  }

  const accounts = getAccounts();

  if (authMode === "register") {
    if (accounts[username]) {
      showToast("这个玩家名已经被使用");
      return;
    }
    accounts[username] = {
      username,
      displayName: username,
      password,
      createdAt: new Date().toISOString()
    };
    saveAccounts(accounts);
    setCurrentPlayer({ username, displayName: username });
    showToast(`欢迎，${username}`);
    closeAuth();
    return;
  }

  if (!accounts[username] || accounts[username].password !== password) {
    showToast("玩家名或密码不正确");
    return;
  }

  setCurrentPlayer({ username, displayName: accounts[username].displayName || username });
  showToast(`已登录：${username}`);
  closeAuth();
}

document.querySelector("#accountButton").addEventListener("click", openAuth);
document.querySelector("#closeAuth").addEventListener("click", closeAuth);
document.querySelector(".auth-backdrop").addEventListener("click", closeAuth);
document.querySelector("#showLogin").addEventListener("click", () => setAuthMode("login"));
document.querySelector("#showRegister").addEventListener("click", () => setAuthMode("register"));
document.querySelector("#authForm").addEventListener("submit", handleAuthSubmit);
document.querySelector("#logoutButton").addEventListener("click", async () => {
  if (cloudClient) await cloudClient.auth.signOut();
  setCurrentPlayer(defaultPlayer);
  showToast("已退出账号，当前为游客模式");
  closeAuth();
});

nextLessonButton.addEventListener("click", () => {
  const nextIndex = (activeCourse + 1) % courses[activeLevel].length;
  const next = courses[activeLevel][nextIndex];
  if (next.status === "locked") {
    showToast("下一课程将在正式版中按进度解锁");
    closePractice();
  } else {
    openPractice(activeLevel, nextIndex);
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && modal.classList.contains("open")) closePractice();
  if (event.key === "Escape" && document.querySelector("#authModal").classList.contains("open")) closeAuth();
});

let saved = getStats();
refreshAccountUi();
refreshDashboard();
initCloudSync();

renderKeyboard();
renderCourses("beginner");

// Typing games
const gameModal = document.querySelector("#gameModal");
const gameArena = document.querySelector("#gameArena");
const arenaMessage = document.querySelector("#arenaMessage");
const gameWords = {
  rain: [..."asdfjklqwertyuiopzxcvbnm"],
  survival: ["type", "fast", "code", "focus", "skill", "learn", "quick", "speed", "keyboard", "master"],
  sprint: ["go", "run", "flow", "swift", "dash", "power", "level", "combo", "rocket", "victory"]
};
const gameSettings = {
  rain: { title: "字母雨", label: "入门 · 认键", lives: 5, spawn: 1150, speed: 0.065, points: 10 },
  survival: { title: "单词生存战", label: "进阶 · 单词", lives: 3, spawn: 1700, speed: 0.045, points: 25 },
  sprint: { title: "极速 30 秒", label: "高手 · 竞速", lives: Infinity, spawn: 800, speed: 0.07, points: 20, duration: 30 }
};
let gameMode = "rain";
let gameRunning = false;
let gameStarted = false;
let gameScore = 0;
let gameCombo = 0;
let gameLives = 3;
let gameTime = 30;
let gameTargets = [];
let gameTyped = "";
let gameAnimation = null;
let gameSpawnTimer = null;
let gameCountdown = null;
let lastFrame = 0;
let targetId = 0;

function openGame(mode) {
  gameMode = mode;
  const setting = gameSettings[mode];
  document.querySelector("#gameTitle").textContent = setting.title;
  document.querySelector("#gameModeLabel").textContent = setting.label;
  document.querySelector("#gameThirdLabel").textContent = mode === "sprint" ? "时间" : "生命";
  gameModal.classList.add("open");
  gameModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  resetGame();
  setTimeout(() => gameArena.focus(), 100);
}

function closeGame() {
  stopGame();
  gameModal.classList.remove("open");
  gameModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function resetGame() {
  stopGame();
  gameArena.querySelectorAll(".falling-word").forEach(item => item.remove());
  gameScore = 0;
  gameCombo = 0;
  gameLives = gameSettings[gameMode].lives;
  gameTime = gameSettings[gameMode].duration || 0;
  gameTargets = [];
  gameTyped = "";
  gameStarted = false;
  document.querySelector("#gameScore").textContent = "0";
  document.querySelector("#gameCombo").textContent = "0×";
  updateGameThird();
  arenaMessage.classList.remove("hidden");
  arenaMessage.innerHTML = "<span>准备好了吗？</span><strong>按任意字母开始</strong>";
}

function startGame() {
  if (gameRunning) return;
  gameRunning = true;
  gameStarted = true;
  arenaMessage.classList.add("hidden");
  spawnTarget();
  gameSpawnTimer = setInterval(spawnTarget, gameSettings[gameMode].spawn);
  lastFrame = performance.now();
  gameAnimation = requestAnimationFrame(gameLoop);
  if (gameMode === "sprint") {
    gameCountdown = setInterval(() => {
      gameTime--;
      updateGameThird();
      if (gameTime <= 0) endGame("时间到！");
    }, 1000);
  }
}

function stopGame() {
  gameRunning = false;
  cancelAnimationFrame(gameAnimation);
  clearInterval(gameSpawnTimer);
  clearInterval(gameCountdown);
}

function spawnTarget() {
  if (!gameRunning || gameTargets.length >= (gameMode === "rain" ? 8 : 5)) return;
  const pool = gameWords[gameMode];
  const word = pool[Math.floor(Math.random() * pool.length)];
  const element = document.createElement("div");
  element.className = "falling-word";
  element.innerHTML = `<span class="typed"></span><span>${word}</span>`;
  const x = 9 + Math.random() * 82;
  element.style.left = `${x}%`;
  element.style.top = "-45px";
  gameArena.appendChild(element);
  gameTargets.push({ id: targetId++, word, typed: "", x, y: -45, element });
}

function gameLoop(now) {
  if (!gameRunning) return;
  const delta = Math.min(now - lastFrame, 40);
  lastFrame = now;
  const setting = gameSettings[gameMode];
  gameTargets.forEach(target => {
    const difficulty = 1 + gameScore / 1200;
    target.y += delta * setting.speed * difficulty;
    target.element.style.top = `${target.y}px`;
  });
  const limit = gameArena.clientHeight - 72;
  gameTargets.filter(target => target.y >= limit).forEach(missTarget);
  gameAnimation = requestAnimationFrame(gameLoop);
}

function handleGameKey(key) {
  if (!/^[a-z]$/i.test(key)) return;
  const lower = key.toLowerCase();
  if (!gameStarted) {
    startGame();
    return;
  }
  if (!gameRunning) return;

  let target = gameTargets.find(item => item.typed && item.word[item.typed.length] === lower);
  if (!target) {
    target = gameTargets
      .filter(item => !item.typed && item.word[0] === lower)
      .sort((a, b) => b.y - a.y)[0];
  }

  if (!target) {
    gameCombo = 0;
    document.querySelector("#gameCombo").textContent = "0×";
    playKeySound(true);
    gameArena.classList.add("game-error");
    setTimeout(() => gameArena.classList.remove("game-error"), 100);
    return;
  }

  gameTargets.forEach(item => item.element.classList.toggle("active", item.id === target.id));
  target.typed += lower;
  target.element.innerHTML = `<span class="typed">${target.typed}</span><span>${target.word.slice(target.typed.length)}</span>`;
  document.querySelector("#gameCursor").style.left = `${target.x}%`;
  playKeySound(false);
  if (target.typed === target.word) hitTarget(target);
}

function hitTarget(target) {
  gameCombo++;
  const multiplier = Math.min(5, 1 + Math.floor(gameCombo / 5));
  gameScore += gameSettings[gameMode].points * multiplier;
  document.querySelector("#gameScore").textContent = gameScore;
  document.querySelector("#gameCombo").textContent = `${gameCombo}×`;
  target.element.classList.add("hit");
  gameTargets = gameTargets.filter(item => item.id !== target.id);
  setTimeout(() => target.element.remove(), 230);
  if (gameMode === "rain" && gameTargets.length < 2) spawnTarget();
}

function missTarget(target) {
  target.element.remove();
  gameTargets = gameTargets.filter(item => item.id !== target.id);
  gameCombo = 0;
  document.querySelector("#gameCombo").textContent = "0×";
  if (gameMode !== "sprint") {
    gameLives--;
    updateGameThird();
    if (gameLives <= 0) endGame("挑战结束");
  }
}

function updateGameThird() {
  document.querySelector("#gameThirdValue").textContent =
    gameMode === "sprint" ? `${gameTime}s` : "♥ ".repeat(Math.max(0, gameLives)).trim();
}

function endGame(message) {
  stopGame();
  const stats = getStats();
  stats.gameHighScore = Math.max(stats.gameHighScore || 0, gameScore);
  stats.gameSessions = (stats.gameSessions || 0) + 1;
  saveStats(stats);
  syncStatsToCloud(stats);
  document.querySelector("#gameHighScore").textContent = stats.gameHighScore;
  refreshDashboard();
  arenaMessage.classList.remove("hidden");
  arenaMessage.innerHTML = `<span>${message}</span><strong>${gameScore} 分 · ${gameCombo} 最高连击</strong><button class="primary-button" id="playAgain">再来一局 <span>↻</span></button>`;
  document.querySelector("#playAgain").addEventListener("click", () => {
    resetGame();
    gameArena.focus();
  });
}

document.querySelectorAll(".game-start").forEach(button => {
  button.addEventListener("click", () => openGame(button.dataset.game));
});
document.querySelector("#closeGame").addEventListener("click", closeGame);
document.querySelector(".game-backdrop").addEventListener("click", closeGame);
document.querySelector("#restartGame").addEventListener("click", () => {
  resetGame();
  gameArena.focus();
});
document.addEventListener("keydown", event => {
  if (!gameModal.classList.contains("open")) return;
  if (event.key === "Escape") {
    closeGame();
    return;
  }
  event.preventDefault();
  handleGameKey(event.key);
});

refreshDashboard();
