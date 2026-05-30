const avatar = document.querySelector(".avatar");
const world = document.querySelector(".world");
const ground = document.querySelector(".ground");
const heartIcons = Array.from(document.querySelectorAll(".lives .heart"));
const gameOverScreen = document.querySelector(".game-over-screen");
const enterRestartHitbox = document.querySelector(".game-over-enter-hitbox");
const coinScore = document.querySelector(".coin-score");
const coinScoreCanvas = document.querySelector(".coin-score-canvas");
const startScreen = document.querySelector(".start-screen");
const startMessageText = document.querySelector(".start-message-text");
const startEnterButton = document.querySelector(".start-enter-button");
const backgroundMusic = document.querySelector(".background-music");
const coinScoreContext =
  coinScoreCanvas && coinScoreCanvas.getContext
    ? coinScoreCanvas.getContext("2d")
    : null;

const DESIGN_WIDTH = 1024;
const DESIGN_HEIGHT = 512;
const TILE_SIZE = 50;
const GROUND_TILE_BUFFER = 4;
const START_X = 0;
const LEVEL_TRANSITION_MS = 280;

const avatarSprites = [
  "assets/images/avatar-sprite.png",
  "assets/images/avatar -sprite-hatsune.png",
  "assets/images/avatar -sprite-naruto.png",
  "assets/images/avatar -sprite-goku.png",
  "assets/images/avatar -sprite-sailor moon.png",
];

const groundBottom = 40;
const speed = 6;
const avatarWidth = 50;
const avatarHeight = 75;

const enemyWidth = 25;
const enemyHeight = 37.5;
const enemySpeed = 3.1;

const ENEMY_SPAWN_INTERVAL_MS = 10000;
const MAX_COINS_PER_QUESTION_BLOCK = 2;
const MAX_COINS_LAST_QUESTION_BLOCK = 6;
const PLAYER_INVINCIBLE_MS = 1500;
const BLINK_INTERVAL_MS = 60;
const COIN_SCORE_BLINK_MS = 440;
const PLAYER_STOMP_CONTACT_MARGIN = 10;
const SOLID_SURFACE_TOLERANCE = 6;
const CEILING_COLLISION_TOLERANCE = 5;
const SURFACE_SNAP_RANGE = 18;
const FALL_SPEED = 6.2;
const JUMP_HEIGHT = 160;
const JUMP_DURATION_MS = 560;
const STOMP_BOUNCE_HEIGHT = 65;
const STOMP_BOUNCE_DURATION_MS = 320;
const ENEMY_STOMP_REMOVE_MS = 260;
const ENEMY_SPIN_DEFEAT_MS = 350;
const ENEMY_KNOCKBACK_PUSH = 28;
const MAX_HEARTS = 3;
const HEART_LOSS_ANIM_MS = 460;
const GAME_OVER_FADE_MS = 900;
const START_SCREEN_HIDE_MS = 280;
const START_TYPING_INTERVAL_MS = 34;
const BACKGROUND_MUSIC_VOLUME = 0.35;
const START_TYPING_TEXT_DESKTOP =
  "Bem-vindo ao Jogo Cosplay Otaku! Explore o cen\u00e1rio kawaii, pule nos blocos e sobreviva aos inimigos. Pressione ENTER para come\u00e7ar a aventura!";
const START_TYPING_TEXT_MOBILE =
  "Este jogo foi desenvolvido apenas para desktop.\nPara jogar corretamente, acesse pelo computador usando teclado.\n- Cosplay Otaku";
const COIN_SCORE_SPRITE_SRC = "assets/images/coin-count-sprite.png";
const COIN_SCORE_CANVAS_WIDTH = 162;
const COIN_SCORE_CANVAS_HEIGHT = 76;
const COIN_SCORE_FRAME_PADDING = 4;
const COIN_SCORE_FRAMES = [
  { x: 14, y: 42, width: 110, height: 68, label: "1" },
  { x: 161, y: 42, width: 118, height: 68, label: "2" },
  { x: 304, y: 42, width: 115, height: 68, label: "3" },
  { x: 447, y: 42, width: 121, height: 68, label: "4" },
  { x: 593, y: 42, width: 115, height: 69, label: "5" },
  { x: 728, y: 42, width: 115, height: 69, label: "6" },
  { x: 14, y: 175, width: 113, height: 68, label: "7" },
  { x: 161, y: 174, width: 112, height: 68, label: "8" },
  { x: 304, y: 174, width: 113, height: 69, label: "9" },
  { x: 439, y: 175, width: 130, height: 68, label: "10" },
  { x: 591, y: 176, width: 154, height: 66, label: "10+" },
];
const COIN_SCORE_MAX_INDEX = COIN_SCORE_FRAMES.length - 1;

const ENEMY_STATES = {
  WALK: "walk",
  HIT: "hit",
};

if (!avatar || !world) {
  throw new Error("Elementos .avatar ou .world nao encontrados.");
}

let positionX = START_X;
let currentBottom = groundBottom;
let avatarSpriteIndex = 0;

let isJumping = false;
let isAscending = false;
let isTransitioning = false;
let jumpCycle = 0;

let playerInvincibleUntil = 0;
let playerBlinkTimerId = 0;
let playerHearts = MAX_HEARTS;
let heartLossTimerIds = [];
let isGameOver = false;
let controlsLocked = false;
let gameOverRevealTimerId = 0;
let enemySpawnElapsedMs = 0;
let enemySpawnLastTickMs = 0;
let isSiteActive = true;
let coinScoreIndex = 0;
let coinScoreBlinkTimerId = 0;
let coinScoreChangeTimerId = 0;
let coinScoreIsChanging = false;
let coinScorePendingSteps = 0;
let coinScoreSpriteLoaded = false;
let hasGameStarted = false;
let startTypingTimerId = 0;
let startTypingIndex = 0;

const coinScoreSprite = new Image();

let enemy = null;
let enemySpawned = false;
let enemyX = 0;
let enemyBottom = groundBottom;
let enemyState = ENEMY_STATES.WALK;
let enemyRemoving = false;
let enemyHitResolveTimerId = 0;

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
};

function detectMobileStartLock() {
  const coarsePointerMatch = window.matchMedia
    ? window.matchMedia("(pointer: coarse)").matches
    : false;
  const finePointerMatch = window.matchMedia
    ? window.matchMedia("(pointer: fine)").matches
    : false;
  const smallViewportMatch = window.matchMedia
    ? window.matchMedia("(max-width: 900px)").matches
    : false;
  const mobileUserAgentMatch =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  return mobileUserAgentMatch || (coarsePointerMatch && !finePointerMatch && smallViewportMatch);
}

const isMobileStartLocked = detectMobileStartLock();

function getStartTypingText() {
  return isMobileStartLocked ? START_TYPING_TEXT_MOBILE : START_TYPING_TEXT_DESKTOP;
}

function setControlsLocked(locked) {
  controlsLocked = locked;

  if (locked) {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  }
}

function configureBackgroundMusic() {
  if (!backgroundMusic) {
    return;
  }

  backgroundMusic.volume = BACKGROUND_MUSIC_VOLUME;
  backgroundMusic.loop = true;
}

function playBackgroundMusic() {
  if (!backgroundMusic || !backgroundMusic.paused) {
    return;
  }

  const playPromise = backgroundMusic.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function registerBackgroundMusicUnlock() {
  if (!backgroundMusic) {
    return;
  }

  const unlockMusic = () => {
    playBackgroundMusic();

    if (backgroundMusic.paused) {
      return;
    }

    window.removeEventListener("pointerdown", unlockMusic);
    window.removeEventListener("touchstart", unlockMusic);
    window.removeEventListener("keydown", unlockMusic);
  };

  window.addEventListener("pointerdown", unlockMusic, { passive: true });
  window.addEventListener("touchstart", unlockMusic, { passive: true });
  window.addEventListener("keydown", unlockMusic);
}

function hideGameOverScreen() {
  if (!gameOverScreen) {
    return;
  }

  gameOverScreen.classList.remove("show");
}

function showGameOverScreen() {
  if (!gameOverScreen) {
    return;
  }

  gameOverScreen.classList.add("show");
}

function clearStartTypingTimer() {
  if (startTypingTimerId) {
    window.clearInterval(startTypingTimerId);
    startTypingTimerId = 0;
  }
}

function playStartTypewriter() {
  if (!startMessageText) {
    return;
  }

  const typingText = getStartTypingText();

  clearStartTypingTimer();
  startTypingIndex = 0;
  startMessageText.textContent = "";
  startMessageText.classList.remove("typing-done");

  startTypingTimerId = window.setInterval(() => {
    startTypingIndex += 1;
    startMessageText.textContent = typingText.slice(0, startTypingIndex);

    if (startTypingIndex < typingText.length) {
      return;
    }

    clearStartTypingTimer();
    startMessageText.classList.add("typing-done");
  }, START_TYPING_INTERVAL_MS);
}

function hideStartScreen() {
  if (!startScreen) {
    return;
  }

  startScreen.classList.add("hide");
  startScreen.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    startScreen.classList.add("hidden");
  }, START_SCREEN_HIDE_MS);
}

function startGame() {
  if (isMobileStartLocked) {
    return;
  }

  if (hasGameStarted) {
    return;
  }

  hasGameStarted = true;
  clearStartTypingTimer();
  hideStartScreen();
  playBackgroundMusic();
  setControlsLocked(false);
  updateSiteActiveState();
  resetEnemySpawnTimer();
  updateAvatar();
}

function updateCoinScoreAriaLabel() {
  if (!coinScore) {
    return;
  }

  const currentFrame = COIN_SCORE_FRAMES[coinScoreIndex];
  coinScore.setAttribute("aria-label", `Contador de moedas: ${currentFrame.label}`);
}

function drawCoinScoreFrame() {
  if (!coinScoreCanvas || !coinScoreContext || !coinScoreSpriteLoaded) {
    return;
  }

  const frame = COIN_SCORE_FRAMES[coinScoreIndex];
  coinScoreContext.clearRect(0, 0, coinScoreCanvas.width, coinScoreCanvas.height);
  const maxDrawWidth = coinScoreCanvas.width - COIN_SCORE_FRAME_PADDING * 2;
  const maxDrawHeight = coinScoreCanvas.height - COIN_SCORE_FRAME_PADDING * 2;
  const scale = Math.min(maxDrawWidth / frame.width, maxDrawHeight / frame.height);
  const drawWidth = Math.round(frame.width * scale);
  const drawHeight = Math.round(frame.height * scale);
  const drawX = Math.round((coinScoreCanvas.width - drawWidth) / 2);
  const drawY = Math.round((coinScoreCanvas.height - drawHeight) / 2);

  coinScoreContext.drawImage(
    coinScoreSprite,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  );
}

function clearCoinScoreBlinkTimer() {
  if (coinScoreBlinkTimerId) {
    window.clearTimeout(coinScoreBlinkTimerId);
    coinScoreBlinkTimerId = 0;
  }
}

function clearCoinScoreChangeTimer() {
  if (coinScoreChangeTimerId) {
    window.clearTimeout(coinScoreChangeTimerId);
    coinScoreChangeTimerId = 0;
  }
}

function triggerCoinScoreBlink() {
  if (!coinScore) {
    return;
  }

  clearCoinScoreBlinkTimer();
  coinScore.classList.remove("coin-score-blink");
  void coinScore.offsetWidth;
  coinScore.classList.add("coin-score-blink");

  coinScoreBlinkTimerId = window.setTimeout(() => {
    coinScore.classList.remove("coin-score-blink");
  }, COIN_SCORE_BLINK_MS);
}

function setCoinScoreIndex(nextIndex, shouldBlink = false) {
  coinScoreIndex = Math.max(0, Math.min(nextIndex, COIN_SCORE_MAX_INDEX));
  drawCoinScoreFrame();
  updateCoinScoreAriaLabel();

  if (shouldBlink) {
    triggerCoinScoreBlink();
  }
}

function isCoinScoreAtMax() {
  return coinScoreIndex >= COIN_SCORE_MAX_INDEX;
}

function runCoinScoreStepChange() {
  if (!coinScore) {
    if (!isCoinScoreAtMax()) {
      setCoinScoreIndex(coinScoreIndex + 1, false);
    }
    return;
  }

  if (coinScoreIsChanging) {
    coinScorePendingSteps += 1;
    return;
  }

  coinScoreIsChanging = true;
  clearCoinScoreChangeTimer();
  coinScore.classList.remove("coin-score-change");
  void coinScore.offsetWidth;
  coinScore.classList.add("coin-score-change");

  coinScoreChangeTimerId = window.setTimeout(() => {
    coinScore.classList.remove("coin-score-change");
    if (!isCoinScoreAtMax()) {
      setCoinScoreIndex(coinScoreIndex + 1, false);
    } else {
      setCoinScoreIndex(COIN_SCORE_MAX_INDEX, false);
    }

    coinScoreIsChanging = false;
    if (coinScorePendingSteps > 0) {
      coinScorePendingSteps -= 1;
      runCoinScoreStepChange();
    }
  }, HEART_LOSS_ANIM_MS);
}

function incrementCoinScore() {
  runCoinScoreStepChange();
}

function resetCoinScore(shouldBlink = true) {
  clearCoinScoreChangeTimer();
  coinScoreIsChanging = false;
  coinScorePendingSteps = 0;

  if (coinScore) {
    coinScore.classList.remove("coin-score-change");
  }

  setCoinScoreIndex(0, shouldBlink);
}

function initCoinScoreSprite() {
  if (!coinScoreCanvas || !coinScoreContext) {
    return;
  }

  coinScoreContext.imageSmoothingEnabled = false;
  coinScoreCanvas.width = COIN_SCORE_CANVAS_WIDTH;
  coinScoreCanvas.height = COIN_SCORE_CANVAS_HEIGHT;

  coinScoreSprite.onload = () => {
    coinScoreSpriteLoaded = true;
    resetCoinScore(false);
  };

  coinScoreSprite.onerror = () => {
    coinScoreSpriteLoaded = false;
  };

  coinScoreSprite.src = COIN_SCORE_SPRITE_SRC;
}

function resetHeartsHud() {
  heartLossTimerIds.forEach((timerId) => {
    window.clearTimeout(timerId);
  });
  heartLossTimerIds = [];
  playerHearts = MAX_HEARTS;

  heartIcons.forEach((heart) => {
    heart.classList.remove("heart-losing", "heart-empty");
  });
}

function losePlayerHeart() {
  if (playerHearts <= 0) {
    return;
  }

  const lostHeartIndex = playerHearts - 1;
  const lostHeart = heartIcons[lostHeartIndex];
  playerHearts -= 1;

  if (lostHeart) {
    lostHeart.classList.remove("heart-losing", "heart-empty");
    void lostHeart.offsetWidth;
    lostHeart.classList.add("heart-losing");

    const timerId = window.setTimeout(() => {
      lostHeart.classList.add("heart-empty");
      lostHeart.classList.remove("heart-losing");
    }, HEART_LOSS_ANIM_MS);
    heartLossTimerIds.push(timerId);
  }

  if (playerHearts <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  if (isGameOver) {
    return;
  }

  isGameOver = true;
  setControlsLocked(true);
  jumpCycle += 1;
  isJumping = false;
  isAscending = false;
  playerInvincibleUntil = 0;
  stopPlayerBlinking();
  resetEnemyState(true);

  avatar.classList.remove("walking", "blinking", "damage-flash", "blink-off", "hurt");
  avatar.classList.add("defeated");
  avatar.style.backgroundPositionX = "0px";

  world.classList.remove("level-transition");
  world.classList.add("game-over-fade");

  if (gameOverRevealTimerId) {
    window.clearTimeout(gameOverRevealTimerId);
  }

  gameOverRevealTimerId = window.setTimeout(() => {
    showGameOverScreen();
  }, GAME_OVER_FADE_MS);
}

function restartGame() {
  playBackgroundMusic();

  if (gameOverRevealTimerId) {
    window.clearTimeout(gameOverRevealTimerId);
    gameOverRevealTimerId = 0;
  }

  isGameOver = false;
  setControlsLocked(false);
  hideGameOverScreen();
  world.classList.remove("game-over-fade", "level-transition");

  stopPlayerBlinking();
  playerInvincibleUntil = 0;
  resetHeartsHud();
  resetCoinScore(false);
  resetEnemyState(true);
  resetEnemySpawnTimer();
  resetStageElements();
  avatarSpriteIndex = 0;
  applyAvatarSprite();

  jumpCycle += 1;
  isJumping = false;
  isAscending = false;
  isTransitioning = false;
  currentBottom = groundBottom;
  positionX = START_X;

  avatar.classList.remove("defeated", "walking", "facing-left", "hurt");
  avatar.style.backgroundPositionX = "0px";
  renderAvatar();
}

function stopPlayerBlinking() {
  if (playerBlinkTimerId) {
    window.clearInterval(playerBlinkTimerId);
    playerBlinkTimerId = 0;
  }

  avatar.classList.remove("blinking", "damage-flash", "blink-off", "hurt");
}

function startPlayerInvincibility() {
  playerInvincibleUntil = performance.now() + PLAYER_INVINCIBLE_MS;

  if (playerBlinkTimerId) {
    window.clearInterval(playerBlinkTimerId);
  }

  avatar.classList.add("blinking", "damage-flash", "hurt");
  avatar.classList.remove("blink-off");

  playerBlinkTimerId = window.setInterval(() => {
    if (performance.now() >= playerInvincibleUntil) {
      stopPlayerBlinking();
      return;
    }

    avatar.classList.toggle("blink-off");
  }, BLINK_INTERVAL_MS);
}

function applyAvatarSprite() {
  avatar.style.backgroundImage = `url("${avatarSprites[avatarSpriteIndex]}")`;
  avatar.style.backgroundPosition = "0 0";
  avatar.style.backgroundPositionX = "0px";
}

function getScale() {
  const sx = world.clientWidth / DESIGN_WIDTH;
  const sy = world.clientHeight / DESIGN_HEIGHT;
  const scale = Math.min(sx, sy);

  if (!Number.isFinite(scale) || scale <= 0) {
    return 1;
  }

  return scale;
}

function clampPlayerToWorld() {
  const scale = getScale();
  const worldWidthInDesignPx = world.clientWidth / scale;
  const maxX = worldWidthInDesignPx - avatarWidth;
  positionX = Math.max(0, Math.min(positionX, maxX));
  return maxX;
}

function renderAvatar() {
  const scale = getScale();
  avatar.style.left = positionX * scale + "px";
  avatar.style.bottom = currentBottom * scale + "px";
}

function renderEnemy() {
  if (!enemy) {
    return;
  }

  const scale = getScale();
  enemy.style.left = enemyX * scale + "px";
  enemy.style.bottom = enemyBottom * scale + "px";
}

function setEnemyState(nextState) {
  if (!enemy) {
    return;
  }

  enemyState = nextState;
  enemy.classList.remove("state-walk", "state-hit", "state-recover");
  enemy.classList.add(`state-${nextState}`);
}

function animateEnemy() {
  if (!enemy) {
    return;
  }

  setEnemyState(ENEMY_STATES.WALK);
}

function clearEnemyHitTimers() {
  if (enemyHitResolveTimerId) {
    window.clearTimeout(enemyHitResolveTimerId);
    enemyHitResolveTimerId = 0;
  }
}

function updateSiteActiveState() {
  isSiteActive = document.visibilityState === "visible" && document.hasFocus();

  if (isSiteActive) {
    playBackgroundMusic();
  }

  enemySpawnLastTickMs = performance.now();
}

function resetEnemySpawnTimer() {
  enemySpawnElapsedMs = 0;
  enemySpawnLastTickMs = performance.now();
}

function resetEnemyState(allowRespawn = true) {
  clearEnemyHitTimers();

  if (enemy) {
    enemy.classList.remove(
      "enemy-hit-flash",
      "enemy-spin-defeat",
      "blinking",
      "blink-off",
    );
  }

  if (enemy && enemy.parentElement) {
    enemy.parentElement.removeChild(enemy);
  }

  enemy = null;
  enemyX = 0;
  enemyBottom = groundBottom;
  enemyState = ENEMY_STATES.WALK;
  enemyRemoving = false;

  if (allowRespawn) {
    enemySpawned = false;
  }
}

function removeEnemy() {
  resetEnemyState(true);
}

function removeEnemyWithImpact() {
  if (!enemy || enemyRemoving) {
    return;
  }

  clearEnemyHitTimers();
  enemyRemoving = true;
  enemy.classList.remove(
    "state-walk",
    "state-hit",
    "state-recover",
    "blinking",
    "blink-off",
  );
  enemy.classList.add("stomped");

  const stompedEnemy = enemy;
  window.setTimeout(() => {
    if (stompedEnemy === enemy) {
      removeEnemy();
      return;
    }

    if (stompedEnemy && stompedEnemy.parentElement) {
      stompedEnemy.parentElement.removeChild(stompedEnemy);
    }
  }, ENEMY_STOMP_REMOVE_MS);
}

function handleEnemySideHit() {
  if (!enemy || enemyRemoving) {
    return;
  }

  clearEnemyHitTimers();
  enemyRemoving = true;
  enemy.classList.remove(
    "state-walk",
    "state-hit",
    "state-recover",
    "stomped",
    "enemy-hit-flash",
    "blinking",
    "blink-off",
  );
  setEnemyState(ENEMY_STATES.HIT);
  enemy.classList.add("enemy-spin-defeat");

  const hitEnemy = enemy;

  enemyHitResolveTimerId = window.setTimeout(() => {
    if (hitEnemy) {
      hitEnemy.classList.remove("enemy-spin-defeat");
      hitEnemy.style.display = "none";
    }

    clearEnemyHitTimers();

    if (hitEnemy === enemy) {
      removeEnemy();
      return;
    }

    if (hitEnemy && hitEnemy.parentElement) {
      hitEnemy.parentElement.removeChild(hitEnemy);
    }
  }, ENEMY_SPIN_DEFEAT_MS);
}

function spawnEnemy() {
  if (enemySpawned || isTransitioning) {
    return;
  }

  enemy = document.createElement("div");
  enemy.className = "enemy facing-left";
  world.appendChild(enemy);

  enemySpawned = true;
  enemyBottom = groundBottom;
  enemyRemoving = false;

  const scale = getScale();
  const worldWidthInDesignPx = world.clientWidth / scale;
  enemyX = worldWidthInDesignPx - enemyWidth;

  renderEnemy();
  animateEnemy();
}

function moveEnemy() {
  if (!enemy || enemyRemoving) {
    return;
  }

  enemyX -= enemySpeed;

  if (enemyX + enemyWidth <= 0) {
    removeEnemy();
    return;
  }

  renderEnemy();
}

function updateEnemySpawnTimer(currentTime) {
  if (!Number.isFinite(enemySpawnLastTickMs) || enemySpawnLastTickMs <= 0) {
    enemySpawnLastTickMs = currentTime;
    return;
  }

  const deltaMs = Math.max(0, currentTime - enemySpawnLastTickMs);
  enemySpawnLastTickMs = currentTime;

  if (!isSiteActive || isTransitioning || isGameOver) {
    return;
  }

  enemySpawnElapsedMs += deltaMs;

  if (enemySpawnElapsedMs < ENEMY_SPAWN_INTERVAL_MS || enemySpawned) {
    return;
  }

  spawnEnemy();
  enemySpawnElapsedMs = 0;
}

function syncGroundTiles() {
  if (!ground) {
    return;
  }

  const scale = getScale();
  const tileStepPx = TILE_SIZE * scale;
  const neededTiles =
    Math.max(1, Math.ceil(world.clientWidth / tileStepPx) + GROUND_TILE_BUFFER);
  const currentTiles = ground.children.length;

  if (currentTiles < neededTiles) {
    const fragment = document.createDocumentFragment();

    for (let i = currentTiles; i < neededTiles; i += 1) {
      const tile = document.createElement("div");
      tile.className = "grass";
      fragment.appendChild(tile);
    }

    ground.appendChild(fragment);
    return;
  }

  while (ground.children.length > neededTiles) {
    ground.removeChild(ground.lastElementChild);
  }
}

function activateQuestionBlock(wrapper, coin) {
  wrapper.dataset.active = "true";
  wrapper.classList.add("hit");

  const coinHits = Number(wrapper.dataset.coinHits || "0");
  const maxCoins = wrapper.classList.contains("q4")
    ? MAX_COINS_LAST_QUESTION_BLOCK
    : MAX_COINS_PER_QUESTION_BLOCK;
  const canSpawnCoin = coinHits < maxCoins;

  if (canSpawnCoin) {
    wrapper.dataset.coinHits = String(coinHits + 1);
    incrementCoinScore();

    coin.classList.remove("hidden");
    coin.classList.remove("show");
    void coin.offsetWidth;
    coin.classList.add("show");
  }

  setTimeout(() => {
    wrapper.classList.remove("hit");
  }, 250);

  setTimeout(() => {
    coin.classList.remove("show");
    coin.classList.add("hidden");
    wrapper.dataset.active = "false";
  }, canSpawnCoin ? 750 : 250);
}

function activateBrickBlock(block) {
  block.dataset.active = "true";
  block.classList.remove("hit");
  void block.offsetWidth;
  block.classList.add("hit");

  setTimeout(() => {
    block.classList.remove("hit");
    block.dataset.active = "false";
  }, 250);
}

function resetStageElements() {
  const questionBlocks = document.querySelectorAll(".question-wrapper");
  const brickBlocks = document.querySelectorAll(".block.brick");

  questionBlocks.forEach((wrapper) => {
    wrapper.dataset.active = "false";
    wrapper.dataset.coinHits = "0";
    wrapper.classList.remove("hit");

    const coin = wrapper.querySelector(".coin");
    if (!coin) return;

    coin.classList.remove("show");
    coin.classList.add("hidden");
  });

  brickBlocks.forEach((block) => {
    block.dataset.active = "false";
    block.classList.remove("hit");
  });
}

function startLevelTransition() {
  if (isTransitioning || isGameOver) {
    return;
  }

  isTransitioning = true;
  jumpCycle += 1;
  isJumping = false;
  isAscending = false;
  currentBottom = groundBottom;

  playerInvincibleUntil = 0;
  stopPlayerBlinking();

  resetEnemyState(true);
  resetEnemySpawnTimer();

  keys.ArrowLeft = false;
  keys.ArrowRight = false;
  avatar.classList.remove("walking");
  avatar.style.backgroundPositionX = "0px";
  world.classList.add("level-transition");

  setTimeout(() => {
    avatarSpriteIndex = (avatarSpriteIndex + 1) % avatarSprites.length;
    applyAvatarSprite();
    positionX = START_X;
    currentBottom = groundBottom;
    resetStageElements();
    renderAvatar();
  }, Math.round(LEVEL_TRANSITION_MS * 0.5));

  setTimeout(() => {
    world.classList.remove("level-transition");
    isTransitioning = false;
  }, LEVEL_TRANSITION_MS);
}

function checkQuestionBlocks() {
  if (!isJumping || !isAscending) {
    return;
  }

  const scale = getScale();
  const avatarRect = avatar.getBoundingClientRect();
  const questionBlocks = document.querySelectorAll(".question-wrapper");

  questionBlocks.forEach((wrapper) => {
    const block = wrapper.querySelector(".coin-block");
    const coin = wrapper.querySelector(".coin");

    if (!block || !coin) return;
    if (wrapper.dataset.active === "true") return;

    const blockRect = block.getBoundingClientRect();

    const isHorizontallyAligned =
      avatarRect.right - 8 * scale > blockRect.left &&
      avatarRect.left + 8 * scale < blockRect.right;

    const avatarTopNearBlockBottom =
      avatarRect.top <= blockRect.bottom + 10 * scale &&
      avatarRect.top >= blockRect.bottom - 34 * scale;

    if (isHorizontallyAligned && avatarTopNearBlockBottom) {
      activateQuestionBlock(wrapper, coin);
    }
  });
}

function checkBrickBlocks() {
  if (!isJumping || !isAscending) {
    return;
  }

  const scale = getScale();
  const avatarRect = avatar.getBoundingClientRect();
  const avatarCenterX = avatarRect.left + avatarRect.width / 2;
  const brickBlocks = document.querySelectorAll(".block.brick");

  let targetBlock = null;
  let closestDistance = Infinity;

  brickBlocks.forEach((block) => {
    if (block.dataset.active === "true") return;

    const blockRect = block.getBoundingClientRect();
    const isHorizontallyAligned =
      avatarCenterX > blockRect.left &&
      avatarCenterX < blockRect.right;

    const avatarTopNearBlockBottom =
      avatarRect.top <= blockRect.bottom + 10 * scale &&
      avatarRect.top >= blockRect.bottom - 34 * scale;

    if (!isHorizontallyAligned || !avatarTopNearBlockBottom) {
      return;
    }

    const blockCenterX = blockRect.left + blockRect.width / 2;
    const distance = Math.abs(blockCenterX - avatarCenterX);

    if (distance < closestDistance) {
      closestDistance = distance;
      targetBlock = block;
    }
  });

  if (targetBlock) {
    activateBrickBlock(targetBlock);
  }
}

function getSolidSurfaces() {
  const scale = getScale();
  const worldRect = world.getBoundingClientRect();
  const solidBlocks = document.querySelectorAll(
    ".block.brick, .question-wrapper .coin-block",
  );

  return Array.from(solidBlocks).map((block) => {
    const rect = block.getBoundingClientRect();
    const left = (rect.left - worldRect.left) / scale;
    const right = (rect.right - worldRect.left) / scale;
    const top = (worldRect.bottom - rect.top) / scale;
    const bottom = (worldRect.bottom - rect.bottom) / scale;

    return { left, right, top, bottom };
  });
}

function hasHorizontalSurfaceOverlap(surface, playerLeft, playerRight) {
  const overlapInset = 6;
  return (
    playerRight > surface.left + overlapInset &&
    playerLeft < surface.right - overlapInset
  );
}

function findLandingSurfaceTop(previousBottom, nextBottom) {
  const playerLeft = positionX + 8;
  const playerRight = positionX + avatarWidth - 8;
  let landingTop = null;
  const surfaces = getSolidSurfaces();

  surfaces.forEach((surface) => {
    if (!hasHorizontalSurfaceOverlap(surface, playerLeft, playerRight)) {
      return;
    }

    const crossedFromAbove =
      previousBottom >= surface.top - SOLID_SURFACE_TOLERANCE &&
      nextBottom <= surface.top + SOLID_SURFACE_TOLERANCE;

    if (!crossedFromAbove) {
      return;
    }

    if (landingTop === null || surface.top > landingTop) {
      landingTop = surface.top;
    }
  });

  return landingTop;
}

function findCeilingSurfaceBottom(previousBottom, nextBottom) {
  const playerLeft = positionX + 8;
  const playerRight = positionX + avatarWidth - 8;
  const previousTop = previousBottom + avatarHeight;
  const nextTop = nextBottom + avatarHeight;
  let ceilingBottom = null;
  const surfaces = getSolidSurfaces();

  surfaces.forEach((surface) => {
    if (!hasHorizontalSurfaceOverlap(surface, playerLeft, playerRight)) {
      return;
    }

    const crossedFromBelow =
      previousTop <= surface.bottom + CEILING_COLLISION_TOLERANCE &&
      nextTop >= surface.bottom - CEILING_COLLISION_TOLERANCE;

    if (!crossedFromBelow) {
      return;
    }

    if (ceilingBottom === null || surface.bottom < ceilingBottom) {
      ceilingBottom = surface.bottom;
    }
  });

  return ceilingBottom;
}

function findStandingSurfaceTop(playerBottom) {
  const playerLeft = positionX + 8;
  const playerRight = positionX + avatarWidth - 8;
  let supportTop = null;
  const surfaces = getSolidSurfaces();

  surfaces.forEach((surface) => {
    if (!hasHorizontalSurfaceOverlap(surface, playerLeft, playerRight)) {
      return;
    }

    const nearSurfaceTop =
      playerBottom >= surface.top - SOLID_SURFACE_TOLERANCE &&
      playerBottom <= surface.top + SURFACE_SNAP_RANGE;

    if (!nearSurfaceTop) {
      return;
    }

    if (supportTop === null || surface.top > supportTop) {
      supportTop = surface.top;
    }
  });

  return supportTop;
}

function updateStandingOnSurfaces() {
  if (isJumping || isTransitioning || isGameOver) {
    return;
  }

  const supportTop = findStandingSurfaceTop(currentBottom);

  if (supportTop !== null) {
    currentBottom = supportTop;
    return;
  }

  if (currentBottom > groundBottom) {
    currentBottom = Math.max(groundBottom, currentBottom - FALL_SPEED);
    return;
  }

  currentBottom = groundBottom;
}

function getPlayerHitbox() {
  return {
    left: positionX + 8,
    right: positionX + avatarWidth - 8,
    bottom: currentBottom + 4,
    top: currentBottom + avatarHeight - 6,
  };
}

function getEnemyHitbox() {
  return {
    left: enemyX + 4,
    right: enemyX + enemyWidth - 4,
    bottom: enemyBottom + 2,
    top: enemyBottom + enemyHeight - 3,
  };
}

function hasOverlap(boxA, boxB) {
  return (
    boxA.left < boxB.right &&
    boxA.right > boxB.left &&
    boxA.bottom < boxB.top &&
    boxA.top > boxB.bottom
  );
}

function bounceAfterStomp() {
  const cycle = ++jumpCycle;
  isJumping = true;
  const bounceBaseBottom = Math.max(groundBottom, currentBottom);
  const startTime = performance.now();

  function animateBounce(currentTime) {
    if (cycle !== jumpCycle || isTransitioning) {
      return;
    }

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / STOMP_BOUNCE_DURATION_MS, 1);
    isAscending = progress < 0.5;

    const bounceOffset = Math.sin(progress * Math.PI) * STOMP_BOUNCE_HEIGHT;
    currentBottom = bounceBaseBottom + bounceOffset;
    renderAvatar();

    if (progress < 1) {
      requestAnimationFrame(animateBounce);
      return;
    }

    currentBottom = groundBottom;
    renderAvatar();
    isJumping = false;
    isAscending = false;
  }

  requestAnimationFrame(animateBounce);
}

function isStompCollision(playerHitbox, enemyHitbox) {
  const isDescending = isJumping && !isAscending;
  if (!isDescending) {
    return false;
  }

  const playerBottomNearEnemyTop =
    playerHitbox.bottom >= enemyHitbox.top - PLAYER_STOMP_CONTACT_MARGIN &&
    playerHitbox.bottom <= enemyHitbox.top + PLAYER_STOMP_CONTACT_MARGIN;

  const playerComesFromAbove = playerHitbox.top > enemyHitbox.top;

  return playerBottomNearEnemyTop && playerComesFromAbove;
}

function applyDamageFromEnemy(playerCenterX, enemyCenterX) {
  if (isGameOver) {
    return;
  }

  startPlayerInvincibility();
  losePlayerHeart();

  if (isGameOver) {
    return;
  }

  const knockback =
    enemyCenterX >= playerCenterX ? -ENEMY_KNOCKBACK_PUSH : ENEMY_KNOCKBACK_PUSH;
  positionX += knockback;
  currentBottom = Math.max(currentBottom, groundBottom + 8);
  clampPlayerToWorld();
  renderAvatar();
}

function handleEnemyStomp() {
  bounceAfterStomp();
  removeEnemyWithImpact();
}

function checkCollision() {
  if (!enemy || isTransitioning || enemyRemoving) {
    return;
  }

  const playerHitbox = getPlayerHitbox();
  const enemyHitbox = getEnemyHitbox();

  if (!hasOverlap(playerHitbox, enemyHitbox)) {
    return;
  }

  if (isStompCollision(playerHitbox, enemyHitbox)) {
    handleEnemyStomp();
    return;
  }

  if (performance.now() < playerInvincibleUntil) {
    return;
  }

  const playerCenterX = (playerHitbox.left + playerHitbox.right) / 2;
  const enemyCenterX = (enemyHitbox.left + enemyHitbox.right) / 2;

  applyDamageFromEnemy(playerCenterX, enemyCenterX);
  handleEnemySideHit();
}

function updateAvatar() {
  updateEnemySpawnTimer(performance.now());

  if (isTransitioning || isGameOver) {
    requestAnimationFrame(updateAvatar);
    return;
  }

  const isMovingHorizontally =
    !controlsLocked && (keys.ArrowLeft || keys.ArrowRight);

  if (!controlsLocked && keys.ArrowRight) {
    positionX += speed;
    avatar.classList.remove("facing-left");
  }

  if (!controlsLocked && keys.ArrowLeft) {
    positionX -= speed;
    avatar.classList.add("facing-left");
  }

  const maxX = clampPlayerToWorld();
  const reachedRightEdge = keys.ArrowRight && positionX >= maxX - 0.01;

  if (reachedRightEdge) {
    startLevelTransition();
    requestAnimationFrame(updateAvatar);
    return;
  }

  updateStandingOnSurfaces();
  renderAvatar();

  const isWalking = isMovingHorizontally && !isJumping;
  if (isWalking) {
    avatar.classList.add("walking");
  } else {
    avatar.classList.remove("walking");
    avatar.style.backgroundPositionX = "0px";
  }

  checkQuestionBlocks();
  checkBrickBlocks();
  moveEnemy();
  checkCollision();

  requestAnimationFrame(updateAvatar);
}

function jump() {
  if (isJumping || isTransitioning || isGameOver || controlsLocked) return;

  const cycle = ++jumpCycle;
  isJumping = true;
  const jumpBaseBottom = currentBottom;
  const startTime = performance.now();

  function animateJump(currentTime) {
    if (cycle !== jumpCycle || isTransitioning) {
      return;
    }

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / JUMP_DURATION_MS, 1);
    isAscending = progress < 0.5;

    const jumpOffset = Math.sin(progress * Math.PI) * JUMP_HEIGHT;
    const previousBottom = currentBottom;
    const nextBottom = Math.max(groundBottom, jumpBaseBottom + jumpOffset);

    if (isAscending) {
      const ceilingBottom = findCeilingSurfaceBottom(previousBottom, nextBottom);
      if (ceilingBottom !== null) {
        currentBottom = Math.max(groundBottom, ceilingBottom - avatarHeight - 0.01);
        renderAvatar();

        checkQuestionBlocks();
        checkBrickBlocks();

        isJumping = false;
        isAscending = false;
        return;
      }
    }

    if (!isAscending) {
      const landingTop = findLandingSurfaceTop(previousBottom, nextBottom);
      if (landingTop !== null) {
        currentBottom = landingTop;
        renderAvatar();
        isJumping = false;
        isAscending = false;
        return;
      }
    }

    currentBottom = nextBottom;
    renderAvatar();

    if (progress < 1) {
      requestAnimationFrame(animateJump);
    } else {
      isJumping = false;
      isAscending = false;
      updateStandingOnSurfaces();
      renderAvatar();
    }
  }

  requestAnimationFrame(animateJump);
}

window.addEventListener("keydown", (event) => {
  if (!hasGameStarted) {
    if (isMobileStartLocked && event.code === "Enter") {
      event.preventDefault();
      return;
    }

    if (!isMobileStartLocked && event.code === "Enter") {
      event.preventDefault();
      startGame();
      return;
    }

    if (
      event.code === "ArrowLeft" ||
      event.code === "ArrowRight" ||
      event.code === "ArrowUp"
    ) {
      event.preventDefault();
    }
    return;
  }

  if (isGameOver && event.code === "Enter") {
    event.preventDefault();
    restartGame();
    return;
  }

  if (isTransitioning || controlsLocked || isGameOver) {
    if (
      event.code === "ArrowLeft" ||
      event.code === "ArrowRight" ||
      event.code === "ArrowUp"
    ) {
      event.preventDefault();
    }
    return;
  }

  if (event.code === "ArrowLeft") {
    keys.ArrowLeft = true;
    event.preventDefault();
  }

  if (event.code === "ArrowRight") {
    keys.ArrowRight = true;
    event.preventDefault();
  }

  if (event.code === "ArrowUp") {
    jump();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (!hasGameStarted) {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;

    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
    }
    return;
  }

  if (event.code === "ArrowLeft") {
    keys.ArrowLeft = false;
    event.preventDefault();
  }

  if (event.code === "ArrowRight") {
    keys.ArrowRight = false;
    event.preventDefault();
  }
});

if (enterRestartHitbox) {
  enterRestartHitbox.addEventListener("click", () => {
    restartGame();
  });

  enterRestartHitbox.addEventListener("keydown", (event) => {
    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();
    restartGame();
  });
}

if (startEnterButton && !isMobileStartLocked) {
  startEnterButton.addEventListener("click", () => {
    startGame();
  });

  startEnterButton.addEventListener("keydown", (event) => {
    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();
    startGame();
  });
}

window.addEventListener("resize", () => {
  syncGroundTiles();
  clampPlayerToWorld();
  renderAvatar();

  if (enemy) {
    const scale = getScale();
    const worldWidthInDesignPx = world.clientWidth / scale;
    enemyX = Math.min(enemyX, worldWidthInDesignPx - enemyWidth);
    enemyX = Math.max(enemyX, -enemyWidth);
    renderEnemy();
  }
});

document.addEventListener("visibilitychange", updateSiteActiveState);
window.addEventListener("focus", updateSiteActiveState);
window.addEventListener("blur", updateSiteActiveState);

currentBottom = groundBottom;
positionX = START_X;
applyAvatarSprite();
syncGroundTiles();
renderAvatar();
resetHeartsHud();
hideGameOverScreen();
setControlsLocked(true);
updateSiteActiveState();
resetEnemySpawnTimer();
resetEnemyState(true);
resetCoinScore(false);
initCoinScoreSprite();
configureBackgroundMusic();
registerBackgroundMusicUnlock();
avatar.style.backgroundPositionX = "0px";

if (isMobileStartLocked) {
  document.body.classList.add("mobile-start-locked");
}

if (startScreen) {
  playStartTypewriter();
} else {
  startGame();
}
