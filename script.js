/* =========================================
   配置与数据 (CONSTANTS & DATA)
   ========================================= */
const CHARACTERS = [
    { id: 'balanced', name: '均衡型', color: '#ffe5b4', speed: 1.5, jump: 6.5, charge: 0.04, smash: 1.0, hitRange: 75, maxPower: 1.0, doubleJump: false, desc: '手感稳健 觉醒' },
    { id: 'speed',    name: '极速型', color: '#60a5fa', speed: 2.5, jump: 7.0, charge: 0.06, smash: 0.9, hitRange: 70, maxPower: 0.9, doubleJump: false, desc: '速度快 飞行' },
    { id: 'power',    name: '力量型', color: '#ef4444', speed: 1.0, jump: 6.5, charge: 0.02, smash: 1.2, hitRange: 80, maxPower: 1.2, doubleJump: false, desc: '威力大 击退' },
    { id: 'ninja',    name: '忍者型', color: '#10b981', speed: 1.25, jump: 6.0, charge: 0.05, smash: 1.0, hitRange: 75, maxPower: 1.0, doubleJump: true,  desc: '二段跳 忍术' }
];

const DIFFICULTY_SETTINGS = {
    easy:   { reaction: 30, error: 80, speedMult: 0.7, smashProb: 0.01, chargeSpeed: 0.8, intercept: false },
    normal: { reaction: 15, error: 40, speedMult: 1.0, smashProb: 0.15, chargeSpeed: 1.0, intercept: true },
    hard:   { reaction: 5,  error: 10, speedMult: 1.2, smashProb: 0.50, chargeSpeed: 1.5, intercept: true }, 
    hell:   { reaction: 0,  error: 0,  speedMult: 1.4, smashProb: 0.85, chargeSpeed: 3.0, intercept: true } 
};

let currentMode = 'cpu';
let selectedDifficulty = 'normal';
let p1Selected = 'balanced';
let p2Selected = 'balanced';

/* =========================================
   DOM 元素引用与菜单逻辑 (DOM & MENU)
   ========================================= */
const scoreP = document.getElementById('p1Stat'); 
const scoreA = document.getElementById('p2Stat'); 
const winnerOverlay = document.getElementById('overlay'); 
const winnerText = document.getElementById('winnerText'); 
const msgBox = document.getElementById('msgBox');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function renderCharCards(containerId, isP1) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    CHARACTERS.forEach(char => {
        const div = document.createElement('div');
        div.className = `char-card ${isP1 ? (p1Selected===char.id?'selected':'') : (p2Selected===char.id?'selected':'')}`;
        div.innerHTML = `<div class="mini-icon" style="background:${char.color}"></div><div class="char-info"><span class="c-name">${char.name}</span><span class="c-desc">${char.desc}</span></div>`;
        div.onclick = () => { if(isP1) { p1Selected = char.id; updateGridSelection('p1Grid', p1Selected); } else { p2Selected = char.id; updateGridSelection('p2Grid', p2Selected); } };
        container.appendChild(div);
    });
}
function updateGridSelection(gridId, selectedId) {
    const grid = document.getElementById(gridId);
    Array.from(grid.children).forEach((card, idx) => {
        if(CHARACTERS[idx].id === selectedId) card.classList.add('selected'); else card.classList.remove('selected');
    });
}
function setSelectMode(mode) {
    currentMode = mode;
    document.getElementById('optCpu').className = mode==='cpu' ? 'mode-opt active' : 'mode-opt';
    document.getElementById('optPvp').className = mode==='pvp' ? 'mode-opt active' : 'mode-opt';
    
    const p2Col = document.getElementById('p2Col'); 
    
    // === 修改这里：获取新的外层容器 ID "difficultySection" ===
    const diffSection = document.getElementById('difficultySection'); 
    
    if(mode === 'cpu') { 
        // 单人模式：P2锁定，难度区域 变亮 & 可点击
        p2Col.classList.add('p2-locked'); 
        diffSection.style.opacity = '1'; 
        diffSection.style.pointerEvents = 'auto'; 
    } else { 
        // 双人模式：P2解锁，难度区域 变暗 & 不可点击
        p2Col.classList.remove('p2-locked'); 
        diffSection.style.opacity = '0.3'; 
        diffSection.style.pointerEvents = 'none'; 
    }
}
function setDifficulty(diff) {
    selectedDifficulty = diff;
    const opts = document.querySelectorAll('.diff-opt'); const keys = ['easy', 'normal', 'hard', 'hell'];
    opts.forEach((el, idx) => { if (keys[idx] === diff) el.classList.add('active'); else el.classList.remove('active'); });
}

// 初始化菜单
renderCharCards('p1Grid', true); renderCharCards('p2Grid', false); setSelectMode('cpu'); setDifficulty('normal');

document.getElementById('btnStartGame').onclick = () => {
    document.getElementById('charSelectScreen').style.display = 'none';
    
    // === 新增：应用选中的地图尺寸 ===
    W = MAP_PRESETS[selectedMapSize].w;
    H = MAP_PRESETS[selectedMapSize].h;
    resize(); // 这一步很重要，强制 Canvas 重新适配新的 W 和 H
    // =============================

    let p2FinalChar = p2Selected;
    if(currentMode === 'cpu') { const rand = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]; p2FinalChar = rand.id; }
    initGameProps(p1Selected, p2FinalChar);
    gameMode = currentMode;
    startGame();
};

/* =========================================
   游戏全局变量 (GAME STATE)
   ========================================= */
// 默认尺寸 (Medium)
let W = 1600; 
let H = 800; 
let dpr = Math.max(1, window.devicePixelRatio || 1);

// 地图预设
const MAP_PRESETS = {
    small:  { w: 1200, h: 600 }, // 紧凑
    medium: { w: 1400, h: 700 }, // 标准
    large:  { w: 1600, h: 800 } // 宽阔
};
let selectedMapSize = 'medium'; // 默认记录

function setMapSize(size) {
    selectedMapSize = size;
    // 更新 UI 样式
    const opts = document.querySelectorAll('.map-opt');
    const keys = ['small', 'medium', 'large'];
    opts.forEach((el, idx) => {
        if (keys[idx] === size) el.classList.add('active');
        else el.classList.remove('active');
    });
}
const margin = 100; const MAX_SCORE = 11; const COURT_PADDING = 30; 
let gameMode = 'cpu'; let serving = 'player'; let lastHitter = 'player';
let running = false, paused = false, lastTime = 0; let gameOver = false;
let particles = [];
let worldGravity = 0.25; let airDrag = 0.996; 
let player = { x: margin, y: H/2, vx:0, vy:0, onGround:true, handX:0, handY:0, swingTimer:0, swingAnim:0, score:0, charging:false, chargeVal:0, speed:3.5, jumpPower:8, chargeRate:0.03, smashMult:1, hitRange:70, maxPower:1.0, doubleJump:false, jumpCount:0, color:'#fff', roleName:'' };
let player2 = { x: W-margin, y: H/2, vx:0, vy:0, onGround:true, handX:0, handY:0, swingTimer:0, swingAnim:0, score:0, charging:false, chargeVal:0, speed:3.5, jumpPower:8, chargeRate:0.03, smashMult:1, hitRange:70, maxPower:1.0, doubleJump:false, jumpCount:0, color:'#fff', roleName:'' };
let shuttle = { x: W/2, y: H/3, vx:0, vy:0, radius: 8, stuck:true, isSmash: false };
let baseSpeed = 3.5; let level = 1;

/* =========================================
   音频系统 (AUDIO)
   ========================================= */
const AudioCtx = window.AudioContext || window.webkitAudioContext; const audioCtx = AudioCtx ? new AudioCtx() : null;

function beep(freq, time=0.1, type='sine', vol=0.1){
  if(!audioCtx) return; if(audioCtx.state === 'suspended') audioCtx.resume();
  try { const o=audioCtx.createOscillator();const g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);if(type==='sawtooth')o.frequency.exponentialRampToValueAtTime(freq/2,audioCtx.currentTime+time);o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(0.001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(vol,audioCtx.currentTime+0.02);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+time);o.start();o.stop(audioCtx.currentTime+time+0.05); } catch(e){}
}

function playSmashSound(power) {
  if(!audioCtx) return; if(audioCtx.state === 'suspended') audioCtx.resume();
  try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(150 + power*100, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      gain.gain.setValueAtTime(0.5, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.2);
      const osc2 = audioCtx.createOscillator(); const gain2 = audioCtx.createGain();
      osc2.type = 'square'; osc2.frequency.setValueAtTime(800, t); osc2.frequency.exponentialRampToValueAtTime(100, t + 0.05);
      gain2.gain.setValueAtTime(0.3, t); gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc2.connect(gain2); gain2.connect(audioCtx.destination); osc2.start(t); osc2.stop(t + 0.1);
  } catch(e){}
}

function playSkillSound() {
  if(!audioCtx) return; if(audioCtx.state === 'suspended') audioCtx.resume();
  try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      // 频率快速爬升，模拟聚气/爆发
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.5);
  } catch(e){}
}

/* =========================================
   通用工具与初始化 (UTILS & INIT)
   ========================================= */
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function resize() {
    // 1. 定义游戏固定的逻辑宽高比 (1200 / 600 = 2:1)
    const targetRatio = W / H;
    
    // 2. 获取浏览器窗口目前的可用宽高
    const containerW = window.innerWidth - 20; // 留点边距
    const containerH = window.innerHeight - 20;

    let finalCssW, finalCssH;

    // 3. 计算适应屏幕的最佳 CSS 尺寸 (保持比例，类似 object-fit: contain)
    if (containerW / containerH > targetRatio) {
        // 屏幕太宽，以高度为基准
        finalCssH = containerH;
        finalCssW = finalCssH * targetRatio;
    } else {
        // 屏幕太窄，以宽度为基准
        finalCssW = containerW;
        finalCssH = finalCssW / targetRatio;
    }

    // 4. 应用 CSS 样式尺寸 (视觉大小)
    canvas.style.width = finalCssW + 'px';
    canvas.style.height = finalCssH + 'px';

    // 5. 设置 Canvas 内部渲染分辨率 (物理像素，保持清晰度)
    // 注意：这里永远使用固定的 W(1200) 和 H(600) 乘以 dpr
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // 6. 调整绘图上下文的缩放，以适配高分屏
    // 这里的缩放仅用于匹配 DPR，不再用于匹配窗口大小
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 重点：我们不再修改全局变量 W 和 H！
    // 这样物理引擎和 AI 永远运行在 1200x600 的世界里，只是画出来的大小变了。
    
    // 重新计算一下位置防止某些极端情况（可选）
    recalcPositions();
    if (running) draw();
}

window.addEventListener('resize', resize); resize();

function updateUI(){ 
    scoreP.innerText = player.score; 
    scoreA.innerText = player2.score; 
}
function showMsg(text) { msgBox.textContent = text; msgBox.style.opacity = 1; msgBox.style.transform = "translateX(-50%) scale(1.2)"; setTimeout(() => { msgBox.style.opacity = 0; msgBox.style.transform = "translateX(-50%) scale(1)"; }, 1000); }

function initGameProps(p1Id, p2Id) {
    const p1Data = CHARACTERS.find(c => c.id === p1Id);
    const p2Data = CHARACTERS.find(c => c.id === p2Id);

    const applyStats = (p, data) => { 
        p.speed = data.speed; p.jumpPower = data.jump; p.chargeRate = data.charge; 
        p.smashMult = data.smash; p.hitRange = data.hitRange; p.color = data.color; 
        p.roleName = data.name; p.maxPower = data.maxPower; p.doubleJump = data.doubleJump; 
        p.jumpCount = 0; 
        p.hasHit = false; 
        
        // === 技能系统属性 ===
        p.energy = 0;           // 当前能量 (0-100)
        p.maxEnergy = 100;
        p.skillActive = false;  // 技能是否激活中
        p.skillTimer = 0;       // 技能剩余时间
        p.baseStats = { ...data }; // 备份基础属性，用于技能结束后恢复
        p.id = data.id;         // 记录ID以便判断技能类型
        p.trails = []; 

        p.isGiant = false; 
        p.impactVx = 0; // 额外的击退速度
    };
    
    applyStats(player, CHARACTERS.find(c => c.id === p1Id)); 
    applyStats(player2, CHARACTERS.find(c => c.id === p2Id)); 

    // 修改 P1 颜色
    const p1Color = p1Data.color;
    document.getElementById('p1Stat').style.color = p1Color;
    document.getElementById('p1EBar').style.backgroundColor = p1Color;
    document.querySelector('.p1-box .e-label').style.color = p1Color;

    // 修改 P2 颜色
    const p2Color = p2Data.color;
    document.getElementById('p2Stat').style.color = p2Color;
    document.getElementById('p2EBar').style.backgroundColor = p2Color;
    document.querySelector('.p2-box .e-label').style.color = p2Color;

    updateUI();
}

/* =========================================
   输入处理 (INPUT HANDLING)
   ========================================= */
const keys = {};

function actionHit(p, power) {
    if (p.swingTimer === 0) {
        p.charging = false;
        p.chargeVal = 0;
        if (shuttle.stuck) {
            const isP1Serving = (serving === 'player' && p === player);
            const isP2Serving = (serving === 'player2' && p === player2);
            if (isP1Serving || isP2Serving) {
                p.swingAnim = 10;
                serve(isP1Serving ? 'player' : 'player2', power);
            }
        } else {
            triggerSwing(p, power);
        }
    }
}

window.addEventListener('keydown', e => { 
    keys[e.code] = true; if(gameOver) return; 
    
    // ------ Player 1 操作 ------
    if(e.code === 'Space') {
        let hitPower = 0.5; 
        if (keys['KeyS']) hitPower = 0.3; 
        else if (keys['KeyD']) hitPower = 0.8; 
        actionHit(player, hitPower);
    }
    if(e.code === 'KeyJ'){ if(!player.charging){ player.charging = true; player.chargeVal = 0; } }
    if(e.code === 'ShiftLeft') activateSkill(player);
    if(e.code === 'KeyW'){ 
        if (player.skillActive && player.id === 'speed') return; 
        if(player.onGround) {
            player.vy = -player.jumpPower; player.onGround = false; player.jumpCount = 1;
        } else if (player.doubleJump && player.jumpCount < 2) {
            player.vy = -player.jumpPower * 0.9; player.jumpCount = 2;
            createHitParticles(player.x, player.y + 40, '#fff', 8);
        }
    }

    // ------ Player 2 操作 (PVP) ------
    if(gameMode === 'pvp') {
        if(e.code === 'Enter' || e.code === 'NumpadEnter') {
            let hitPower = 0.5; 
            if (keys['ArrowDown']) hitPower = 0.3; 
            else if (keys['ArrowLeft']) hitPower = 0.8; 
            actionHit(player2, hitPower);
        }
        if(e.code === 'Numpad1'){ if(!player2.charging){ player2.charging = true; player2.chargeVal = 0; } }
        if(e.code === 'NumpadAdd' || e.code === 'ShiftRight') activateSkill(player2);
        if(e.code === 'ArrowUp'){ 
            if (player2.skillActive && player2.id === 'speed') return;
            if(player2.onGround) {
                player2.vy = -player2.jumpPower; player2.onGround = false; player2.jumpCount = 1;
            } else if (player2.doubleJump && player2.jumpCount < 2) {
                player2.vy = -player2.jumpPower * 0.9; player2.jumpCount = 2;
                createHitParticles(player2.x, player2.y + 40, '#fff', 8);
            }
        }
    } 
});

window.addEventListener('keyup', e => { 
    keys[e.code] = false; 
    if(e.code === 'KeyJ' && player.charging){ 
        player.charging = false; 
        if(shuttle.stuck && serving === 'player'){ player.swingAnim = 10; serve('player', player.chargeVal); } 
        else { triggerSwing(player, player.chargeVal); } 
        player.chargeVal = 0; 
    } 
    if(e.code === 'Numpad1' && player2.charging && gameMode === 'pvp'){ 
        player2.charging = false; 
        if(shuttle.stuck && serving === 'player2'){ player2.swingAnim = 10; serve('player2', player2.chargeVal); } 
        else { triggerSwing(player2, player2.chargeVal); } 
        player2.chargeVal = 0; 
    } 
});

canvas.addEventListener('mousedown', ()=>{ canvas.focus(); if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); });

/* =========================================
   游戏核心逻辑 (CORE LOGIC)
   ========================================= */
function startGame(){ if(running) return; running = true; paused = false; lastTime = performance.now(); resetRound(); requestAnimationFrame(loop); }

function resetRound() {
    serving = 'player';
    lastHitter = 'player';
    
    // 1. 重置位置
    player.x = margin;
    player2.x = W - margin;
    player.y = player2.y = H / 2;
    player.vx = 0; player.vy = 0;
    player2.vx = 0; player2.vy = 0;

    // 2. 重置球
    shuttle.stuck = true;
    shuttle.vx = shuttle.vy = 0;
    shuttle.isSmash = false;
    shuttle.isMeteor = false; // 确保陨石状态也被清除
    particles = [];

    // 3. === 新增：重置角色状态与能量 ===
    [player, player2].forEach(p => {
        p.charging = false;
        p.chargeVal = 0;
        p.energy = 0;       // 清空能量
        p.skillTimer = 0;
        
        // 如果技能激活中，强制关闭以恢复属性(速度/大小等)
        if (p.skillActive) {
            deactivateSkill(p);
        }
        
        // 再次确保属性完全回退到基准值（防止有漏网之鱼）
        if (p.baseStats) {
            p.speed = p.baseStats.speed;
            p.jumpPower = p.baseStats.jump;
            p.maxPower = p.baseStats.maxPower;
            p.smashMult = p.baseStats.smash;
            p.hitRange = p.baseStats.hitRange;
        }
        
        // 清除特殊状态标记
        p.shadowClone = false;
        p.isGiant = false; 
        p.impactVx = 0;
    });

    // 4. 重置 AI 与 UI
    if (gameMode === 'cpu') resetAI();
    recalcPositions();
    updateUI(); // 强制更新 UI 移除能量满的特效
    
    // 移除能量条满的 CSS 类
    document.querySelector('.p1-box').classList.remove('energy-full');
    document.querySelector('.p2-box').classList.remove('energy-full');
    const p1Bar = document.getElementById('p1EBar');
    const p2Bar = document.getElementById('p2EBar');
    if(p1Bar) p1Bar.style.width = '0%';
    if(p2Bar) p2Bar.style.width = '0%';
}

function recalcPositions(){ player.x = clamp(player.x, 10, W/2 - 60); player2.x = clamp(player2.x, W/2 + 60, W - 10); if(shuttle.stuck){ if(serving === 'player') { shuttle.x = player.x + 40; shuttle.y = player.y - 70; } else { shuttle.x = player2.x - 40; shuttle.y = player2.y - 70; } } }

function serve(who='player', power=0.5){
  if(!shuttle.stuck) return; 
  serving = who; lastHitter = who; shuttle.stuck = false; shuttle.isSmash = false;
  const dir = who === 'player' ? 1 : -1; const pObj = who === 'player' ? player : player2; 
  let actualPower = Math.max(0.2, power); let powerCurve = 1.0 + actualPower * 1.0; 
  let speedX = (baseSpeed + level * 0.3) * powerCurve * pObj.maxPower; if (speedX > 25) speedX = 25; 
  let speedY = -7 - (actualPower * 7); 
  shuttle.x = dir===1 ? (player.x + 50) : (player2.x - 50); shuttle.y = dir===1 ? (player.y - 80) : (player2.y - 80);
  shuttle.vx = dir * speedX; shuttle.vy = speedY; 
  beep(400 + actualPower*200, 0.1, 'sine');
}

function pointScored(who, reason="") {
    if(reason) showMsg(reason);
    
    if(who === 'player') player.score++; 
    else player2.score++; 
    
    beep(who==='player'?600:200, 0.4, 'square', 0.1); 
    updateUI();

    // === 修改：净胜 2 分才算赢 ===
    const p1 = player.score;
    const p2 = player2.score;
    
    // 判断条件：分数达到 11 且 至少领先对手 2 分
    const p1Wins = p1 >= MAX_SCORE && (p1 - p2) >= 2;
    const p2Wins = p2 >= MAX_SCORE && (p2 - p1) >= 2;

    if (p1Wins || p2Wins) {
        gameOver = true;
        winnerText.textContent = (p1Wins ? "玩家 1" : (gameMode==='cpu'?"电脑":"玩家 2")) + " 获胜!";
        winnerOverlay.style.display = "flex";
        return;
    }
    // ============================

    const total = player.score + player2.score; 
    level = 1 + Math.floor(total / 5); 
    serving = who; 
    shuttle.stuck = true; 
    shuttle.vx = shuttle.vy = 0; 
    recalcPositions(); 
    if(gameMode === 'cpu') resetAI(); 
}

function activateSkill(p) {
    if (p.energy < 100 || p.skillActive) return; 
    p.skillActive = true; p.energy = 0; p.skillTimer = 600; 
    playSkillSound(); 
    showMsg(`${p === player ? "P1" : "P2"} 开启奥义!`);
    createHitParticles(p.x, p.y, '#ffff00', 50); 
    if (p.id === 'balanced') {
        p.speed *= 1.4; p.jumpPower *= 1.2; p.maxPower *= 1.4; p.smashMult *= 1.3; p.hitRange *= 1.5; 
    } else if (p.id === 'ninja') {
        p.hitRange *= 2.2; p.shadowClone = true;
    } else if (p.id === 'power') {
        p.isGiant = true; p.hitRange *= 1.8; p.maxPower *= 1.2;
    }
}

function deactivateSkill(p) {
    p.skillActive = false;
    p.speed = p.baseStats.speed; p.jumpPower = p.baseStats.jump; p.maxPower = p.baseStats.maxPower;
    p.smashMult = p.baseStats.smash; p.hitRange = p.baseStats.hitRange;
    if (p.id === 'ninja') p.shadowClone = false;
    if (p.id === 'power') p.isGiant = false;
}

function triggerSwing(pObj, power) { pObj.swingTimer = 25; pObj.swingAnim = 10; pObj.lastPower = power; pObj.hasHit = false; }
function collideRacket(pObj){ return Math.hypot(shuttle.x - pObj.handX, shuttle.y - pObj.handY) < (shuttle.radius + pObj.hitRange); }

/* =========================================
   AI 逻辑 (ARTIFICIAL INTELLIGENCE)
   ========================================= */
const AI_STATE = { IDLE: 0, MOVING: 1, PREPARING: 2, STRIKING: 3 };
let ai = {
  state: AI_STATE.IDLE, targetX: W - 150, baseX: W - 150, reactionTimer: 0, 
  predictedX: null, interceptY: null, willOut: false, smashIntent: false, 
  errorOffset: 0, serveTargetPower: 0, recalcTimer: 0, serveDelay: 0
};

function resetAI() {
  ai.state = AI_STATE.IDLE; ai.baseX = W * 0.75; ai.targetX = ai.baseX; 
  ai.predictedX = null; ai.interceptY = null; ai.willOut = false; 
  ai.reactionTimer = 0; ai.errorOffset = 0; ai.recalcTimer = 0; ai.serveDelay = 0; 
  const serviceLineDist = 200; const netX = W / 2;
  // === 修改发球站位逻辑：完全随机 ===

  // 计算合法站位区间
  // 起点 (minX)：中网 + 200px (发球线) + 20px (稍微往后站一点点，不踩线)
  const minX = netX + serviceLineDist + 10;
  
  // 终点 (maxX)：最右侧 - 60px (保留一点身位，不贴墙)
  const maxX = W - 60;

  // 在区间内完全随机选择一个点
  ai.serveTargetX = minX + Math.random() * (maxX - minX);

  // ==============================
  player2.charging = false; player2.chargeVal = 0;
}

function analyzeTrajectory(p2) {
  if (shuttle.vx <= 0 && !shuttle.stuck && shuttle.x < W/2) return null;
  let timeSteps = 0;
  let simX = shuttle.x, simY = shuttle.y;
  let simVx = shuttle.vx, simVy = shuttle.vy;
  const groundY = H - 40; const bounceDamping = 0.75; 
  let bestIntercept = null; let landingX = null;

  while (timeSteps < 200) { 
      simVy += worldGravity * 0.8; 
      let drag = 0.996; simVx *= drag; simVy *= drag;
      simX += simVx; simY += simVy; 
      timeSteps++;
      if (simX < 0) { simX = 0; simVx = -simVx * bounceDamping; }
      if (simX > W) { simX = W; simVx = -simVx * bounceDamping; }
      if (simY < 0) { simY = 0; simVy = -simVy * bounceDamping; }
      if (simY >= groundY) { landingX = simX; break; }

      if (simX > W/2 + 20 && simX < W - 20) {
          let standingReach = p2.y - 130;
          if (p2.skillActive && p2.id === 'speed') standingReach = 999; 
          if (simY < standingReach) {
              const distToRun = Math.abs(simX - p2.x);
              const timeToRun = distToRun / p2.speed; 
              if (timeToRun < timeSteps) {
                  if (bestIntercept === null || simY < bestIntercept.y) bestIntercept = { x: simX, y: simY };
              }
          }
      }
  }
  if (landingX === null) landingX = simX;
  return { landingX, intercept: bestIntercept };
}

function updateAI(){
  if(gameMode !== 'cpu') return;
  const settings = DIFFICULTY_SETTINGS[selectedDifficulty];
  if (player2.swingAnim > 0) { player2.vx = 0; return; }
  if (Math.abs(player2.impactVx) > 2 && selectedDifficulty !== 'easy') {
      player2.vx = (player2.impactVx > 0) ? -player2.speed : player2.speed; return;
  }
  if(serving === 'player2' && shuttle.stuck){ 
      if (Math.abs(player2.x - ai.serveTargetX) > 5) {
          player2.vx = (player2.x < ai.serveTargetX) ? player2.speed : -player2.speed; return; 
      } 
      player2.vx = 0; 
      const distToNet = Math.abs(player2.x - W/2);
      let servePower = 0.5; 
      if (distToNet < 250) {
          if (Math.random() < 0.7) {
              servePower = 0.25 + Math.random() * 0.1; // 0.25~0.35 (极轻)
          } else {
              servePower = 0.85 + Math.random() * 0.15; // 0.85~1.0 (偷后场)
          }
      } 
      // 情况 B: 站位靠后 (中后场)
      // 策略：必须保证过网，距离越远，基础力度越大
      else {
          // 计算一个“安全下限”
          // 逻辑：距离 250px 时至少需要 0.5 力度，距离 800px 时至少需要 0.9 力度
          // 线性插值公式
          let minSafePower = 0.5 + ((distToNet - 250) / 600) * 0.5;
          
          // 限制最大值为 0.95 (留点余地)
          if (minSafePower > 0.95) minSafePower = 0.95;

          // 最终力度 = 安全下限 + 随机波动
          servePower = minSafePower + Math.random() * (1.0 - minSafePower);
      }
      
      // 再次兜底，防止算出奇怪的数值
      servePower = clamp(servePower, 0.2, 1.0);
      player2.swingAnim = 10; serve('player2', servePower); resetAI(); return; 
  }
  const isMyTurn = lastHitter !== 'player2';
  const ballComing = isMyTurn && ((shuttle.vx > 0) || (shuttle.x > W/2)); 

  if (ballComing) {
      ai.recalcTimer++;
      if (ai.predictedX === null || ai.recalcTimer > 10) {
          const traj = analyzeTrajectory(player2);
          if (traj) {
              let target = traj.landingX; ai.interceptY = null;
              if (settings.intercept && traj.intercept) {
                  if (Math.random() < settings.smashProb) { target = traj.intercept.x; ai.interceptY = traj.intercept.y; }
              }
              let maxError = settings.error; ai.errorOffset = (Math.random() - 0.5) * maxError;
              ai.predictedX = target + ai.errorOffset; ai.recalcTimer = 0; if (ai.predictedX === null) { ai.reactionTimer = settings.reaction; };
          }
      }
  } else { ai.predictedX = ai.baseX; ai.interceptY = null; }

  let moveTarget = ai.predictedX;

  if (ai.reactionTimer > 0) {
      ai.reactionTimer--;
      if (!player2.onGround) {
          // 不做任何操作，保留上一帧的 vx
      } 
      // 2. 如果在地面，模拟"急停/发呆"的摩擦力，而不是瞬间静止
      else {
          player2.vx *= 0.8; // 快速但平滑地减速
          if (Math.abs(player2.vx) < 0.1) player2.vx = 0;
      }
      return; // 直接跳过后面的移动和击球逻辑，这一帧 AI "短路"了
  }

  if (moveTarget !== null) {
      if (ai.interceptY !== null) moveTarget += 15;
      moveTarget = clamp(moveTarget, W/2 + 40, W - 40);
      let dist = moveTarget - player2.x;
      let actualSpeed = player2.speed * settings.speedMult;
      if (Math.abs(dist) > 10) player2.vx = (dist > 0) ? actualSpeed : -actualSpeed; else player2.vx = 0;
  }

  if (player2.id === 'speed' && player2.skillActive) {
      let targetY = shuttle.y + 40; let distY = targetY - player2.y;
      player2.vy = distY * 0.15; if (player2.vy > 12) player2.vy = 12; if (player2.vy < -12) player2.vy = -12;
  } else if (ai.interceptY !== null && ballComing) {
      let distToTarget = Math.abs(player2.x - ai.predictedX);
      if (distToTarget < 50) {
          let shouldJump = true;
          if (shuttle.y > player2.y - 120) shouldJump = false;
          if (Math.abs(shuttle.x - player2.x) > 100) shouldJump = false;
          if (shouldJump) {
              if (player2.onGround) { player2.vy = -player2.jumpPower; player2.onGround = false; player2.jumpCount = 1; }
              else if (player2.doubleJump && player2.jumpCount < 2 && player2.vy > 0) {
                  if (shuttle.y < player2.y - 50) { player2.vy = -player2.jumpPower * 0.9; player2.jumpCount = 2; createHitParticles(player2.x, player2.y + 40, '#fff', 8); }
              }
          }
      }
  }

  const distToBall = Math.hypot(shuttle.x - player2.handX, shuttle.y - player2.handY);
  const hitRange = player2.hitRange + 20; 
  if (shuttle.x > W/2 && distToBall < hitRange && !shuttle.stuck && isMyTurn) {
      let isHighEnough = shuttle.y < (H * 0.5); let canSmash = isHighEnough && !player2.onGround;
      if (player2.skillActive && player2.id === 'speed') canSmash = true;
      let isBackCourt = player2.x > W - 300; let hitPower = 0.5; let distToNet = Math.abs(player2.x - W/2);
      if (canSmash) { if (Math.random() < 0.8) hitPower = 0.8; else hitPower = 0.2; } 
      else if (shuttle.y > H - 150) { hitPower = 0.8; } 
      else {
          if (isBackCourt) { hitPower = (Math.random() < 0.7) ? 0.8 : 0.5; } 
          else { 
              let safeToDrop = (distToNet < 250);
              if (selectedDifficulty !== 'easy' && safeToDrop && Math.random() < 0.4) { hitPower = 0.3; } else { hitPower = 0.5; }
          }
      }
      triggerSwing(player2, hitPower); ai.predictedX = null;
  }
  
  if (player2.energy >= 100) {
      if (ballComing && (Math.abs(shuttle.x - player2.x) > 100 || shuttle.y < 200)) activateSkill(player2);
  }
}

/* =========================================
   物理与更新 (PHYSICS & UPDATE)
   ========================================= */
function updateParticles(dt) { for(let i=particles.length-1; i>=0; i--){ let p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.08 * dt; if(p.life <= 0) particles.splice(i, 1); } }
function createHitParticles(x, y, color, count=12) { for(let i=0; i<count; i++) particles.push({ x: x, y: y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1.0, color: color }); }

function update(dt){
  if (keys['KeyU'] || keys['ShiftLeft']) activateSkill(player); 
  if (gameMode === 'cpu' && player2.energy >= 100) activateSkill(player2);
  if (gameMode === 'pvp' && (keys['Numpad4'] || keys['Numpad0'])) activateSkill(player2);

  [player, player2].forEach(p => {
      if (p.skillActive) { p.skillTimer -= dt; if (p.skillTimer <= 0) deactivateSkill(p); }
  });

  let dtP1 = dt, dtP2 = dt, dtBall = dt;
  if (player.skillActive && player.id === 'ninja') { dtP2 *= 0.5; if (lastHitter === 'player2') dtBall *= 0.5; }
  if (player2.skillActive && player2.id === 'ninja') { dtP1 *= 0.5; if (lastHitter === 'player') dtBall *= 0.5; }

  updateAI(); 

  [player, player2].forEach(p => {
      if (p.id === 'ninja' && p.skillActive) {
          if (!p.trailCounter) p.trailCounter = 0; p.trailCounter++;
          if (p.trailCounter % 3 === 0) {
              p.trails.push({ x: p.x, y: p.y, vx: p.vx, onGround: p.onGround, swingAnim: p.swingAnim, charging: p.charging, chargeVal: p.chargeVal, life: 1.0, walkCycle: Date.now() * 0.015 });
          }
      }
      if (p.trails && p.trails.length > 0) {
          for (let i = p.trails.length - 1; i >= 0; i--) { p.trails[i].life -= 0.05; if (p.trails[i].life <= 0) p.trails.splice(i, 1); }
      }
  });

  if(player.charging) player.chargeVal = Math.min(1, player.chargeVal + player.chargeRate * dtP1);
  if(gameMode === 'pvp' && player2.charging) player2.chargeVal = Math.min(1, player2.chargeVal + player2.chargeRate * dtP2);

  // === P1 物理 ===
  let p1BaseSpeed = player.speed; if (player.skillActive && player.id === 'speed') p1BaseSpeed *= 1.5;
  let p1IntentVx = keys['KeyA'] ? -p1BaseSpeed : keys['KeyD'] ? p1BaseSpeed : 0;
  player.vx = p1IntentVx + (player.impactVx || 0);

  if (player.skillActive && player.id === 'speed') {
      if (keys['KeyW']) player.vy = -player.speed * 1.2; else if (keys['KeyS']) player.vy = player.speed * 1.2; else player.vy = 0; 
      player.onGround = false; if (Math.random()<0.3) createHitParticles(player.x, player.y+20, '#60a5fa', 1);
  } else { player.vy += worldGravity * dtP1 * 0.9; }
  player.x += player.vx * dtP1 * 4; player.y += player.vy * dtP1 * 4;

  // === P2 物理 ===
  let p2BaseSpeed = player2.speed; if (player2.skillActive && player2.id === 'speed') p2BaseSpeed *= 1.5;
  let p2IntentVx = 0;
  if (gameMode === 'pvp') { p2IntentVx = keys['ArrowLeft'] ? -p2BaseSpeed : keys['ArrowRight'] ? p2BaseSpeed : 0; } 
  else { p2IntentVx = player2.vx; }
  player2.vx = p2IntentVx + (player2.impactVx || 0);

  if (player2.skillActive && player2.id === 'speed') {
      if (gameMode === 'pvp') {
          if (keys['ArrowUp']) player2.vy = -player2.speed * 1.2; else if (keys['ArrowDown']) player2.vy = player2.speed * 1.2; else player2.vy = 0;
      } 
      player2.onGround = false; if (Math.random()<0.3) createHitParticles(player2.x, player2.y+20, '#60a5fa', 1);
  } else { player2.vy += worldGravity * dtP2 * 0.9; }
  player2.x += player2.vx * dtP2 * 4; player2.y += player2.vy * dtP2 * 4;

  if (player.impactVx) { player.impactVx *= 0.9; if(Math.abs(player.impactVx) < 0.5) player.impactVx = 0; }
  if (player2.impactVx) { player2.impactVx *= 0.9; if(Math.abs(player2.impactVx) < 0.5) player2.impactVx = 0; }

  if(player.y >= H - 40){ player.y = H - 40; player.vy = 0; player.onGround = true; if(player.jumpCount) player.jumpCount=0; }
  if(player2.y >= H - 40){ player2.y = H - 40; player2.vy = 0; player2.onGround = true; if(player2.jumpCount) player2.jumpCount=0; }
  
  const boundL = COURT_PADDING + 20; const boundR = W - COURT_PADDING - 20; const serviceDist = 200; 
  let p1MaxX = W/2 - 50; let p2MinX = W/2 + 50;
  if (shuttle.stuck) { p1MaxX = W/2 - serviceDist; p2MinX = W/2 + serviceDist; }
  player.x = clamp(player.x, boundL, p1MaxX); player2.x = clamp(player2.x, p2MinX, boundR);

  if(player.swingTimer > 0) player.swingTimer--; if(player2.swingTimer > 0) player2.swingTimer--;
  if(player.swingAnim > 0) player.swingAnim--; if(player2.swingAnim > 0) player2.swingAnim--;

  if(!shuttle.stuck){
    const prevX = shuttle.x;
    shuttle.vy += worldGravity * dtBall * 0.8; 
    let drag = Math.pow(airDrag, dtBall); shuttle.vx *= drag; shuttle.vy *= drag;
    shuttle.x += shuttle.vx * dtBall; shuttle.y += shuttle.vy * dtBall;

    const bounceDamping = 0.75; 
    if (shuttle.y < 0) { shuttle.y = 0; shuttle.vy = Math.abs(shuttle.vy) * bounceDamping; beep(150, 0.05, 'square'); createHitParticles(shuttle.x, 0, '#aaaaaa', 8); }
    if (shuttle.x < 0) { shuttle.x = 0; shuttle.vx = Math.abs(shuttle.vx) * bounceDamping; beep(150, 0.05, 'square'); createHitParticles(0, shuttle.y, '#aaaaaa', 8); }
    if (shuttle.x > W) { shuttle.x = W; shuttle.vx = -Math.abs(shuttle.vx) * bounceDamping; beep(150, 0.05, 'square'); createHitParticles(W, shuttle.y, '#aaaaaa', 8); }

    const netX = W/2; const netTop = H - 200; 
    if (Math.abs(shuttle.x - netX) < 10 && shuttle.y > netTop) {
        if (shuttle.y < netTop + 15) { shuttle.vy = -Math.abs(shuttle.vy)*0.7-2; shuttle.vx*=-0.5; shuttle.x = (shuttle.x<netX)?netX-12:netX+12; beep(200,0.05,'triangle',0.15); } 
        else { shuttle.vx *= -0.2; if(prevX<netX && shuttle.x>netX) shuttle.x=netX-8; if(prevX>netX && shuttle.x<netX) shuttle.x=netX+8; }
    }
    if(shuttle.y > H - 10){
      if (shuttle.x < W / 2) pointScored('player2', "P2 得分!"); else pointScored('player', "P1 得分!"); return; 
    }
    if(collideRacket(player) && player.swingTimer > 0 && !player.hasHit) { if (lastHitter !== 'player') handleHit(player, 1); }
    if(collideRacket(player2) && player2.swingTimer > 0 && !player2.hasHit) { if (lastHitter !== 'player2') handleHit(player2, -1); }
  } else { recalcPositions(); }
  
  updateParticles(dtBall);
  const p1Bar = document.getElementById('p1EBar'); const p2Bar = document.getElementById('p2EBar');
  if(p1Bar) { p1Bar.style.width = player.energy + '%'; if(player.energy >= 100) p1Bar.parentElement.classList.add('energy-full'); else p1Bar.parentElement.classList.remove('energy-full'); }
  if(p2Bar) { p2Bar.style.width = player2.energy + '%'; if(player2.energy >= 100) p2Bar.parentElement.classList.add('energy-full'); else p2Bar.parentElement.classList.remove('energy-full'); }
}

function handleHit(pObj, dir) {
  if (shuttle.isMeteor && lastHitter !== (pObj === player ? 'player' : 'player2')) {
      beep(100, 0.3, 'sawtooth'); pObj.impactVx = -dir * 7;
      createHitParticles(pObj.x, pObj.y, '#ff4400', 30); shuttle.isMeteor = false;
  }
  lastHitter = (dir === 1) ? 'player' : 'player2';
  if (!pObj.skillActive) { pObj.energy = Math.min(pObj.maxEnergy, pObj.energy + 20); }
  pObj.hasHit = true; 
  let power = pObj.lastPower || 0.5; pObj.charging = false; pObj.chargeVal = 0;
  const isJumpSmash = !pObj.onGround && shuttle.y < (H * 0.6);
  const isDropShot = power < 0.4 && !isJumpSmash; const powerFactor = pObj.maxPower || 1.0; 
  if(isJumpSmash) {
    shuttle.isSmash = true;
    if (pObj.isGiant) shuttle.isMeteor = true; else shuttle.isMeteor = false;
    if(pObj === player) showMsg("P1 扣杀!!"); else showMsg("P2 扣杀!!");
    const distToNet = Math.abs(pObj.x - W/2);
    let smashSpeed = Math.abs(baseSpeed + level) * (1.9 + power * 1.3) * pObj.smashMult * powerFactor;
    if (distToNet > 250) smashSpeed *= (1 + (distToNet - 250) / 400); 
    let netProximity = Math.max(0.2, 1 - (distToNet / 400));
    let desiredVy = 8 + (netProximity * 18) + (power * 5);
    const netSafeHeight = (H - 200) - 20;
    let avgVx = smashSpeed * 0.95; let timeToNet = distToNet / avgVx;
    let maxVyAllowed = (netSafeHeight - shuttle.y) / timeToNet - (0.5 * worldGravity * timeToNet);
    if (desiredVy > maxVyAllowed) { desiredVy = maxVyAllowed; if (desiredVy < 2) { desiredVy = 2; smashSpeed *= 1.2; } }
    shuttle.vx = dir * smashSpeed; shuttle.vy = desiredVy; 
    playSmashSound(power); createHitParticles(shuttle.x, shuttle.y, pObj.color, 25); 
  } else {
    shuttle.isSmash = false; shuttle.isMeteor = false; 
    if (isDropShot) {
       shuttle.vx = dir * Math.abs(baseSpeed) * (1.0 + power); shuttle.vy = -7 - Math.random()*2; 
       beep(800, 0.05, 'triangle', 0.1); createHitParticles(shuttle.x, shuttle.y, '#ffffff', 5);
    } else {
       let hitSpeed = Math.abs(baseSpeed + level) * (1.3 + power * 0.8) * (1 + (pObj.smashMult-1)*0.5) * powerFactor;
       let upForce = -8 - (power * 8); 
       shuttle.vx = dir * hitSpeed; shuttle.vy = upForce; 
       beep(600, 0.1, 'sine', 0.1 + power*0.1); createHitParticles(shuttle.x, shuttle.y, pObj.color, 10);
    }
  }
}
  
function togglePause() {
    if (gameOver) return;
    paused = !paused;
    const menu = document.getElementById('pauseMenu');
    if (paused) { menu.style.display = 'flex'; } else { menu.style.display = 'none'; lastTime = performance.now(); requestAnimationFrame(loop); }
}
document.getElementById('btnPause').onclick = () => { togglePause(); document.getElementById('btnPause').blur(); };
document.getElementById('btnResume').onclick = togglePause;
document.getElementById('btnReset').onclick = () => { player.score = 0; player2.score = 0; level = 1; resetRound(); updateUI(); togglePause(); };
document.getElementById('btnQuit').onclick = () => { 
        // 1. 停止游戏循环 (关键)
        running = false; 
        paused = false; 

        // 2. 隐藏游戏内的 UI
        document.getElementById('pauseMenu').style.display = 'none'; 
        document.getElementById('overlay').style.display = 'none'; // 同时也隐藏胜利结算层

        // 3. 重新显示选人菜单 (无缝切换)
        document.getElementById('charSelectScreen').style.display = 'flex'; 
        
        // 4. (可选) 清空画布，让背景变黑
        ctx.clearRect(0, 0, W, H);
    };

function loop(t){ 
    if(!running) return; 
    if (paused) return; 
    const now = t || performance.now(); 
    let dt = (now - lastTime) / 16.666; 
    if(!isFinite(dt) || dt <= 0) dt = 1; if(dt > 4) dt = 4; lastTime = now; 
    if(!gameOver){ update(dt); draw(); } 
    requestAnimationFrame(loop); 
}

/* =========================================
   渲染绘制 (RENDERING)
   ========================================= */
function draw(){ ctx.clearRect(0,0,W,H); drawCourt(); drawNet(); drawParticles(); drawShuttle(); drawStickman(player,true); drawStickman(player2,false); }
function drawCourt(){ 
    const grd = ctx.createLinearGradient(0,0,0,H); grd.addColorStop(0,'rgba(255,255,255,0.02)'); grd.addColorStop(1,'rgba(0,0,0,0.12)'); 
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H); ctx.fillStyle = '#0b1220'; ctx.fillRect(0, H-10, W, 10); 
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(COURT_PADDING, H-10); ctx.lineTo(COURT_PADDING, H-40); ctx.moveTo(W - COURT_PADDING, H-10); ctx.lineTo(W - COURT_PADDING, H-40); ctx.stroke(); 
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(COURT_PADDING, H-10); ctx.lineTo(W-COURT_PADDING, H-10); ctx.stroke(); 
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.setLineDash([5, 5]); 
    ctx.beginPath(); ctx.moveTo(W/2 - 200, H-10); ctx.lineTo(W/2 - 200, H-40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W/2 + 200, H-10); ctx.lineTo(W/2 + 200, H-40); ctx.stroke(); ctx.setLineDash([]);
}
function drawNet(){ const netTop = H - 200; ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(W/2-4,netTop,8,H-netTop); }
function drawParticles() { for(let p of particles){ ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill(); } ctx.globalAlpha = 1; }
function drawShuttle() {
    if (shuttle.y < -20) {
        ctx.save(); ctx.fillStyle = shuttle.isSmash ? '#ff4444' : '#fff'; ctx.beginPath();
        ctx.moveTo(shuttle.x, 15); ctx.lineTo(shuttle.x - 8, 25); ctx.lineTo(shuttle.x + 8, 25); ctx.fill(); ctx.restore(); return; 
    }
    ctx.save(); ctx.translate(shuttle.x, shuttle.y); 
    let angle = 0; if (shuttle.stuck) { if (serving === 'player') angle = -0.5; else angle = Math.PI + 0.5; } 
    else { if (Math.abs(shuttle.vx) > 0.1 || Math.abs(shuttle.vy) > 0.1) angle = Math.atan2(shuttle.vy, shuttle.vx); } 
    ctx.rotate(angle); 

    if (shuttle.isMeteor) {
        const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 40);
        gradient.addColorStop(0, 'rgba(255, 255, 0, 0.9)'); gradient.addColorStop(0.3, 'rgba(255, 69, 0, 0.6)'); gradient.addColorStop(1, 'rgba(255, 0, 0, 0)'); 
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, 45, 0, Math.PI*2); ctx.fill();
        for(let i=0; i<20; i++) { 
            ctx.beginPath(); ctx.fillStyle = Math.random() > 0.4 ? '#ffff00' : '#ff4500'; ctx.globalAlpha = (1 - i/20) * 0.8;
            const trailX = -10 - (i * 6) - Math.random() * 10; const spread = 5 + i * 1.5; const trailY = (Math.random() - 0.5) * spread; const size = 12 - (i * 0.5);
            ctx.arc(trailX, trailY, size > 0 ? size : 1, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1.0; 
    }

    const skirtLen = 22; const skirtWidth = 14; const neckWidth = 6; 
    ctx.beginPath(); ctx.moveTo(-4, -neckWidth); ctx.lineTo(-skirtLen, -skirtWidth); ctx.lineTo(-skirtLen, skirtWidth); ctx.lineTo(-4, neckWidth); ctx.closePath(); 
    ctx.fillStyle = shuttle.isMeteor ? '#550000' : (shuttle.isSmash ? '#ffcccc' : '#ffffff'); ctx.fill(); 
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); 
    ctx.moveTo(-4, 0); ctx.lineTo(-skirtLen, 0); ctx.moveTo(-8, -neckWidth-1); ctx.lineTo(-8, neckWidth+1); ctx.moveTo(-15, -skirtWidth+2); ctx.lineTo(-15, skirtWidth-2); ctx.stroke(); 
    
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); 
    const corkColor = shuttle.isMeteor ? '#000' : (shuttle.isSmash ? '#ef4444' : '#1e293b'); 
    const grd = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7); grd.addColorStop(0, '#64748b'); grd.addColorStop(0.3, corkColor); grd.addColorStop(1, corkColor); 
    ctx.fillStyle = grd; ctx.fill(); if(!shuttle.isSmash) { ctx.strokeStyle = '#0f1724'; ctx.lineWidth = 1; ctx.stroke(); } 
    
    if (!shuttle.stuck && !shuttle.isMeteor && (Math.abs(shuttle.vx) > 10 || Math.abs(shuttle.vy) > 10)) { 
        ctx.beginPath(); ctx.strokeStyle = shuttle.isSmash ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 2; 
        for(let i=0; i<3; i++) { const yOffset = (i-1) * 6; ctx.moveTo(-skirtLen - 5, yOffset); ctx.lineTo(-skirtLen - 15 - Math.random()*10, yOffset); } 
        ctx.stroke(); 
    } 
    ctx.restore(); 
}

function drawStickman(d, isPlayer, isGhost = false) {
    if (d.trails && d.trails.length > 0) {
        d.trails.forEach((t) => {
            ctx.save(); ctx.globalAlpha = t.life * 0.5; 
            const facingDir = isPlayer ? 1 : -1; const tColor = d.color;
            ctx.fillStyle = tColor; ctx.beginPath(); ctx.arc(t.x, t.y - 98, 12, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = tColor; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(t.x, t.y - 86); ctx.lineTo(t.x, t.y - 30); ctx.stroke();
            let lFootX, lFootY, rFootX, rFootY; const groundY = t.y;
            if (!t.onGround) { lFootX = t.x - 10 * facingDir; lFootY = groundY - 10; rFootX = t.x + 12 * facingDir; rFootY = groundY - 5; } else if (Math.abs(t.vx) > 0.5) { const stride = 18; lFootX = t.x + Math.sin(t.walkCycle) * stride; lFootY = groundY; rFootX = t.x + Math.sin(t.walkCycle + Math.PI) * stride; rFootY = groundY; } else { lFootX = t.x - 10; lFootY = groundY; rFootX = t.x + 10; rFootY = groundY; }
            ctx.beginPath(); ctx.moveTo(t.x, t.y - 30); ctx.lineTo(lFootX, lFootY); ctx.stroke(); ctx.beginPath(); ctx.moveTo(t.x, t.y - 30); ctx.lineTo(rFootX, rFootY); ctx.stroke();
            let shoulderY = t.y - 75; let handX = t.x + (25 * facingDir); let handY = shoulderY + 20;
            if (t.charging || t.swingAnim > 0) { handX = t.x - (20 * facingDir); handY = shoulderY - 30; }
            ctx.beginPath(); ctx.moveTo(t.x, shoulderY); ctx.lineTo(handX, handY); ctx.stroke();
            ctx.restore();
        });
    }
    
    ctx.save(); 
    if (d.isGiant && !isGhost) {
        ctx.translate(d.x, d.y); ctx.scale(1.5, 1.5); ctx.translate(-d.x, -d.y); 
        if (Math.random() < 0.5) { createHitParticles(d.x + (Math.random()-0.5)*30, d.y - Math.random()*80, 'rgba(255, 50, 0, 0.5)', 1); }
    }

    const cx = d.x; const headR = 12; const bodyBottom = d.y - 30; const bodyTop = d.y - 80; const groundY = d.y; const color = d.color; const facingDir = isPlayer ? 1 : -1; 

    if (d.skillActive && d.id === 'ninja' && !isGhost) {
            // 呼吸光晕
            const glowSize = 20 + Math.sin(Date.now() * 0.015) * 10; 
            ctx.shadowBlur = glowSize;
            ctx.shadowColor = '#00ff99'; // 荧光绿
        }

    if (d.skillActive && d.id === 'speed' && !isGhost) {
        ctx.save(); ctx.translate(cx, bodyTop + 20); 
        const breath = 1 + Math.sin(Date.now() * 0.01) * 0.1; ctx.scale(breath, breath);
        ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff'; ctx.fillStyle = 'rgba(100, 255, 255, 0.6)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate((i * 0.3) - 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60 - (i * 10), -10); ctx.lineTo(-40, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
        for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(-(i * 0.3) + 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60 + (i * 10), -10); ctx.lineTo(40, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
        ctx.restore();
    } 

    if (d.skillActive && d.id === 'balanced' && !isGhost) {
        ctx.save(); ctx.translate(d.x, d.y - 40); const scale = 1 + Math.sin(Date.now() * 0.02) * 0.1; ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)'; ctx.lineWidth = 2;
        for(let i=0; i<3; i++) { let offset = (Date.now() / 10 + i * 50) % 60; ctx.beginPath(); ctx.moveTo(-20 + i*20, 40 - offset); ctx.lineTo(-20 + i*20, 20 - offset); ctx.stroke(); }
        ctx.restore(); ctx.fillStyle = '#fffacd'; ctx.strokeStyle = '#fffacd';
    } else { ctx.fillStyle = color; ctx.strokeStyle = color; }

    ctx.beginPath(); ctx.arc(cx, bodyTop - 18, headR, 0, Math.PI*2); ctx.fill(); 
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, bodyTop - 6); ctx.lineTo(cx, bodyBottom); ctx.stroke(); 

    let lFootX, lFootY, rFootX, rFootY; 
    if (!d.onGround) { lFootX = cx - 10 * facingDir; lFootY = groundY - 10; rFootX = cx + 12 * facingDir; rFootY = groundY - 5; } 
    else if (Math.abs(d.vx) > 0.5) { const walkCycle = Date.now() * 0.015; const stride = 18; lFootX = cx + Math.sin(walkCycle) * stride; lFootY = groundY; rFootX = cx + Math.sin(walkCycle + Math.PI) * stride; rFootY = groundY; } 
    else { lFootX = cx - 10; lFootY = groundY; rFootX = cx + 10; rFootY = groundY; } 
    function drawLeg(hx, hy, fx, fy) { ctx.beginPath(); ctx.moveTo(hx, hy); const midX = (hx + fx) / 2; const midY = (hy + fy) / 2; const kneeX = midX + (facingDir * 4); const kneeY = midY; ctx.lineTo(kneeX, kneeY); ctx.lineTo(fx, fy); ctx.stroke(); } 
    drawLeg(cx, bodyBottom, lFootX, lFootY); drawLeg(cx, bodyBottom, rFootX, rFootY); 

    const shoulderY = bodyTop + 5; let upperArmLen = 22; let lowerArmLen = 22; let shoulderX = cx; let targetHandX, targetHandY; let baseHandX = cx + (isPlayer?25:-25); let baseHandY = shoulderY + 20; 
    if(d.charging) { let pullBack = 20 + d.chargeVal * 20; let liftUp = 30 + d.chargeVal * 20; targetHandX = cx - (isPlayer ? pullBack : -pullBack); targetHandY = shoulderY - liftUp; } 
    else if (d.swingAnim > 0) { let t = 1 - (d.swingAnim / 10); let startX = cx - (isPlayer ? 30 : -30); let startY = shoulderY - 40; let endX = cx + (isPlayer ? 40 : -40); let endY = shoulderY + 30; if(shuttle.isSmash) endY += 20; targetHandX = startX + (endX - startX) * t; targetHandY = startY + (endY - startY) * t; targetHandY -= Math.sin(t * Math.PI) * 10; } 
    else { targetHandX = baseHandX; targetHandY = baseHandY; } 
    let dx = targetHandX - shoulderX; let dy = targetHandY - shoulderY; let dist = Math.hypot(dx, dy); if(dist > (upperArmLen + lowerArmLen)) { let scale = (upperArmLen + lowerArmLen) / dist; targetHandX = shoulderX + dx * scale; targetHandY = shoulderY + dy * scale; } 
    let midX = (shoulderX + targetHandX) / 2; let midY = (shoulderY + targetHandY) / 2; let elbowDir = (isPlayer ? -1 : 1); let elbowX = midX + elbowDir * 10; let elbowY = midY + 10; 
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(targetHandX, targetHandY); ctx.stroke(); d.handX = targetHandX; d.handY = targetHandY; 
    let armAngle = Math.atan2(targetHandY - elbowY, targetHandX - elbowX); 
    ctx.save(); ctx.translate(targetHandX, targetHandY); ctx.rotate(armAngle); ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(15, 0); ctx.stroke(); 
    ctx.translate(15, 0); ctx.rotate(d.charging ? -0.5 : 0); ctx.strokeStyle = '#eee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(10, 0, 12, 8, 0, 0, Math.PI*2); ctx.stroke(); 
    if(d.swingAnim > 0) { ctx.fillStyle = shuttle.isSmash ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill(); } ctx.restore(); ctx.restore(); 

    if(d.charging) {
        const cBarX = cx - 20; const cBarY = bodyTop - 40;
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(cBarX, cBarY, 40, 6);
        let pColor = '#00ff00'; if(d.chargeVal > 0.4) pColor = '#ffff00'; if(d.chargeVal > 0.8) pColor = '#ff0000'; 
        ctx.fillStyle = pColor; ctx.fillRect(cBarX, cBarY, 40 * d.chargeVal, 6);
    }
}