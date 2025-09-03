// ゲームの基本設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
let gameState = 'playing'; // 'playing', 'gameOver', 'clear'
let score = 0;
let gameHeight = 0;
let cameraY = 0;

// プレイヤー設定
const player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 60,
    width: 30,
    height: 30,
    velX: 0,
    velY: 0,
    speed: 5,
    jumpPower: 15,
    onGround: false,
    color: '#ff4757'
};

// ブロック配列
let blocks = [];
let blockSpawnTimer = 0;
const blockSpawnRate = 60; // フレーム数

// テトリスブロックの形
const tetrisShapes = [
    // I ブロック
    [[1, 1, 1, 1]],
    // O ブロック
    [[1, 1], [1, 1]],
    // T ブロック
    [[0, 1, 0], [1, 1, 1]],
    // S ブロック
    [[0, 1, 1], [1, 1, 0]],
    // Z ブロック
    [[1, 1, 0], [0, 1, 1]],
    // J ブロック
    [[1, 0, 0], [1, 1, 1]],
    // L ブロック
    [[0, 0, 1], [1, 1, 1]]
];

const tetrisColors = [
    '#00f0f0', '#f0f000', '#a000f0', '#00f000', 
    '#f00000', '#0000f0', '#f0a000'
];

// ブロッククラス
class Block {
    constructor(x, y, shape, color) {
        this.x = x;
        this.y = y;
        this.shape = shape;
        this.color = color;
        this.blockSize = 25;
        this.velY = 2; // 落下速度
        this.width = shape[0].length * this.blockSize;
        this.height = shape.length * this.blockSize;
    }
    
    update() {
        this.y += this.velY;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col] === 1) {
                    const x = this.x + col * this.blockSize;
                    const y = this.y + row * this.blockSize - cameraY;
                    
                    ctx.fillRect(x, y, this.blockSize, this.blockSize);
                    ctx.strokeRect(x, y, this.blockSize, this.blockSize);
                }
            }
        }
    }
    
    // 衝突判定
    collidesWith(obj) {
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col] === 1) {
                    const blockX = this.x + col * this.blockSize;
                    const blockY = this.y + row * this.blockSize;
                    
                    if (blockX < obj.x + obj.width &&
                        blockX + this.blockSize > obj.x &&
                        blockY < obj.y + obj.height &&
                        blockY + this.blockSize > obj.y) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // プレイヤーが上に乗れるかチェック
    canStandOn(obj) {
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col] === 1) {
                    const blockX = this.x + col * this.blockSize;
                    const blockY = this.y + row * this.blockSize;
                    
                    if (blockX < obj.x + obj.width &&
                        blockX + this.blockSize > obj.x &&
                        blockY <= obj.y + obj.height &&
                        blockY + this.blockSize > obj.y + obj.height - 5) {
                        return blockY;
                    }
                }
            }
        }
        return false;
    }
}

// ブロック生成
function spawnBlock() {
    const shapeIndex = Math.floor(Math.random() * tetrisShapes.length);
    const shape = tetrisShapes[shapeIndex];
    const color = tetrisColors[shapeIndex];
    const x = Math.random() * (canvas.width - shape[0].length * 25);
    const y = cameraY - 100;
    
    blocks.push(new Block(x, y, shape, color));
}

// プレイヤー更新
function updatePlayer() {
    // 重力
    player.velY += 0.8;
    
    // 横移動
    player.x += player.velX;
    
    // 画面端での制限
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    // 縦移動
    player.y += player.velY;
    player.onGround = false;
    
    // 地面との衝突（最初の足場）
    if (player.y + player.height > canvas.height + cameraY) {
        player.y = canvas.height + cameraY - player.height;
        player.velY = 0;
        player.onGround = true;
    }
    
    // ブロックとの衝突判定
    for (let block of blocks) {
        // プレイヤーがブロックの上に立つ
        const standY = block.canStandOn(player);
        if (standY !== false && player.velY >= 0) {
            player.y = standY - player.height;
            player.velY = 0;
            player.onGround = true;
        }
        // プレイヤーがブロックに潰される
        else if (block.collidesWith(player) && player.velY < 0) {
            gameState = 'gameOver';
        }
    }
    
    // カメラ追従
    const targetCameraY = player.y - canvas.height * 0.7;
    if (targetCameraY < cameraY) {
        cameraY = targetCameraY;
    }
    
    // 高さ計算
    gameHeight = Math.max(0, Math.floor((canvas.height + cameraY - player.y) / 10));
    
    // クリア判定
    if (gameHeight >= 100) {
        gameState = 'clear';
    }
}

// プレイヤー描画
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    
    const drawY = player.y - cameraY;
    ctx.fillRect(player.x, drawY, player.width, player.height);
    ctx.strokeRect(player.x, drawY, player.width, player.height);
    
    // 目を描く
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 6, drawY + 8, 6, 6);
    ctx.fillRect(player.x + 18, drawY + 8, 6, 6);
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x + 8, drawY + 10, 2, 2);
    ctx.fillRect(player.x + 20, drawY + 10, 2, 2);
}

// ゲーム更新
function update() {
    if (gameState !== 'playing') return;
    
    // ブロック生成
    blockSpawnTimer++;
    if (blockSpawnTimer >= blockSpawnRate) {
        spawnBlock();
        blockSpawnTimer = 0;
    }
    
    // ブロック更新
    for (let i = blocks.length - 1; i >= 0; i--) {
        blocks[i].update();
        
        // 画面下に消えたブロックを削除
        if (blocks[i].y > cameraY + canvas.height + 100) {
            blocks.splice(i, 1);
        }
    }
    
    updatePlayer();
    
    // スコア更新
    score = gameHeight * 10;
    
    // UI更新
    document.getElementById('score').textContent = score;
    document.getElementById('height').textContent = gameHeight;
}

// 描画
function draw() {
    // 背景クリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 雲を描く
    drawClouds();
    
    // ブロック描画
    for (let block of blocks) {
        block.draw();
    }
    
    // プレイヤー描画
    drawPlayer();
    
    // ゴールライン
    if (gameHeight >= 90) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 10]);
        const goalY = canvas.height + cameraY - 1000 - cameraY;
        ctx.beginPath();
        ctx.moveTo(0, goalY);
        ctx.lineTo(canvas.width, goalY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// 雲を描く
function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const cloudOffset = cameraY * 0.1;
    
    for (let i = 0; i < 5; i++) {
        const x = (i * 100 + 50) % (canvas.width + 100);
        const y = 100 + i * 80 - cloudOffset;
        
        if (y > -50 && y < canvas.height + 50) {
            // 簡単な雲の形
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
            ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
            ctx.arc(x + 25, y - 15, 15, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ゲームループ
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ゲーム終了表示
function showGameOver() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}

// ゲームクリア表示
function showGameClear() {
    document.getElementById('clearScore').textContent = score;
    document.getElementById('gameClear').style.display = 'block';
}

// ゲームリセット
function resetGame() {
    gameState = 'playing';
    score = 0;
    gameHeight = 0;
    cameraY = 0;
    blocks = [];
    blockSpawnTimer = 0;
    
    player.x = canvas.width / 2 - 15;
    player.y = canvas.height - 60;
    player.velX = 0;
    player.velY = 0;
    player.onGround = false;
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('gameClear').style.display = 'none';
}

// 操作ハンドラ
let keys = {};

// キーボード操作
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'Space' && gameState === 'playing') {
        if (player.onGround) {
            player.velY = -player.jumpPower;
            player.onGround = false;
        }
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// 移動処理
function handleMovement() {
    if (gameState !== 'playing') return;
    
    player.velX = 0;
    
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.velX = -player.speed;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.velX = player.speed;
    }
}

// タッチ操作
document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['ArrowLeft'] = true;
});

document.getElementById('leftBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['ArrowLeft'] = false;
});

document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['ArrowRight'] = true;
});

document.getElementById('rightBtn').addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['ArrowRight'] = false;
});

document.getElementById('jumpBtn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing' && player.onGround) {
        player.velY = -player.jumpPower;
        player.onGround = false;
    }
});

// マウス操作
document.getElementById('leftBtn').addEventListener('mousedown', () => {
    keys['ArrowLeft'] = true;
});

document.getElementById('leftBtn').addEventListener('mouseup', () => {
    keys['ArrowLeft'] = false;
});

document.getElementById('rightBtn').addEventListener('mousedown', () => {
    keys['ArrowRight'] = true;
});

document.getElementById('rightBtn').addEventListener('mouseup', () => {
    keys['ArrowRight'] = false;
});

document.getElementById('jumpBtn').addEventListener('click', () => {
    if (gameState === 'playing' && player.onGround) {
        player.velY = -player.jumpPower;
        player.onGround = false;
    }
});

// リスタートボタン
document.getElementById('restartBtn').addEventListener('click', resetGame);
document.getElementById('restartClearBtn').addEventListener('click', resetGame);

// ゲーム状態監視
setInterval(() => {
    handleMovement();
    
    if (gameState === 'gameOver') {
        showGameOver();
    } else if (gameState === 'clear') {
        showGameClear();
    }
}, 16);

// ゲーム開始
gameLoop();