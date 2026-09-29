(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const mapCanvas = document.getElementById("mapCanvas");
  const mapCtx = mapCanvas.getContext("2d");
  const fireButton = document.getElementById("fireButton");
  const restartButton = document.getElementById("restartButton");
  const stageLabel = document.getElementById("stageLabel");
  const attemptLabel = document.getElementById("attemptLabel");
  const timerLabel = document.getElementById("timerLabel");
  const starCounter = document.getElementById("starCounter");
  const chainLabel = document.getElementById("chainLabel");
  const progressFill = document.getElementById("progressFill");
  const message = document.getElementById("message");
  const hudTip = document.getElementById("hudTip");
  const screens = [...document.querySelectorAll(".screen")];
  const pauseOverlay = document.getElementById("pauseOverlay");
  const mapOverlay = document.getElementById("mapOverlay");

  const VIEW = { w: 1280, h: 720 };
  const TAU = Math.PI * 2;
  const ROTATION_CYCLE = 1;
  const AUTO_COUNTDOWN = 1.5;
  const QUICK_COUNTDOWN = .5;
  const BASE_SHOT_SPEED = 760;
  const AUTO_SPEED_MULTIPLIER = 1.5;
  const COLORS = {
    ink: "#07111d", deep: "#091827", grid: "#17344a", steel: "#5f7f96",
    pale: "#f2efd8", kiwi: "#d9ef62", orange: "#ff9b42", red: "#ff4f64",
    cyan: "#4fe6dc", violet: "#a67cff", earth: "#5a3c35"
  };

  const C = (x, y, type, angle = -Math.PI / 2) => ({
    x, y, baseX: x, baseY: y, type, a: angle
  });
  const LEVELS = [{
    name: "깊은숲 오솔길",
    note: "숲길을 따라 다섯 개의 대포를 연결해 집으로 돌아가세요",
    world: { w: 5000, h: 2450 },
    corridorRadius: 155,
    path: [
      { x: -120, y: 2100 }, { x: 250, y: 2100 }, { x: 1250, y: 1100 },
      { x: 2350, y: 2200 }, { x: 3450, y: 1100 }, { x: 3450, y: 250 },
      { x: 4550, y: 250 }, { x: 5150, y: 250 }
    ],
    cannons: [
      C(250, 2100, "spin45"),
      C(1250, 1100, "spin45"),
      C(2350, 2200, "spin45"),
      C(3450, 1100, "quick"),
      C(3450, 250, "spin90")
    ],
    goal: { x: 4550, y: 250 },
    stars: [],
    iceSurfaces: [],
    conditions: [{ type: "time", value: 60 }, { type: "time", value: 120 }, { type: "time", value: 160 }],
    walls: [], spikes: [], lasers: [], saws: [], bumpers: [], flyers: [], winds: [], pegs: []
  }];

  const STAGE_CATALOG = [
    { name: "깊은숲 오솔길", note: "대포 연결의 기본과 빠른 고정발사를 익히세요.", unlocked: true },
    { name: "얼음 협곡", note: "얼음 표면을 타고 방향을 바꾸는 코스입니다." },
    { name: "나무 위 통로", note: "별을 한 번의 도전에서 모두 모으세요." },
    { name: "안개 숲", note: "먼 대포를 지도에서 먼저 확인하세요." },
    { name: "붉은 절벽", note: "4방향 대포 중심의 고속 코스입니다." },
    { name: "보랏빛 둥지", note: "고정발사 대포가 연속으로 등장합니다." },
    { name: "얼어붙은 수관", note: "슬라이딩과 대포 연결을 조합합니다." },
    { name: "숲의 끝", note: "모든 규칙을 사용하는 최종 코스입니다." }
  ];
  const SAVE_KEY = "kiwi-cannon-save-v2";
  const SKINS = [
    { id: "forest", name: "FOREST KIWI", body: "#d9ef62", shade: "#a8cf47" },
    { id: "berry", name: "BERRY KIWI", body: "#ff7f9f", shade: "#c94f76" },
    { id: "sky", name: "SKY KIWI", body: "#6ee4e6", shade: "#42aeba" },
    { id: "sun", name: "SUN KIWI", body: "#ffd35f", shade: "#df9c3d" }
  ];
  const HATS = [{ id: "none", name: "NONE" }, { id: "cap", name: "CAP" }, { id: "feather", name: "FEATHER" }];

  let levelIndex = 0, level = null, active = 0, attempt = 1, state = "loaded", stateTimer = 0;
  let autoTimer = AUTO_COUNTDOWN, autoBeat = 3, score = 0, combo = 0, bumperLock = null;
  let elapsed = 0, last = performance.now(), messageTimer = 0, audio = null, bgmTimer = null;
  let camera = { x: 0, y: 0, shake: 0 }, player = null, trail = [], particles = [], forestTrees = [];
  let appScreen = "home", paused = false, mapOpen = false, runStarted = false, runTime = 0, finalTime = 0;
  let collectedStars = new Set(), selectedStage = 0, selectedSkin = "forest", selectedHat = "none", iceLock = null;
  let saveData = loadSave();

  function loadSave() {
    const fallback = { records: {}, settings: { master: 80, bgm: 60, se: 85, scanlines: true }, character: { skin: "forest", hat: "none" } };
    try {
      const stored = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      return stored ? { ...fallback, ...stored, settings: { ...fallback.settings, ...stored.settings }, character: { ...fallback.character, ...stored.character } } : fallback;
    } catch { return fallback; }
  }

  function saveProgress() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  function cloneLevel(index) {
    const source = LEVELS[index];
    level = {
      ...source,
      cannons: source.cannons.map(c => ({ ...c, move: c.move ? { ...c.move } : null })),
      bumpers: source.bumpers.map(b => ({ ...b })),
      pegs: source.pegs.map(p => ({ ...p, hit: false })),
      stars: source.stars.map(s => ({ ...s, collected: false })),
      iceSurfaces: source.iceSurfaces.map(s => ({ ...s }))
    };
    level.cannons.forEach((c, i) => {
      if ((c.type === "auto" || c.type === "quick") && level.cannons[i + 1]) {
        const next = level.cannons[i + 1];
        c.a = Math.atan2(next.y - c.y, next.x - c.x);
      } else {
        c.a = -Math.PI / 2;
        c.stepIndex = 0;
        c.stepTimer = 0;
      }
    });
    const geometryErrors = validateLevelGeometry(level);
    if (geometryErrors.length) throw new Error(`플레이 불가능한 맵 구성:\n${geometryErrors.join("\n")}`);
    forestTrees = [];
    for (let x = 35; x < level.world.w; x += 92) {
      for (let y = 36; y < level.world.h; y += 86) {
        const ox = ((x * 17 + y * 11) % 31) - 15;
        const oy = ((x * 7 + y * 19) % 27) - 13;
        const tx = x + ox, ty = y + oy;
        if (pointPolylineDistance(tx, ty, level.path) > level.corridorRadius + 48) {
          forestTrees.push({ x: tx, y: ty, shade: (x + y) % 3, size: 24 + ((x * 3 + y) % 13) });
        }
      }
    }
  }

  function loadLevel(index, announce = true) {
    levelIndex = index; cloneLevel(index); active = 0; state = "loaded"; stateTimer = 0; autoTimer = AUTO_COUNTDOWN; autoBeat = 3; bumperLock = null;
    paused = false; mapOpen = false; runStarted = false; runTime = 0; finalTime = 0; collectedStars = new Set(); iceLock = null;
    trail = []; particles = [];
    player = { x: level.cannons[0].x, y: level.cannons[0].y, vx: 0, vy: 0, r: 15, spin: 0, autoSpin: false };
    camera.x = clamp(player.x - VIEW.w * .36, 0, Math.max(0, level.world.w - VIEW.w));
    camera.y = clamp(player.y - VIEW.h * .52, 0, Math.max(0, level.world.h - VIEW.h));
    if (announce) showMessage(`STAGE ${String(index + 1).padStart(2, "0")} · ${level.name}\n${level.note}`, 1.65);
    updateUI();
  }

  function resetLevel(manual = false) {
    attempt++; playSound("reset"); loadLevel(levelIndex, false); showMessage(manual ? "처음부터" : "다시!", .62);
  }

  function initAudio() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  }

  function tone(freq, duration, type = "square", gain = .05, slide = 0, channel = "se") {
    const master = saveData.settings.master / 100, channelVolume = saveData.settings[channel] / 100;
    if (master <= 0 || channelVolume <= 0) return;
    initAudio();
    const osc = audio.createOscillator(), amp = audio.createGain(), now = audio.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    amp.gain.setValueAtTime(gain * master * channelVolume, now); amp.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(amp).connect(audio.destination); osc.start(now); osc.stop(now + duration);
  }

  function playSound(kind) {
    if (kind === "fire") { tone(105, .2, "sawtooth", .09, -55); setTimeout(() => tone(260, .07, "square", .035, -90), 25); }
    if (kind === "catch") { tone(330, .1, "sine", .06, 210); setTimeout(() => tone(720, .08, "square", .025, -80), 80); }
    if (kind === "bounce") tone(190, .09, "square", .035, 90);
    if (kind === "fail") { tone(150, .28, "sawtooth", .06, -100); tone(86, .35, "square", .035, -40); }
    if (kind === "reset") tone(250, .08, "sine", .025, -80);
    if (kind === "clear") [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, .25, "square", .04, 18), i * 105));
    if (kind === "star") [740, 990, 1320].forEach((f, i) => setTimeout(() => tone(f, .22, "sine", .055, 120), i * 65));
  }

  function startBgm() {
    stopBgm();
    const notes = [110, 147, 165, 147]; let note = 0;
    const tick = () => { if (appScreen === "game" && !paused && !mapOpen) tone(notes[note++ % notes.length], 1.05, "sine", .018, 8, "bgm"); };
    tick(); bgmTimer = setInterval(tick, 1150);
  }
  function stopBgm() { if (bgmTimer) clearInterval(bgmTimer); bgmTimer = null; }

  function fire(forced = false) {
    if (state === "won") { attempt = 1; loadLevel(0); return; }
    if (state !== "loaded") return;
    if ((level.cannons[active].type === "auto" || level.cannons[active].type === "quick") && !forced) return;
    initAudio();
    const c = level.cannons[active];
    if (!runStarted) runStarted = true;
    const isAutoShot = c.type === "auto";
    const speed = BASE_SHOT_SPEED * (isAutoShot ? AUTO_SPEED_MULTIPLIER : 1);
    player.x = c.x + Math.cos(c.a) * 62; player.y = c.y + Math.sin(c.a) * 62;
    player.vx = Math.cos(c.a) * speed; player.vy = Math.sin(c.a) * speed;
    player.spin = 0; player.autoSpin = isAutoShot;
    state = "flying"; camera.shake = 12; burst(player.x, player.y, COLORS.orange, 15, 170); playSound("fire"); updateUI();
  }

  function fail() {
    if (state !== "flying") return;
    state = "dying"; stateTimer = .34; camera.shake = 18;
    burst(player.x, player.y, COLORS.red, 28, 260); playSound("fail"); updateUI();
  }

  function capture(index) {
    active = index; state = "loaded"; trail = []; player.vx = player.vy = 0; player.autoSpin = false;
    autoTimer = level.cannons[index].type === "quick" ? QUICK_COUNTDOWN : AUTO_COUNTDOWN;
    autoBeat = level.cannons[index].type === "quick" ? 1 : 3; bumperLock = null;
    if (level.cannons[index].type !== "auto" && level.cannons[index].type !== "quick") {
      level.cannons[index].a = -Math.PI / 2;
      level.cannons[index].stepIndex = 0;
      level.cannons[index].stepTimer = 0;
    }
    player.x = level.cannons[index].x; player.y = level.cannons[index].y; camera.shake = 7;
    burst(player.x, player.y, COLORS.kiwi, 19, 150); playSound("catch"); showMessage("장전 완료", .42); updateUI();
  }

  function clearLevel() {
    finalTime = runTime;
    state = "clear"; stateTimer = 1.85; camera.shake = 10;
    burst(level.goal.x, level.goal.y, COLORS.kiwi, 55, 300); burst(level.goal.x, level.goal.y, COLORS.orange, 35, 240);
    recordClear();
    playSound("clear"); showMessage(`집에 도착!\n${formatTime(finalTime)} · ★ ${evaluateRun().earned}/3`, 1.75); updateUI();
  }

  function evaluateRun() {
    const allCollected = level.stars.length === 0 || collectedStars.size === level.stars.length;
    const earnedFlags = level.conditions.map(condition => condition.type === "time" ? finalTime <= condition.value : condition.type === "stars" ? allCollected : false);
    return { earnedFlags, earned: earnedFlags.filter(Boolean).length, allCollected };
  }

  function recordClear() {
    const result = evaluateRun(), key = String(levelIndex);
    const prior = saveData.records[key] || { bestTime: null, bestStars: 0, flags: [false, false, false] };
    const runFlags = result.earnedFlags;
    saveData.records[key] = {
      bestTime: prior.bestTime == null ? finalTime : Math.min(prior.bestTime, finalTime),
      bestStars: Math.max(prior.bestStars || 0, result.earned),
      flags: result.earned > (prior.bestStars || 0) ? runFlags : (prior.flags || [false, false, false])
    };
    saveProgress(); renderStageSelect();
  }

  function showMessage(text, duration) {
    message.textContent = text; message.classList.add("show"); messageTimer = duration;
  }

  function autoCountdownNumber() {
    return Math.max(1, Math.ceil(autoTimer * 2));
  }

  function formatTime(seconds) {
    const safe = Math.max(0, seconds || 0), minutes = Math.floor(safe / 60), secs = Math.floor(safe % 60), millis = Math.floor((safe % 1) * 1000);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  }

  function updateUI() {
    stageLabel.textContent = `${String(levelIndex + 1).padStart(2, "0")} · ${level.name}`;
    attemptLabel.textContent = String(attempt).padStart(2, "0");
    timerLabel.textContent = formatTime(state === "clear" || state === "won" ? finalTime : runTime);
    starCounter.querySelector("strong").textContent = `x ${collectedStars.size}${level?.stars.length ? ` / ${level.stars.length}` : ""}`;
    const total = level ? level.cannons.length : 1;
    progressFill.style.width = `${state === "clear" || state === "won" ? 100 : (active / total) * 100}%`;
    chainLabel.textContent = level ? `CANNON ${Math.min(active + 1, total)} / ${total}` : "";
    const autoLoaded = state === "loaded" && (level?.cannons[active]?.type === "auto" || level?.cannons[active]?.type === "quick");
    fireButton.disabled = (state !== "loaded" && state !== "won") || autoLoaded;
    fireButton.classList.toggle("ready", state === "loaded" && !autoLoaded);
    const activeType = level?.cannons[active]?.type;
    fireButton.querySelector("span:last-child").textContent = state === "won" ? "REPLAY" : activeType === "quick" && autoLoaded ? "0.5" : autoLoaded ? String(autoCountdownNumber()) : "FIRE";
    fireButton.querySelector(".fire-button__small").textContent = activeType === "quick" && autoLoaded ? "QUICK" : autoLoaded ? "AUTO" : state === "won" ? "START" : "LOCK &";
    const tips = { spin90: "4방향 전환 — 상 · 좌 · 하 · 우", spin45: "8방향 전환 — 대각선 포함", auto: "3 · 2 · 1 — 빠른 자동 발사", quick: "고정 방향 — 0.5초 뒤 즉시 발사" };
    if (level && state !== "won") hudTip.querySelector("span").textContent = tips[level.cannons[active].type];
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, v = speed * (.25 + Math.random() * .75);
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .35 + Math.random() * .55, max: .9, color, size: 2 + Math.random() * 6 });
    }
  }

  function update(dt) {
    elapsed += dt;
    if (runStarted && (state === "loaded" || state === "flying")) { runTime += dt; timerLabel.textContent = formatTime(runTime); }
    if (messageTimer > 0 && (messageTimer -= dt) <= 0) message.classList.remove("show");
    if (state === "loaded") {
      const currentCannon = level.cannons[active];
      if (currentCannon.type === "spin90" || currentCannon.type === "spin45") {
        const directionCount = currentCannon.type === "spin90" ? 4 : 8;
        const stepDuration = ROTATION_CYCLE / directionCount;
        currentCannon.stepTimer += dt;
        if (currentCannon.stepTimer >= stepDuration) {
          currentCannon.stepTimer %= stepDuration;
          currentCannon.stepIndex = (currentCannon.stepIndex + 1) % directionCount;
          currentCannon.a = -Math.PI / 2 - currentCannon.stepIndex * (TAU / directionCount);
          tone(150, .035, "square", .012, 25);
        }
      }
      player.x += (level.cannons[active].x - player.x) * Math.min(1, dt * 16);
      player.y += (level.cannons[active].y - player.y) * Math.min(1, dt * 16); player.spin += dt * 2;
      if (level.cannons[active].type === "auto" || level.cannons[active].type === "quick") {
        autoTimer -= dt;
        const isQuick = level.cannons[active].type === "quick";
        const nextBeat = isQuick ? (autoTimer > 0 ? 1 : 0) : (autoTimer > 0 ? autoCountdownNumber() : 0);
        if (!isQuick && nextBeat < autoBeat && nextBeat > 0) { autoBeat = nextBeat; tone(260 + (3 - nextBeat) * 90, .09, "square", .035, 30); }
        if (autoTimer <= 0) fire(true); else updateUI();
      }
    } else if (state === "flying") {
      const oldX = player.x, oldY = player.y;
      player.x += player.vx * dt; player.y += player.vy * dt; player.spin += dt * 12;
      trail.push({ x: player.x, y: player.y, life: .34 }); if (trail.length > 26) trail.shift();
      let sliding = false;
      for (let i = 0; i < level.iceSurfaces.length; i++) {
        if (slideOnIce(level.iceSurfaces[i], i, oldX, oldY)) { sliding = true; break; }
      }
      if (!sliding && pointPolylineDistance(player.x, player.y, level.path) > level.corridorRadius - player.r) fail();
      for (const wall of level.walls) {
        if (!wall.bounce || !circleRect(player, wall)) continue;
        const outsideX = oldX + player.r <= wall.x || oldX - player.r >= wall.x + wall.w;
        if (outsideX) player.vx *= -1; else player.vy *= -1;
        player.x = oldX; player.y = oldY; camera.shake = 6; burst(player.x, player.y, COLORS.cyan, 10, 140); playSound("bounce");
      }
      for (const wind of level.winds) {
        if (player.x > wind.x && player.x < wind.x + wind.w && player.y > wind.y && player.y < wind.y + wind.h) {
          player.vx += wind.fx * dt; player.vy += wind.fy * dt;
        }
      }
      for (let i = 0; i < level.bumpers.length; i++) {
        const b = level.bumpers[i], dx = player.x - b.x, dy = player.y - b.y, d = Math.hypot(dx, dy);
        if (d < player.r + b.r && bumperLock !== i) {
          const nx = dx / Math.max(1, d), ny = dy / Math.max(1, d), dot = player.vx * nx + player.vy * ny;
          player.vx = (player.vx - 2 * dot * nx) * 1.04; player.vy = (player.vy - 2 * dot * ny) * 1.04;
          player.x = b.x + nx * (player.r + b.r + 2); player.y = b.y + ny * (player.r + b.r + 2);
          bumperLock = i; combo++; score += 100 * combo; camera.shake = 8;
          burst(player.x, player.y, COLORS.violet, 20, 190); playSound("bounce"); updateUI();
        } else if (bumperLock === i && d > player.r + b.r + 15) bumperLock = null;
      }
      for (const peg of level.pegs) {
        if (!peg.hit && Math.hypot(player.x - peg.x, player.y - peg.y) < player.r + peg.r) {
          peg.hit = true; combo++; score += 50 * combo; burst(peg.x, peg.y, COLORS.orange, 14, 130); tone(420 + combo * 35, .08, "sine", .035, 80); updateUI();
        }
      }
      for (let i = 0; i < level.stars.length; i++) {
        const star = level.stars[i];
        if (!star.collected && pointSegmentDistance(star.x, star.y, oldX, oldY, player.x, player.y) < player.r + 24) {
          star.collected = true; collectedStars.add(i); burst(star.x, star.y, "#ffd967", 34, 220); playSound("star"); showMessage(`별 획득!  ★ ${collectedStars.size}/${level.stars.length}`, .7); updateUI();
        }
      }
      if (level.spikes.some(s => circleRect(player, s))) fail();
      if (state === "flying" && level.lasers.some(isLaserHit)) fail();
      if (state === "flying" && level.saws.some(s => { const p = sawPosition(s); return Math.hypot(player.x - p.x, player.y - p.y) < player.r + s.r - 3; })) fail();
      if (state === "flying" && level.flyers.some(s => { const p = flyerPosition(s); return Math.hypot(player.x - p.x, player.y - p.y) < player.r + s.r - 4; })) fail();
      if (state === "flying") for (let i = active + 1; i < level.cannons.length; i++) {
        const target = level.cannons[i];
        if (pointSegmentDistance(target.x, target.y, oldX, oldY, player.x, player.y) < 66) { capture(i); break; }
      }
      if (state === "flying" && active === level.cannons.length - 1 && pointSegmentDistance(level.goal.x, level.goal.y, oldX, oldY, player.x, player.y) < 68) clearLevel();
      if (state === "flying" && (player.x < -140 || player.y < -160 || player.x > level.world.w + 140 || player.y > level.world.h + 170)) fail();
    } else if (state === "dying") {
      if ((stateTimer -= dt) <= 0) resetLevel(false);
    } else if (state === "clear") {
      if ((stateTimer -= dt) <= 0) {
        if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1);
        else { state = "won"; showMessage("ALL CLEAR · 다시 플레이", 999); updateUI(); }
      }
    }

    for (const t of trail) t.life -= dt; trail = trail.filter(t => t.life > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    const look = state === "flying" ? .22 : 0;
    const targetX = player.x + player.vx * look - VIEW.w * .42, targetY = player.y + player.vy * look - VIEW.h * .52;
    camera.x += (clamp(targetX, 0, Math.max(0, level.world.w - VIEW.w)) - camera.x) * Math.min(1, dt * 4.2);
    camera.y += (clamp(targetY, 0, Math.max(0, level.world.h - VIEW.h)) - camera.y) * Math.min(1, dt * 4.2);
    camera.shake *= Math.pow(.015, dt);
  }

  function circleRect(c, r) {
    const x = clamp(c.x, r.x, r.x + r.w), y = clamp(c.y, r.y, r.y + r.h);
    return (c.x - x) ** 2 + (c.y - y) ** 2 < c.r ** 2;
  }
  function slideOnIce(surface, index, oldX, oldY) {
    const radius = (surface.width || 20) / 2 + player.r;
    if (pointSegmentDistance(player.x, player.y, surface.x1, surface.y1, surface.x2, surface.y2) > radius) {
      if (iceLock === index) iceLock = null;
      return false;
    }
    const dx = surface.x2 - surface.x1, dy = surface.y2 - surface.y1, len = Math.max(1, Math.hypot(dx, dy));
    const tx = dx / len, ty = dy / len, nx = -ty, ny = tx;
    const speed = Math.max(BASE_SHOT_SPEED * .9, Math.hypot(player.vx, player.vy));
    const direction = player.vx * tx + player.vy * ty >= 0 ? 1 : -1;
    const projection = clamp(((player.x - surface.x1) * dx + (player.y - surface.y1) * dy) / (len * len), 0, 1);
    const cx = surface.x1 + dx * projection, cy = surface.y1 + dy * projection;
    const side = (oldX - cx) * nx + (oldY - cy) * ny >= 0 ? 1 : -1;
    player.x = cx + nx * radius * side; player.y = cy + ny * radius * side;
    player.vx = tx * speed * direction; player.vy = ty * speed * direction;
    if (iceLock !== index) { iceLock = index; burst(player.x, player.y, "#8cecff", 18, 140); tone(620, .18, "sine", .035, 160); }
    return true;
  }
  function laserOn(l) { return ((elapsed + l.phase) % l.period) < l.on; }
  function isLaserHit(l) { return laserOn(l) && pointSegmentDistance(player.x, player.y, l.x1, l.y1, l.x2, l.y2) < player.r + 6; }
  function pointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
  function pointPolylineDistance(px, py, path) {
    let min = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      min = Math.min(min, pointSegmentDistance(px, py, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y));
    }
    return min;
  }
  function validateLevelGeometry(candidate) {
    const errors = [], captureRadius = 66;
    for (let i = 0; i < candidate.cannons.length; i++) {
      const source = candidate.cannons[i];
      const target = i < candidate.cannons.length - 1 ? candidate.cannons[i + 1] : candidate.goal;
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const step = source.type === "spin90" ? Math.PI / 2 : source.type === "spin45" ? Math.PI / 4 : null;
      if (step) {
        const snapped = Math.round(angle / step) * step;
        if (Math.abs(normalizeAngle(angle - snapped)) > .001) errors.push(`대포 ${i + 1}: 다음 목표가 허용 방향에 있지 않습니다.`);
      } else if ((source.type === "auto" || source.type === "quick") && Math.abs(normalizeAngle(source.a - angle)) > .001) {
        errors.push(`대포 ${i + 1}: 자동 조준이 다음 대포와 일치하지 않습니다.`);
      }
      const distance = Math.hypot(target.x - source.x, target.y - source.y);
      const samples = Math.ceil(distance / 25);
      for (let sample = 0; sample <= samples; sample++) {
        const t = sample / samples, x = source.x + (target.x - source.x) * t, y = source.y + (target.y - source.y) * t;
        if (pointPolylineDistance(x, y, candidate.path) > candidate.corridorRadius - 18) {
          errors.push(`대포 ${i + 1}: 비행 직선이 숲길 밖으로 벗어납니다.`); break;
        }
      }
      for (let later = i + 2; later < candidate.cannons.length; later++) {
        const other = candidate.cannons[later];
        if (pointSegmentDistance(other.x, other.y, source.x, source.y, target.x, target.y) < captureRadius) {
          errors.push(`대포 ${i + 1}: 다음 대포보다 먼 대포를 건너뛸 수 있습니다.`); break;
        }
      }
      if (!candidate.path.some(p => Math.hypot(p.x - source.x, p.y - source.y) < 1)) errors.push(`대포 ${i + 1}: 통로 중심선 위에 있지 않습니다.`);
    }
    return errors;
  }
  function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }
  function sawPosition(s) {
    const t = .5 - .5 * Math.cos(((elapsed + s.phase) / s.period) * TAU);
    return { x: s.ax + (s.bx - s.ax) * t, y: s.ay + (s.by - s.ay) * t };
  }
  function flyerPosition(s) {
    const t = .5 - .5 * Math.cos(((elapsed + s.phase) / s.period) * TAU);
    return { x: s.ax + (s.bx - s.ax) * t, y: s.ay + (s.by - s.ay) * t };
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    gradient.addColorStop(0, "#153c28"); gradient.addColorStop(1, "#081d17");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    const sx = camera.shake ? (Math.random() - .5) * camera.shake : 0, sy = camera.shake ? (Math.random() - .5) * camera.shake : 0;
    ctx.save(); ctx.translate(-camera.x + sx, -camera.y + sy);
    drawBackground(); level.iceSurfaces.forEach(drawIce); level.winds.forEach(drawWind); level.walls.forEach(drawWall); level.spikes.forEach(drawSpikes);
    level.bumpers.forEach(drawBumper); level.pegs.forEach(drawPeg); level.lasers.forEach(drawLaser);
    level.saws.forEach(drawSaw); level.flyers.forEach(drawFlyer);
    level.stars.forEach(drawStar); drawHouse(level.goal.x, level.goal.y); level.cannons.forEach((c, i) => drawCannon(c, i));
    drawTrail(); if (state === "flying") drawKiwi(); drawParticles(); ctx.restore();
    drawTargetIndicator(); if (state === "loaded") drawReadyReticle();
  }

  function drawBackground() {
    ctx.fillStyle = "#0b2a1d"; ctx.fillRect(0, 0, level.world.w, level.world.h);
    drawPathStroke(level.corridorRadius * 2 + 96, "#06150f");
    drawPathStroke(level.corridorRadius * 2 + 62, "#1f5a34");
    drawPathStroke(level.corridorRadius * 2 + 30, "#4d7f3e");
    drawPathStroke(level.corridorRadius * 2, "#584637");
    drawPathStroke(level.corridorRadius * 2 - 18, "#604b39");

    ctx.fillStyle = "#3d3029"; ctx.globalAlpha = .42;
    for (let i = 0; i < level.path.length - 1; i++) {
      const a = level.path[i], b = level.path[i + 1];
      for (let t = .18; t < 1; t += .24) {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        ctx.fillRect(x - 8, y - 3, 16, 6);
      }
    }
    ctx.globalAlpha = 1;

    for (const tree of forestTrees) {
      if (tree.x < camera.x - 80 || tree.x > camera.x + VIEW.w + 80 || tree.y < camera.y - 90 || tree.y > camera.y + VIEW.h + 90) continue;
      drawTree(tree);
    }
    ctx.fillStyle = "#86b85a"; ctx.font = "700 13px Courier New";
    ctx.fillText(`TRAIL ${String(levelIndex + 1).padStart(2, "0")} // ${level.name}`, camera.x + 26, camera.y + 35);
  }

  function drawPathStroke(width, color) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
    ctx.moveTo(level.path[0].x, level.path[0].y);
    for (let i = 1; i < level.path.length; i++) ctx.lineTo(level.path[i].x, level.path[i].y);
    ctx.stroke();
  }

  function drawTree(tree) {
    const s = tree.size, palette = ["#205a34", "#28693a", "#347946"];
    ctx.fillStyle = "#4a3428"; ctx.fillRect(tree.x - 5, tree.y + s * .28, 10, s * .8);
    ctx.fillStyle = "#173e28"; ctx.fillRect(tree.x - s * .72, tree.y - s * .45, s * 1.44, s * 1.18);
    ctx.fillStyle = palette[tree.shade]; ctx.fillRect(tree.x - s * .55, tree.y - s * .72, s * 1.1, s * 1.2);
    ctx.fillStyle = "#66a34f"; ctx.fillRect(tree.x - s * .34, tree.y - s * .58, s * .42, s * .24);
  }

  function drawWall(w) {
    ctx.fillStyle = w.bounce ? "#124a59" : COLORS.earth; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = w.bounce ? COLORS.cyan : "#779844"; ctx.fillRect(w.x, w.y, w.w, Math.min(10, w.h));
    ctx.fillStyle = w.bounce ? "#24869a" : "#372b2d";
    for (let x = w.x + 8; x < w.x + w.w; x += 32) for (let y = w.y + 22; y < w.y + w.h; y += 28) ctx.fillRect(x, y, 18, 4);
    if (w.bounce) { ctx.strokeStyle = "#8afff5"; ctx.lineWidth = 2; ctx.strokeRect(w.x + 3, w.y + 3, w.w - 6, w.h - 6); }
  }

  function drawIce(surface) {
    ctx.save(); ctx.strokeStyle = "#49bedc"; ctx.lineWidth = (surface.width || 20) + 12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(surface.x1, surface.y1); ctx.lineTo(surface.x2, surface.y2); ctx.stroke();
    ctx.strokeStyle = "#b8f5ff"; ctx.lineWidth = surface.width || 20; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 3; ctx.setLineDash([18, 15]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }

  function drawStar(star) {
    if (star.collected) return;
    const pulse = 1 + Math.sin(elapsed * 6 + star.x) * .1;
    ctx.save(); ctx.translate(star.x, star.y); ctx.scale(pulse, pulse); ctx.rotate(elapsed * .8);
    ctx.shadowColor = "#ffd967"; ctx.shadowBlur = 22; ctx.fillStyle = "#ffd967"; ctx.strokeStyle = "#fff3a8"; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 25; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function drawWind(w) {
    ctx.fillStyle = "rgba(79,230,220,.045)"; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = "rgba(79,230,220,.28)"; ctx.lineWidth = 2; ctx.setLineDash([12, 14]);
    for (let y = w.y + 35; y < w.y + w.h; y += 54) {
      const shift = (elapsed * 75 + y) % 70;
      ctx.beginPath(); ctx.moveTo(w.x + shift, y); ctx.lineTo(w.x + w.w - 18, y - 12); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.fillStyle = COLORS.cyan; ctx.font = "700 12px Courier New"; ctx.textAlign = "center"; ctx.fillText("WIND", w.x + w.w / 2, w.y + 22);
  }

  function drawSpikes(s) {
    ctx.fillStyle = "#cbdae3"; ctx.strokeStyle = COLORS.red; ctx.lineWidth = 2;
    const count = Math.max(1, Math.floor(s.w / 26));
    for (let i = 0; i < count; i++) { const x = s.x + i * s.w / count; ctx.beginPath(); ctx.moveTo(x, s.y + s.h); ctx.lineTo(x + s.w / count / 2, s.y); ctx.lineTo(x + s.w / count, s.y + s.h); ctx.fill(); ctx.stroke(); }
  }

  function drawLaser(l) {
    const on = laserOn(l); ctx.fillStyle = "#607486";
    ctx.fillRect(l.x1 - 13, l.y1 - 13, 26, 26); ctx.fillRect(l.x2 - 13, l.y2 - 13, 26, 26);
    ctx.strokeStyle = on ? COLORS.red : "#472738"; ctx.lineWidth = on ? 8 : 3; ctx.globalAlpha = on ? .35 : .6;
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    if (on) { ctx.globalAlpha = 1; ctx.strokeStyle = "#ffb1b9"; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  function drawSaw(s) {
    const p = sawPosition(s); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(elapsed * 3.4);
    ctx.fillStyle = "#9db0be"; ctx.strokeStyle = "#2a4052"; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? s.r * .72 : s.r; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = COLORS.ink; ctx.beginPath(); ctx.arc(0, 0, s.r * .22, 0, TAU); ctx.fill(); ctx.restore();
  }

  function drawBumper(b) {
    const pulse = 1 + Math.sin(elapsed * 4) * .06; ctx.save(); ctx.translate(b.x, b.y); ctx.scale(pulse, pulse);
    ctx.strokeStyle = COLORS.violet; ctx.lineWidth = 8; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "#eadfff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, b.r - 9, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
  }

  function drawPeg(p) {
    if (p.hit) return;
    const pulse = 1 + Math.sin(elapsed * 5 + p.x) * .12; ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = COLORS.orange; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff3b8"; ctx.beginPath(); ctx.arc(-4, -4, p.r * .35, 0, TAU); ctx.fill(); ctx.restore();
  }

  function drawFlyer(s) {
    const p = flyerPosition(s), flap = Math.sin(elapsed * 15 + s.phase) * 9; ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "#ca4f61"; ctx.fillRect(-12, -8, 24, 16); ctx.fillStyle = "#f0d6b1";
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-30, -11 - flap); ctx.lineTo(-15, 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(30, -11 + flap); ctx.lineTo(15, 5); ctx.fill();
    ctx.fillStyle = COLORS.ink; ctx.fillRect(5, -5, 4, 4); ctx.restore();
  }

  function drawCannon(c, i) {
    const current = i === active && state === "loaded";
    const typeColor = c.type === "spin90" ? COLORS.orange : c.type === "spin45" ? COLORS.cyan : c.type === "quick" ? COLORS.violet : "#6f9cff";
    ctx.save(); ctx.translate(c.x, c.y);

    if (current) {
      ctx.strokeStyle = COLORS.kiwi; ctx.lineWidth = 3; ctx.globalAlpha = .45 + Math.sin(elapsed * 7) * .2;
      ctx.beginPath(); ctx.arc(0, 0, 55 + Math.sin(elapsed * 5) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }

    // Direction ticks stay fixed to the world while the whole cannon rotates.
    if (c.type !== "auto" && c.type !== "quick") {
      const directionCount = c.type === "spin90" ? 4 : 8;
      for (let step = 0; step < directionCount; step++) {
        const markAngle = -Math.PI / 2 - step * (TAU / directionCount);
        const selected = current && step === c.stepIndex;
        ctx.strokeStyle = selected ? COLORS.pale : `${typeColor}88`;
        ctx.lineWidth = selected ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(markAngle) * 45, Math.sin(markAngle) * 45);
        ctx.lineTo(Math.cos(markAngle) * (selected ? 57 : 53), Math.sin(markAngle) * (selected ? 57 : 53));
        ctx.stroke();
      }
    }

    // Muzzle, pot body, highlight, and arrow share one rotation transform.
    ctx.save(); ctx.rotate(c.a);
    ctx.fillStyle = "rgba(4,12,20,.32)";
    ctx.beginPath(); ctx.ellipse(38, 6, 27, 21, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = typeColor; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(17, -11); ctx.quadraticCurveTo(32, -12, 43, -19);
    ctx.lineTo(49, -23); ctx.lineTo(49, 23); ctx.lineTo(43, 19);
    ctx.quadraticCurveTo(32, 12, 17, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath(); ctx.moveTo(23, -8); ctx.quadraticCurveTo(36, -8, 44, -13);
    ctx.lineTo(46, -7); ctx.quadraticCurveTo(35, -2, 23, -4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = typeColor; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(50, 0, 11, 24, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#07151f"; ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(52, 0, 7, 18, 0, 0, TAU); ctx.fill(); ctx.stroke();

    // Smaller convex jar body, wider at the rear and narrowing only toward its mouth.
    ctx.fillStyle = "rgba(4,12,20,.35)";
    ctx.beginPath(); ctx.ellipse(-2, 6, 45, 40, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#17384a"; ctx.strokeStyle = typeColor; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(19, -36);
    ctx.bezierCurveTo(-7, -43, -38, -32, -43, 0);
    ctx.bezierCurveTo(-38, 32, -7, 43, 19, 36);
    ctx.bezierCurveTo(40, 27, 40, -27, 19, -36);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-8, -3, 31, Math.PI * 1.05, Math.PI * 1.58); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.beginPath(); ctx.ellipse(-20, -17, 7, 4, -.35, 0, TAU); ctx.fill();
    ctx.fillStyle = "#0b1f2c"; ctx.strokeStyle = "#86a4b6"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(-2, 0, 29, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = typeColor; ctx.globalAlpha = current ? .32 : .19;
    ctx.beginPath(); ctx.arc(-2, 0, 24, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(5,16,24,.7)"; ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(9, 0); ctx.stroke();
    ctx.fillStyle = "rgba(5,16,24,.7)"; ctx.beginPath();
    ctx.moveTo(23, 0); ctx.lineTo(6, -12); ctx.lineTo(6, 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = COLORS.pale; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = COLORS.pale; ctx.beginPath();
    ctx.moveTo(22, 0); ctx.lineTo(7, -10); ctx.lineTo(7, 10); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();

    const names = { spin90: "90° · 4 WAY", spin45: "45° · 8 WAY", auto: "AUTO", quick: "QUICK · 0.5" };
    ctx.fillStyle = typeColor; ctx.font = "900 12px Courier New"; ctx.textAlign = "center"; ctx.fillText(names[c.type], c.x, c.y + 61);
    if (i === active + 1) { ctx.fillStyle = COLORS.pale; ctx.font = "700 12px Courier New"; ctx.fillText("NEXT", c.x, c.y - 65); }
    if (current && (c.type === "auto" || c.type === "quick")) {
      ctx.fillStyle = COLORS.violet; ctx.font = "900 30px Courier New"; ctx.fillText(c.type === "quick" ? "0.5" : String(autoCountdownNumber()), c.x, c.y - 68);
    }
  }

  function drawKiwi() {
    ctx.save(); ctx.translate(player.x, player.y);
    const flightAngle = Math.atan2(player.vy, player.vx);
    const drawAngle = state === "flying" ? flightAngle + (player.autoSpin ? player.spin : Math.sin(player.spin) * .08) : 0;
    ctx.rotate(drawAngle);
    const skin = SKINS.find(item => item.id === saveData.character.skin) || SKINS[0];
    ctx.fillStyle = skin.shade; ctx.fillRect(-17, -12, 28, 24); ctx.fillStyle = skin.body; ctx.fillRect(-12, -16, 25, 28);
    ctx.fillStyle = COLORS.orange; ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(34, 2); ctx.lineTo(12, 8); ctx.fill();
    ctx.fillStyle = COLORS.ink; ctx.fillRect(5, -9, 5, 5); ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(-7, -12, 7, 5);
    if (saveData.character.hat === "cap") { ctx.fillStyle = COLORS.orange; ctx.fillRect(-9, -22, 21, 7); ctx.fillRect(7, -18, 12, 4); }
    if (saveData.character.hat === "feather") { ctx.strokeStyle = COLORS.violet; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(-10, -31); ctx.stroke(); }
    ctx.restore();
  }

  function drawTrail() {
    for (const t of trail) { ctx.globalAlpha = t.life / .34 * .45; ctx.fillStyle = COLORS.pale; ctx.fillRect(t.x - 3, t.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
  }
  function drawParticles() {
    for (const p of particles) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
  }

  function drawHouse(x, y) {
    const glow = .3 + Math.sin(elapsed * 4) * .1; ctx.fillStyle = `rgba(217,239,98,${glow})`; ctx.fillRect(x - 68, y - 58, 136, 126);
    ctx.fillStyle = "#9e563c"; ctx.fillRect(x - 48, y - 22, 96, 72); ctx.fillStyle = COLORS.orange;
    ctx.beginPath(); ctx.moveTo(x - 62, y - 20); ctx.lineTo(x, y - 75); ctx.lineTo(x + 62, y - 20); ctx.fill();
    ctx.fillStyle = "#412a28"; ctx.fillRect(x - 13, y + 8, 27, 42); ctx.fillStyle = COLORS.kiwi; ctx.fillRect(x - 4, y + 28, 5, 5);
    ctx.fillStyle = "#ffdf75"; ctx.fillRect(x + 22, y - 9, 16, 16); ctx.strokeStyle = "#6b3029"; ctx.lineWidth = 4; ctx.strokeRect(x - 48, y - 22, 96, 72);
    ctx.fillStyle = COLORS.kiwi; ctx.font = "700 12px Courier New"; ctx.textAlign = "center"; ctx.fillText("HOME", x, y - 88);
  }

  function drawTargetIndicator() {
    const target = active < level.cannons.length - 1 ? level.cannons[active + 1] : level.goal;
    const x = target.x - camera.x, y = target.y - camera.y;
    if (x > 48 && x < VIEW.w - 48 && y > 48 && y < VIEW.h - 48) return;
    const cx = VIEW.w / 2, cy = VIEW.h / 2, a = Math.atan2(y - cy, x - cx), margin = 54;
    const scale = Math.min((cx - margin) / Math.max(.001, Math.abs(Math.cos(a))), (cy - margin) / Math.max(.001, Math.abs(Math.sin(a))));
    const ix = cx + Math.cos(a) * scale, iy = cy + Math.sin(a) * scale;
    ctx.save(); ctx.translate(ix, iy); ctx.rotate(a); ctx.fillStyle = COLORS.cyan;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, -12); ctx.lineTo(-5, 0); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = COLORS.pale; ctx.font = "700 12px Courier New"; ctx.textAlign = "center";
    ctx.fillText(`${Math.round(Math.hypot(target.x - player.x, target.y - player.y) / 10)}m`, ix, iy + 29);
  }

  function drawReadyReticle() {
    const c = level.cannons[active], x = c.x - camera.x, y = c.y - camera.y;
    ctx.strokeStyle = COLORS.orange; ctx.lineWidth = 2; ctx.globalAlpha = .65; ctx.beginPath();
    ctx.arc(x, y, 78 + Math.sin(elapsed * 5) * 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function loop(now) {
    const dt = Math.min(.035, (now - last) / 1000); last = now;
    if (appScreen === "game") {
      if (!paused && !mapOpen) update(dt);
      draw();
    }
    requestAnimationFrame(loop);
  }
  function triggerFire(event) { if (event) event.preventDefault(); if (appScreen === "game" && !paused && !mapOpen) fire(); }

  function showScreen(name) {
    const ids = { home: "homeScreen", stages: "stageScreen", customize: "customizeScreen", settings: "settingsScreen", game: "gameScreen" };
    appScreen = name;
    screens.forEach(screen => screen.classList.toggle("active", screen.id === ids[name]));
    if (name !== "game") stopBgm();
    if (name === "stages") renderStageSelect();
    if (name === "customize") renderCustomization();
    last = performance.now();
  }

  function startStage(index) {
    if (!LEVELS[index]) return;
    selectedStage = index; attempt = 1; loadLevel(index, true); showScreen("game"); startBgm();
  }

  function setPaused(value) {
    if (appScreen !== "game" || mapOpen) return;
    paused = value; pauseOverlay.classList.toggle("open", paused); pauseOverlay.setAttribute("aria-hidden", String(!paused));
    if (paused) stopBgm(); else { last = performance.now(); startBgm(); }
  }

  function setMapOpen(value) {
    if (appScreen !== "game" || paused) return;
    mapOpen = value; mapOverlay.classList.toggle("open", mapOpen); mapOverlay.setAttribute("aria-hidden", String(!mapOpen));
    if (mapOpen) { stopBgm(); drawMapPreview(); } else { last = performance.now(); startBgm(); }
  }

  function drawMapPreview() {
    const pad = 42, sx = (mapCanvas.width - pad * 2) / level.world.w, sy = (mapCanvas.height - pad * 2) / level.world.h;
    const scale = Math.min(sx, sy), ox = (mapCanvas.width - level.world.w * scale) / 2, oy = (mapCanvas.height - level.world.h * scale) / 2;
    mapCtx.fillStyle = "#071b16"; mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.strokeStyle = "#315d39"; mapCtx.lineWidth = Math.max(18, level.corridorRadius * 2 * scale + 16); mapCtx.lineCap = "round"; mapCtx.lineJoin = "round";
    mapCtx.beginPath(); mapCtx.moveTo(ox + level.path[0].x * scale, oy + level.path[0].y * scale);
    level.path.slice(1).forEach(p => mapCtx.lineTo(ox + p.x * scale, oy + p.y * scale)); mapCtx.stroke();
    mapCtx.strokeStyle = "#66503b"; mapCtx.lineWidth = Math.max(10, level.corridorRadius * 2 * scale); mapCtx.stroke();
    level.iceSurfaces.forEach(surface => { mapCtx.strokeStyle = "#7be9ff"; mapCtx.lineWidth = 6; mapCtx.beginPath(); mapCtx.moveTo(ox + surface.x1 * scale, oy + surface.y1 * scale); mapCtx.lineTo(ox + surface.x2 * scale, oy + surface.y2 * scale); mapCtx.stroke(); });
    level.stars.forEach(star => { mapCtx.fillStyle = star.collected ? "#6c694e" : "#ffd967"; mapCtx.font = "24px serif"; mapCtx.fillText("★", ox + star.x * scale - 11, oy + star.y * scale + 8); });
    level.cannons.forEach((c, i) => { mapCtx.fillStyle = c.type === "spin45" ? "#e5ece7" : c.type === "spin90" ? COLORS.red : COLORS.violet; mapCtx.strokeStyle = i === active ? COLORS.kiwi : "#07111d"; mapCtx.lineWidth = 4; mapCtx.beginPath(); mapCtx.arc(ox + c.x * scale, oy + c.y * scale, i === active ? 10 : 8, 0, TAU); mapCtx.fill(); mapCtx.stroke(); });
    mapCtx.fillStyle = COLORS.kiwi; mapCtx.font = "bold 25px sans-serif"; mapCtx.fillText("⌂", ox + level.goal.x * scale - 10, oy + level.goal.y * scale + 8);
  }

  function stageConditions(index) {
    if (LEVELS[index]) return LEVELS[index].conditions;
    return [{ type: "time", value: 120 }, { type: "time", value: 160 }, { type: "stars" }];
  }

  function conditionText(condition) {
    return condition.type === "stars" ? "한 번의 도전에서 모든 별 획득" : `${condition.value}초 안에 클리어`;
  }

  function renderStageSelect() {
    const grid = document.getElementById("stageGrid"); grid.textContent = "";
    STAGE_CATALOG.forEach((stage, index) => {
      const record = saveData.records[String(index)] || { bestStars: 0 }, button = document.createElement("button");
      button.type = "button"; button.className = `stage-tile${index === selectedStage ? " selected" : ""}${!LEVELS[index] ? " locked" : ""}`;
      button.innerHTML = `<strong>${index + 1}</strong><span class="tile-stars">${[0,1,2].map(i => `<span class="${i < (record.bestStars || 0) ? "filled" : ""}">★</span>`).join("")}</span>`;
      button.addEventListener("click", () => { selectedStage = index; renderStageSelect(); renderStageDetail(index); }); grid.appendChild(button);
    });
    document.getElementById("totalStars").textContent = `${Object.values(saveData.records).reduce((sum, record) => sum + (record.bestStars || 0), 0)} / ${LEVELS.length * 3}`;
    renderStageDetail(selectedStage);
  }

  function renderStageDetail(index) {
    const meta = STAGE_CATALOG[index], record = saveData.records[String(index)] || { bestTime: null, flags: [false, false, false] };
    document.getElementById("detailNumber").textContent = String(index + 1).padStart(2, "0");
    document.getElementById("detailName").textContent = meta.name; document.getElementById("detailNote").textContent = meta.note;
    const list = document.getElementById("conditionList"); list.textContent = "";
    stageConditions(index).forEach((condition, i) => { const item = document.createElement("div"); item.className = `condition${record.flags?.[i] ? " earned" : ""}`; item.innerHTML = `<span class="star">★</span><span>${conditionText(condition)}</span><em>x1</em>`; list.appendChild(item); });
    document.getElementById("bestTime").textContent = record.bestTime == null ? "--:--.---" : formatTime(record.bestTime);
    const play = document.getElementById("playStageButton"); play.disabled = !LEVELS[index]; play.textContent = LEVELS[index] ? "PLAY" : "COMING SOON";
  }

  function renderCustomization() {
    selectedSkin = saveData.character.skin; selectedHat = saveData.character.hat;
    const skins = document.getElementById("skinOptions"), hats = document.getElementById("hatOptions"); skins.textContent = ""; hats.textContent = "";
    SKINS.forEach(skin => { const button = document.createElement("button"); button.type = "button"; button.className = `swatch${skin.id === selectedSkin ? " selected" : ""}`; button.style.setProperty("--swatch", skin.body); button.setAttribute("aria-label", skin.name); button.addEventListener("click", () => { selectedSkin = skin.id; renderCustomizationPreview(); document.querySelectorAll(".swatch").forEach(item => item.classList.toggle("selected", item === button)); }); skins.appendChild(button); });
    HATS.forEach(hat => { const button = document.createElement("button"); button.type = "button"; button.className = `hat-option${hat.id === selectedHat ? " selected" : ""}`; button.textContent = hat.name; button.addEventListener("click", () => { selectedHat = hat.id; renderCustomizationPreview(); document.querySelectorAll(".hat-option").forEach(item => item.classList.toggle("selected", item === button)); }); hats.appendChild(button); });
    renderCustomizationPreview();
  }

  function renderCustomizationPreview() {
    const skin = SKINS.find(item => item.id === selectedSkin) || SKINS[0], preview = document.getElementById("customKiwi");
    preview.style.setProperty("--body", skin.body); preview.className = `big-kiwi${selectedHat === "cap" ? " hat-cap" : selectedHat === "feather" ? " hat-feather" : ""}`;
    document.getElementById("skinName").textContent = skin.name;
  }

  function applySettingsToUI() {
    const settings = saveData.settings;
    [["masterVolume","masterValue","master"],["bgmVolume","bgmValue","bgm"],["seVolume","seValue","se"]].forEach(([input, output, key]) => { document.getElementById(input).value = settings[key]; document.getElementById(output).value = settings[key]; });
    document.getElementById("scanlineToggle").checked = settings.scanlines; document.getElementById("scanlines").classList.toggle("off", !settings.scanlines);
    document.getElementById("pauseMaster").value = settings.master; document.getElementById("pauseBgm").value = settings.bgm; document.getElementById("pauseSe").value = settings.se;
    const skin = SKINS.find(item => item.id === saveData.character.skin) || SKINS[0]; document.getElementById("homeKiwi").style.setProperty("--body", skin.body);
  }

  fireButton.addEventListener("click", triggerFire); canvas.addEventListener("pointerdown", triggerFire);
  restartButton.addEventListener("click", () => resetLevel(true));
  document.getElementById("startButton").addEventListener("click", () => showScreen("stages"));
  document.getElementById("customizeButton").addEventListener("click", () => showScreen("customize"));
  document.getElementById("settingsButton").addEventListener("click", () => { applySettingsToUI(); showScreen("settings"); });
  document.querySelectorAll("[data-back='home']").forEach(button => button.addEventListener("click", () => showScreen("home")));
  document.getElementById("playStageButton").addEventListener("click", () => startStage(selectedStage));
  document.getElementById("saveCustomButton").addEventListener("click", () => { saveData.character = { skin: selectedSkin, hat: selectedHat }; saveProgress(); applySettingsToUI(); showScreen("home"); });
  ["masterVolume", "bgmVolume", "seVolume"].forEach(id => document.getElementById(id).addEventListener("input", event => { document.getElementById(id.replace("Volume", "Value")).value = event.target.value; }));
  document.getElementById("saveSettingsButton").addEventListener("click", () => { saveData.settings.master = Number(document.getElementById("masterVolume").value); saveData.settings.bgm = Number(document.getElementById("bgmVolume").value); saveData.settings.se = Number(document.getElementById("seVolume").value); saveData.settings.scanlines = document.getElementById("scanlineToggle").checked; saveProgress(); applySettingsToUI(); showScreen("home"); });
  document.getElementById("pauseButton").addEventListener("click", () => setPaused(true)); document.getElementById("resumeButton").addEventListener("click", () => setPaused(false));
  document.getElementById("pauseRestartButton").addEventListener("click", () => { setPaused(false); resetLevel(true); });
  document.getElementById("exitStageButton").addEventListener("click", () => { paused = false; pauseOverlay.classList.remove("open"); showScreen("stages"); });
  [["pauseMaster","master"],["pauseBgm","bgm"],["pauseSe","se"]].forEach(([id,key]) => document.getElementById(id).addEventListener("input", event => { saveData.settings[key] = Number(event.target.value); saveProgress(); }));
  document.getElementById("mapButton").addEventListener("click", () => setMapOpen(true)); document.getElementById("closeMapButton").addEventListener("click", () => setMapOpen(false));
  addEventListener("keydown", e => {
    if (appScreen !== "game") return;
    if (e.key === "Tab" || e.key === "Escape") { e.preventDefault(); if (mapOpen) setMapOpen(false); else setPaused(!paused); return; }
    const uiFocused = e.target instanceof HTMLElement && !!e.target.closest("button, input, select, textarea");
    if ((e.code === "Space" || e.code === "Enter") && !uiFocused && !paused && !mapOpen) triggerFire(e);
    if (e.key.toLowerCase() === "r" && !paused && !mapOpen) resetLevel(true);
  });
  document.addEventListener("visibilitychange", () => { last = performance.now(); if (document.hidden && appScreen === "game" && !paused && !mapOpen) setPaused(true); });

  const debugParams = new URLSearchParams(location.search);
  const requestedStage = clamp(Number(debugParams.get("stage") || 1) - 1, 0, LEVELS.length - 1);
  canvas.width = VIEW.w; canvas.height = VIEW.h; loadLevel(requestedStage, false); applySettingsToUI(); renderStageSelect();
  const requestedCannon = Number(debugParams.get("cannon") || 1) - 1;
  if (requestedCannon > 0 && requestedCannon < level.cannons.length) {
    active = requestedCannon; player.x = level.cannons[active].x; player.y = level.cannons[active].y;
    autoTimer = level.cannons[active].type === "quick" ? QUICK_COUNTDOWN : AUTO_COUNTDOWN; autoBeat = 3; updateUI(); showScreen("game"); startBgm();
  } else if (debugParams.get("play") === "1") { startStage(requestedStage); }
  else showScreen("home");
  requestAnimationFrame(loop);
})();
