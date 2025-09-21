// ダブルタップズーム防止
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

(() => {
  // --------- Utilities
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  // --------- Canvas / Stickman
  const canvas = qs('#gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  function fitCanvas(){
    const rect = canvas.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return;
    ctx.setTransform(1,0,0,1,0,0);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  
  const resizeObserver = new ResizeObserver(()=>{ 
    dpr = Math.max(1, window.devicePixelRatio || 1); 
    fitCanvas(); 
  });
  resizeObserver.observe(canvas);
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  // ボス敵の設定
  const boss = {
    x: () => (canvas.width / dpr) * 0.75,
    y: () => (canvas.height / dpr) * 0.3,
    width: 60, height: 80,
    color: '#dc2626',
    health: 100,
    maxHealth: 100,
    hitTimer: 0,
    shakeTimer: 0
  };

  // 棒人間の設定
  const stick = {
    x: () => (canvas.width / dpr) * 0.25,
    groundY: () => (canvas.height / dpr) - 50,
    width: 30, height: 50, color: '#06b6d4',
    vy: 0, state: 'idle', timer: 0,
    lastAction: null,
    actionHistory: []
  };

  function drawArms(x,y,a){
    ctx.beginPath(); ctx.moveTo(x, y+25); ctx.lineTo(x+12, y+35 + a*6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y+25); ctx.lineTo(x-12, y+35 - a*6); ctx.stroke();
  }
  function drawLegs(x,y,a){
    ctx.beginPath(); ctx.moveTo(x, y+40); ctx.lineTo(x+10, y+50 - a*6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y+40); ctx.lineTo(x-10, y+50 + a*6); ctx.stroke();
  }
  function drawGround(){
    const w = canvas.width / dpr;
    const gy = stick.groundY();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }
  
  function drawBoss(){
    const w = canvas.width / dpr, h = canvas.height / dpr;
    if(w === 0 || h === 0) return;
    
    const bx = boss.x() + (boss.shakeTimer > 0 ? (Math.random() - 0.5) * 8 : 0);
    const by = boss.y();
    
    // ボスの色（ダメージ時は赤く光る）
    const hitEffect = boss.hitTimer > 0 ? 1 - (boss.hitTimer / 15) : 0;
    const brightness = 1 + hitEffect * 0.8;
    
    ctx.fillStyle = boss.hitTimer > 0 ? '#ff6b6b' : boss.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    
    // ボス本体（角ばった形）
    ctx.fillRect(bx - boss.width/2, by, boss.width, boss.height);
    ctx.strokeRect(bx - boss.width/2, by, boss.width, boss.height);
    
    // 目
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx - 15, by + 15, 8, 8);
    ctx.fillRect(bx + 7, by + 15, 8, 8);
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 13, by + 17, 4, 4);
    ctx.fillRect(bx + 9, by + 17, 4, 4);
    
    // HPバー（ボス上部）
    const barWidth = boss.width;
    const barHeight = 6;
    const healthPercent = boss.health / boss.maxHealth;
    
    ctx.fillStyle = '#444';
    ctx.fillRect(bx - barWidth/2, by - 15, barWidth, barHeight);
    
    ctx.fillStyle = healthPercent > 0.5 ? '#4ade80' : healthPercent > 0.2 ? '#fbbf24' : '#ef4444';
    ctx.fillRect(bx - barWidth/2, by - 15, barWidth * healthPercent, barHeight);
    
    // HPバー枠
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - barWidth/2, by - 15, barWidth, barHeight);
  }
  
  function drawStickman(){
    const w = canvas.width / dpr, h = canvas.height / dpr;
    if(w === 0 || h === 0) return;
    
    ctx.clearRect(0,0,w,h);
    drawGround();
    drawBoss();
    
    ctx.fillStyle = stick.color;
    ctx.strokeStyle = '#f0f9ff';
    ctx.lineWidth = 3;
    const cx = stick.x();
    const cy = stickY() - stick.height;

    // body
    ctx.beginPath(); ctx.moveTo(cx, cy+20); ctx.lineTo(cx, cy+40); ctx.stroke();
    // head
    ctx.beginPath(); ctx.arc(cx, cy+10, 10, 0, Math.PI*2); ctx.fill();

    // limbs by state with enhanced animation
    if(stick.state==='punching'){
      // パンチ攻撃エフェクト
      ctx.beginPath(); ctx.moveTo(cx, cy+25); ctx.lineTo(cx+30, cy+20); ctx.stroke();
      drawLegs(cx, cy, 0);
      
      // パンチエフェクト
      if(stick.timer > 10){
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(cx + 35, cy + 20, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if(stick.state==='kicking'){
      drawArms(cx, cy, -0.5);
      ctx.beginPath(); ctx.moveTo(cx, cy+40); ctx.lineTo(cx+25, cy+35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy+40); ctx.lineTo(cx-5, cy+50); ctx.stroke();
      
      // キックエフェクト
      if(stick.timer > 15){
        ctx.fillStyle = '#ff6347';
        ctx.beginPath();
        ctx.arc(cx + 30, cy + 35, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if(stick.state==='jumping'){
      drawArms(cx, cy, 1);
      drawLegs(cx, cy, 0.8);
      
      // ジャンプエフェクト
      if(Math.abs(stick.vy) > 5){
        ctx.strokeStyle = '#4fd1ff';
        ctx.lineWidth = 2;
        for(let i = 0; i < 3; i++){
          ctx.beginPath();
          ctx.arc(cx, cy + 50 + i * 10, 15 - i * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else {
      drawArms(cx, cy, 0);
      drawLegs(cx, cy, 0);
    }
  }
  
  function stickY(){ return _y; }
  let _y = stick.groundY();

  function updateStick(){
    if(stick.state==='jumping'){
      stick.vy += 0.8;
      _y += stick.vy;
      const gy = stick.groundY();
      if(_y >= gy){ _y = gy; stick.state='idle'; stick.vy = 0; }
    }
    if(stick.timer>0){ 
      stick.timer--; 
      if(stick.timer===0 && stick.state!=='jumping') stick.state='idle'; 
    }
    
    // ボスのタイマー更新
    if(boss.hitTimer > 0) boss.hitTimer--;
    if(boss.shakeTimer > 0) boss.shakeTimer--;
  }
  
  function doAction(lane, isSuccessfulHit = false){
    const actions = ['punch', 'kick', 'jump'];
    const actionName = actions[lane];
    
    if(lane===0 && stick.state==='idle'){ 
      stick.state='punching'; 
      stick.timer=20; 
      stick.lastAction = 'punch';
    }
    else if(lane===1 && stick.state==='idle'){ 
      stick.state='kicking'; 
      stick.timer=25; 
      stick.lastAction = 'kick';
    }
    else if(lane===2 && stick.state==='idle'){ 
      stick.state='jumping'; 
      stick.vy=-18; 
      stick.lastAction = 'jump';
    }
    
    // 成功したヒットの場合、ボスにダメージ
    if(isSuccessfulHit){
      boss.hitTimer = 15;
      boss.shakeTimer = 10;
    }
    
    // アクション履歴に追加
    stick.actionHistory.push({
      action: actionName,
      time: Date.now(),
      success: isSuccessfulHit
    });
    
    // 履歴は最新5個まで保持
    if(stick.actionHistory.length > 5){
      stick.actionHistory.shift();
    }
  }

  // --------- Audio (WebAudio; synth voices for Punch/Kick/Jump)
  let AC;
  function ensureAC(){ 
    if(!AC){ 
      AC = new (window.AudioContext||window.webkitAudioContext)(); 
    } 
    if(AC.state === 'suspended'){ 
      AC.resume(); 
    } 
  }

  function env(node, t=0.12, a=0.001){
    const g = AC.createGain(); 
    g.gain.setValueAtTime(0, AC.currentTime); 
    g.gain.linearRampToValueAtTime(1, AC.currentTime + a); 
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + t);
    node.connect(g); 
    g.connect(AC.destination); 
    return g;
  }
  
  function noiseBuffer(){ 
    const len = AC.sampleRate * 0.3; 
    const b = AC.createBuffer(1,len,AC.sampleRate); 
    const d = b.getChannelData(0); 
    for(let i=0;i<len;i++){ 
      d[i] = Math.random()*2-1; 
    } 
    return b; 
  }
  
  function playPunch(v=1, perfect=false){ 
    ensureAC();
    // パンチ音（低音 + ノイズ）
    const n = AC.createBufferSource(); 
    n.buffer = noiseBuffer(); 
    const bp = AC.createBiquadFilter(); 
    bp.type='bandpass'; 
    bp.frequency.value = perfect ? 1200 : 900; 
    bp.Q.value = perfect ? 5 : 3; 
    n.connect(bp); 
    const g1 = AC.createGain(); 
    g1.gain.value = (perfect ? 0.4 : 0.3) * v; 
    bp.connect(g1); 
    const eg1 = env(g1, perfect ? 0.12 : 0.08);
    
    const o = AC.createOscillator(); 
    o.type='triangle'; 
    o.frequency.setValueAtTime(perfect ? 280 : 220, AC.currentTime); 
    o.frequency.exponentialRampToValueAtTime(perfect ? 180 : 140, AC.currentTime+0.09); 
    const g2 = AC.createGain(); 
    g2.gain.value = (perfect ? 0.35 : 0.25) * v; 
    const eg2 = env(g2, perfect ? 0.15 : 0.1);
    
    n.start(); o.start(); 
    o.stop(AC.currentTime+0.12); 
    n.stop(AC.currentTime+0.1);
    o.connect(g2); 
    eg2.connect(AC.destination); 
    eg1.connect(AC.destination);
  }
  
  function playKick(v=1, perfect=false){ 
    ensureAC();
    // キック音（超低音 + クリック）
    const o = AC.createOscillator(); 
    o.type='sine'; 
    o.frequency.setValueAtTime(perfect ? 140 : 120, AC.currentTime); 
    o.frequency.exponentialRampToValueAtTime(perfect ? 60 : 50, AC.currentTime+0.18);
    const g = AC.createGain(); 
    g.gain.value = (perfect ? 0.6 : 0.5) * v; 
    const eg = env(g, perfect ? 0.28 : 0.22, 0.004);
    o.connect(g); 
    eg.connect(AC.destination); 
    o.start(); 
    o.stop(AC.currentTime+0.24);
    
    const n = AC.createBufferSource(); 
    n.buffer = noiseBuffer(); 
    const hp = AC.createBiquadFilter(); 
    hp.type='highpass'; 
    hp.frequency.value = perfect ? 2200 : 1800; 
    n.connect(hp); 
    const cg = AC.createGain(); 
    cg.gain.value = (perfect ? 0.2 : 0.15) * v; 
    const ec = env(cg, 0.05, 0.001); 
    hp.connect(cg); 
    ec.connect(AC.destination); 
    n.start(); 
    n.stop(AC.currentTime+0.04);
  }
  
  function playJump(v=1, perfect=false){ 
    ensureAC();
    // ジャンプ音（上昇する高音）
    const n = AC.createBufferSource(); 
    n.buffer = noiseBuffer(); 
    const bp = AC.createBiquadFilter(); 
    bp.type='bandpass'; 
    bp.frequency.value = perfect ? 1800 : 1500; 
    bp.Q.value = perfect ? 1.2 : 0.8; 
    n.connect(bp); 
    const g1 = AC.createGain(); 
    g1.gain.value = (perfect ? 0.3 : 0.25) * v; 
    const eg1 = env(g1, perfect ? 0.4 : 0.3, 0.008); 
    bp.connect(g1); 
    eg1.connect(AC.destination);
    
    const o = AC.createOscillator(); 
    o.type='sine'; 
    o.frequency.setValueAtTime(perfect ? 720 : 660, AC.currentTime); 
    o.frequency.exponentialRampToValueAtTime(perfect ? 1000 : 880, AC.currentTime+0.12); 
    const g2 = AC.createGain(); 
    g2.gain.value = (perfect ? 0.25 : 0.18) * v; 
    const eg2 = env(g2, perfect ? 0.25 : 0.2, 0.004); 
    o.connect(g2); 
    eg2.connect(AC.destination); 
    o.start(); 
    o.stop(AC.currentTime+0.22); 
    n.start(); 
    n.stop(AC.currentTime+0.28);
  }
  
  const VOICES = [playPunch, playKick, playJump];

  // --------- Game State
  const State = {
    difficulty: 'normal',
    chart: [],
    idxByLane: [0,0,0],
    songLength: 60,
    appear: 2.5,
    windows: { perfect: .08, great: .13, good: .18 },
    score: 0, combo: 0, bestCombo: 0,
    tallies: {perfect:0, great:0, good:0, miss:0},
    hp: 100, hpMax: 100,
    startAt: 0,
    running: false,
    rafId: null,
    perfectStreak: 0
  };

  // --------- Chart Generator（リズム感重視）
  function generateChart(diff='normal'){
    const densityScale = 0.5; // overall note density reduced to 50%
    const cfg = {
      easy:   { bpm: 100, bars: 16, density: 1.2 },
      normal: { bpm: 120, bars: 18, density: 1.6 },
      hard:   { bpm: 140, bars: 20, density: 2.0 }
    }[diff];
    const beat = 60/cfg.bpm;
    const chart = [];
    let t = 2.0; // lead-in
    const stepsPerBar = 8;
    const chance = cfg.density * densityScale;

    for(let bar=0; bar<cfg.bars; bar++){
      for(let step=0; step<stepsPerBar; step++){
        const lanePattern = [0,1,2];
        const currentLane = lanePattern[(bar+step)%3];
        
        // メインビート
        if(Math.random() < 0.8 * chance){
          chart.push({t, lane: currentLane});
        }

        // サブビート
        if(Math.random() < 0.4 * chance && step%2===0){
          const subLane = lanePattern[(bar+step+1)%3];
          chart.push({t: t + beat/4, lane: subLane});
        }

        // ハードモード：連続攻撃
        if(diff==='hard' && Math.random() < 0.3 * densityScale && step%4===1){
          chart.push({t: t + beat/8, lane: lanePattern[(bar+step+2)%3]});
        }
        
        t += beat/2;
      }
      // 小節の間に短い休憩
      if(bar%4===3){ t += beat; }
    }
    
    chart.sort((a,b)=>a.t-b.t);
    return {chart, length: t + 2.0};
  }

  // --------- DOM Notes
  function spawnNotes(){
    qsa('.lane').forEach(l => l.querySelectorAll('.note').forEach(n=>n.remove()));
    for(const n of State.chart){
      const laneEl = qs(`.lane[data-lane="${n.lane}"]`);
      const el = document.createElement('div');
      el.className = `note ${['punch','kick','jump'][n.lane]}`;
      el.style.top = '-100px';
      el.dataset.t = n.t;
      laneEl.appendChild(el);
      n.el = el;
    }
    State.idxByLane = [0,0,0];
  }

  function updateNotes(now){
    const H = qs('#lanes').clientHeight - 80;
    const appear = State.appear;
    for(const n of State.chart){
      if(n.hit) continue;
      const dt = n.t - now;
      
      // ミス判定
      if(dt < -State.windows.good){
        n.hit = 'miss';
        State.tallies.miss++;
        State.combo = 0; 
        State.perfectStreak = 0;
        updateHUD();
        n.el.remove();
      }
      
      // ノートの移動
      if(dt < appear){
        const y = clamp((1 - (dt/appear)) * H, 0, H);
        n.el.style.top = (y + 16) + 'px';
        n.el.style.opacity = dt<0? 0.4 : 1;
        
        // 判定ライン近くでの強調
        if(Math.abs(dt) < 0.2){
          n.el.style.transform = `translate(-50%, -50%) scale(${1 + (0.2 - Math.abs(dt)) * 0.5})`;
        }
      }
    }
  }

  // --------- Input & Judgement
  function tryHit(lane){
    ensureAC();
    if(!State.running){ 
      doAction(lane, false); 
      VOICES[lane](0.7); 
      return; 
    }
    
    const now = AC.currentTime - State.startAt;
    let target = null, idx = -1, bestAbs = 999;
    
    for(let i = State.idxByLane[lane]; i < State.chart.length; i++){
      const n = State.chart[i];
      if(n.lane !== lane || n.hit) continue;
      const d = n.t - now; 
      const ad = Math.abs(d);
      if(ad < bestAbs){ 
        bestAbs = ad; 
        target = n; 
        idx = i; 
      }
      if(n.t > now + State.windows.good) break;
    }
    
    if(target && bestAbs <= State.windows.good){
      const j = bestAbs <= State.windows.perfect ? 'perfect' : 
                bestAbs <= State.windows.great ? 'great' : 'good';
      
      hitEffect(lane, j);
      target.hit = j; 
      target.el.classList.add('hit');
      setTimeout(() => target.el.remove(), 100);
      State.idxByLane[lane] = idx+1;
      applyJudge(j);
      doAction(lane, true);
      
      if(checkClear()) finish(true);
    } else {
      State.tallies.miss++; 
      State.combo=0; 
      State.perfectStreak = 0;
      judgeFlash('MISS', 'bad'); 
      shake(); 
      updateHUD();
      doAction(lane, false);
    }
  }

  function applyJudge(j){
    const pts = {perfect: 1500, great: 1000, good: 500}[j];
    const dmg = {perfect: 5, great: 3, good: 1}[j];
    
    // コンボボーナス
    const comboBonus = Math.floor(State.combo * 5);
    
    // パーフェクト連続ボーナス
    if(j === 'perfect'){
      State.perfectStreak++;
      const perfectBonus = State.perfectStreak >= 5 ? Math.floor(State.perfectStreak * 10) : 0;
      State.score += pts + comboBonus + perfectBonus;
    } else {
      State.perfectStreak = 0;
      State.score += pts + comboBonus;
    }
    
    State.combo++; 
    State.bestCombo = Math.max(State.bestCombo, State.combo);
    State.tallies[j]++;
    setHP(State.hp - dmg);
    judgeFlash(j.toUpperCase(), j==='perfect'?'ok':j==='great'?'warn':'');
    updateHUD();
    
    // コンボエフェクト
    if(State.combo > 0 && State.combo % 10 === 0){
      showComboEffect(State.combo);
    }
    
    const vol = j==='perfect'?1:j==='great'?0.85:0.7;
    const isPerfect = j === 'perfect';
    VOICES[lastLane](vol, isPerfect);
  }

  function judgeFlash(text, type){
    const el = qs('#judge');
    el.textContent = text;
    el.style.color = type==='ok'? '#4ade80' : type==='warn'? '#fbbf24' : type==='bad'? '#ef4444' : '#eaf6ff';
    el.style.transform = 'scale(1.2)';
    setTimeout(() => el.style.transform = 'scale(1)', 150);
  }

  function setHP(v){ 
    const oldHp = State.hp;
    State.hp = clamp(v,0,State.hpMax); 
    const hpBar = qs('#hpbar>i');
    hpBar.style.width = ((State.hp/State.hpMax)*100)+'%'; 
    
    if(v < oldHp){ 
      boss.health = Math.max(0, boss.health - (oldHp - v));
      hpBar.classList.add('damage');
      setTimeout(() => hpBar.classList.remove('damage'), 300);
      flashEnemy(); 
    } 
  }
  
  function flashEnemy(){ 
    const f = qs('#fight'); 
    f.classList.add('flash'); 
    setTimeout(()=> f.classList.remove('flash'), 200); 
  }
  
  function shake(){ 
    const f = qs('#fight'); 
    f.classList.add('shake'); 
    setTimeout(()=>f.classList.remove('shake'), 400); 
  }

  function hitEffect(lane, judge){
    const l = qs(`.lane[data-lane="${lane}"] .spark`); 
    l.classList.remove('show'); 
    void l.offsetWidth; 
    l.classList.add('show');
    
    const fx = qs('#hitFx'); 
    fx.classList.remove('show'); 
    void fx.offsetWidth; 
    fx.classList.add('show');
    
    // パーフェクト時の特別エフェクト
    if(judge === 'perfect'){
      const perfectFx = document.createElement('div');
      perfectFx.className = 'perfect-hit';
      qs('#fight').appendChild(perfectFx);
      setTimeout(() => perfectFx.remove(), 400);
    }
  }
  
  function showComboEffect(combo){
    const effect = document.createElement('div');
    effect.className = 'combo-effect';
    effect.textContent = `${combo} COMBO!`;
    qs('#fight').appendChild(effect);
    effect.classList.add('show');
    setTimeout(() => effect.remove(), 800);
  }

  // --------- Loop
  function loop(){
    if(!State.running) return;
    const now = AC.currentTime - State.startAt;
    updateNotes(now);
    updateStick();
    drawStickman();
    
    const left = Math.max(0, State.songLength - now);
    qs('#timeLeft').textContent = left.toFixed(1)+'s';
    
    if(now > State.songLength + 1){ 
      finish(false); 
      return; 
    }
    
    State.rafId = requestAnimationFrame(loop);
  }

  function checkClear(){ 
    return State.hp <= 0 || boss.health <= 0; 
  }

  function finish(cleared){
    State.running = false; 
    if(State.rafId) cancelAnimationFrame(State.rafId);
    stopBGM();
    showScene('scene-result');
    
    const bossDefeated = boss.health <= 0;
    qs('#resultTitle').textContent = bossDefeated ? 'ボス撃破！ステージクリア' : 
                                     cleared ? 'ステージ クリア' : 'ステージ失敗';
    
    qs('#rPerfect').textContent = State.tallies.perfect;
    qs('#rGreat').textContent = State.tallies.great;
    qs('#rGood').textContent = State.tallies.good;
    qs('#rMiss').textContent = State.tallies.miss;
    
    const totalHit = State.tallies.perfect+State.tallies.great+State.tallies.good+State.tallies.miss;
    const acc = totalHit ? 
      ((State.tallies.perfect*1 + State.tallies.great*0.7 + State.tallies.good*0.4) / totalHit) : 0;
    
    let rank = 'D';
    if(bossDefeated && acc > 0.95) rank = 'SS';
    else if(bossDefeated && acc > 0.85) rank = 'S';
    else if(acc > 0.75) rank = 'A';
    else if(acc > 0.6) rank = 'B';
    else if(acc > 0.45) rank = 'C';
    
    qs('#rRank').textContent = rank;
  }

  function updateHUD(){ 
    qs('#score').textContent = State.score.toLocaleString(); 
    qs('#combo').textContent = State.combo;
    
    // コンボ表示の色変更
    const comboEl = qs('#combo');
    if(State.combo >= 50){
      comboEl.style.color = '#ffd700';
    } else if(State.combo >= 20){
      comboEl.style.color = '#ff6b35';
    } else if(State.combo >= 10){
      comboEl.style.color = '#4ade80';
    } else {
      comboEl.style.color = '#eaf6ff';
    }
  }

  // --------- Scene & BGM
  function showScene(id){
    qsa('.scene').forEach(s=>s.classList.remove('active'));
    const target = qs('#'+id);
    target.classList.add('active');
    if(id==='scene-play'){ 
      setTimeout(() => {
        fitCanvas(); 
        drawStickman();
      }, 100);
    }
  }

  const bgm = qs("#bgm");
  function playBGM(){
    bgm.volume = 0.3;
    bgm.currentTime = 0;
    // BGMなしでもプレイ可能
    console.log("BGM: ゲーム内蔵のリズム音源を使用");
  }
  
  function stopBGM(){ 
    if(bgm) {
      bgm.pause(); 
      bgm.currentTime = 0; 
    }
  }
  
  function getSelectedDiff(){ 
    return (qs('input[name="diff"]:checked')?.value) || 'normal'; 
  }

  // --------- Game Start
  function newGame(){
    ensureAC();
    State.difficulty = getSelectedDiff();

    const {chart,length} = generateChart(State.difficulty);
    State.chart = chart; 
    State.songLength = length;
    State.hpMax = Math.max(80, Math.floor(chart.length * 2.5)); 
    State.hp = State.hpMax;
    State.score=0; 
    State.combo=0; 
    State.bestCombo=0; 
    State.perfectStreak=0;
    State.tallies={perfect:0,great:0,good:0,miss:0};
    
    // ボスリセット
    boss.health = boss.maxHealth;
    boss.hitTimer = 0;
    boss.shakeTimer = 0;
    
    spawnNotes();
    qs('#hpbar>i').style.width='100%';

    _y = stick.groundY(); 
    stick.vy=0; 
    stick.state='idle'; 
    stick.timer=0;
    stick.actionHistory = [];

    playBGM();
    
    setTimeout(()=>{
      drawStickman();
      State.startAt = AC.currentTime; 
      State.running = true; 
      loop();
    }, 300);
  }

  // --------- Controls
  let lastLane = 0;
  const keyMap = { 'd':0, 'f':1, ' ':2, 'j':2 };
  
  window.addEventListener('keydown', (e)=>{
    const key = e.key.toLowerCase();
    if(keyMap.hasOwnProperty(key)){ 
      e.preventDefault(); 
      const lane = keyMap[key]; 
      lastLane = lane; 
      tryHit(lane); 
    }
  }, {passive:false});
  
  qsa('.ctl').forEach(b=> {
    b.addEventListener('touchstart', (e)=> {
      e.preventDefault();
      const lane = parseInt(b.dataset.lane,10);
      lastLane = lane;
      tryHit(lane);
    }, {passive: false});
    
    b.addEventListener('mousedown', (e)=> {
      e.preventDefault();
      const lane = parseInt(b.dataset.lane,10);
      lastLane = lane;
      tryHit(lane);
    });
  });

  // --------- UI wiring
  qs('#btnStart').addEventListener('click', ()=>{ 
    showScene('scene-play'); 
    setTimeout(newGame, 100);
  });
  
  qs('#btnHow').addEventListener('click', ()=>{ 
    const h=qs('#how'); 
    h.style.display = (h.style.display==='none')?'block':'none'; 
  });
  
  qs('#toEnding').addEventListener('click', ()=> showScene('scene-ending'));
  qs('#retry').addEventListener('click', ()=>{ 
    showScene('scene-play'); 
    setTimeout(newGame, 100);
  });
  qs('#restart').addEventListener('click', ()=>{ showScene('scene-start'); });

  // --------- Audio unlock
  document.body.addEventListener('click', ensureAC, {once:true});
  document.body.addEventListener('touchstart', ensureAC, {once:true, passive:true});

  // initial draw
  setTimeout(drawStickman, 100);
})();
