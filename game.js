const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = [
    '#00f0f1',
    '#0000ff',
    '#f0a000',
    '#00f000',
    '#ff0000',
    '#a000f0',
    '#f0f000'
];

const PIECES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 0], [0, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[0, 1, 0], [1, 1, 1]]
];

let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let currentPiece = null;
let currentX = 0;
let currentY = 0;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let demoMode = false;
let dropSpeed = 1000;
let lastDropTime = 0;
let lastMoveTime = 0;
const MOVE_DELAY = 100;
let nextPiece = null;
let aiTarget = null;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const demoBtn = document.getElementById('demoBtn');

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
demoBtn.addEventListener('click', startDemo);
document.addEventListener('keydown', handleKeyPress);

function startGame() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropSpeed = 1000;
    gameRunning = true;
    gamePaused = false;
    demoMode = false;
    nextPiece = null;
    aiTarget = null;
    lastDropTime = Date.now();
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    demoBtn.disabled = true;
    
    updateUI();
    spawnNewPiece();
    gameLoop();
}

function startDemo() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropSpeed = 800;
    gameRunning = true;
    gamePaused = false;
    demoMode = true;
    nextPiece = null;
    aiTarget = null;
    lastDropTime = Date.now();
    lastMoveTime = Date.now();
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    demoBtn.disabled = true;
    
    updateUI();
    spawnNewPiece();
    gameLoop();
}

function togglePause() {
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'Продолжить' : 'Пауза';
}

function spawnNewPiece() {
    const pieceTemplate = nextPiece || PIECES[Math.floor(Math.random() * PIECES.length)];
    currentPiece = {
        template: pieceTemplate,
        colorIndex: Math.floor(Math.random() * COLORS.length)
    };
    nextPiece = PIECES[Math.floor(Math.random() * PIECES.length)];
    currentX = Math.floor(COLS / 2 - currentPiece.template[0].length / 2);
    currentY = 0;
    
    if (!canMove(currentPiece.template, currentX, currentY)) {
        endGame();
    }
    
    drawNextPiece();
    aiTarget = demoMode ? findBestMove() : null;
}

function handleKeyPress(e) {
    if (!gameRunning || gamePaused) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            if (canMove(currentPiece.template, currentX - 1, currentY)) {
                currentX--;
            }
            break;
        case 'ArrowRight':
            if (canMove(currentPiece.template, currentX + 1, currentY)) {
                currentX++;
            }
            break;
        case 'ArrowDown':
            if (canMove(currentPiece.template, currentX, currentY + 1)) {
                currentY++;
                score += 1;
            }
            break;
        case ' ':
            e.preventDefault();
            rotatePiece();
            break;
    }
}

function rotatePiece() {
    const rotated = rotateMatrix(currentPiece.template);
    if (canMove(rotated, currentX, currentY)) {
        currentPiece.template = rotated;
    }
}

function rotateMatrix(matrix) {
    const n = matrix.length;
    const m = matrix[0].length;
    const rotated = Array(m).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            rotated[j][n - 1 - i] = matrix[i][j];
        }
    }
    
    return rotated;
}

function canMove(piece, x, y) {
    for (let row = 0; row < piece.length; row++) {
        for (let col = 0; col < piece[row].length; col++) {
            if (piece[row][col]) {
                const newX = x + col;
                const newY = y + row;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function placePiece() {
    for (let row = 0; row < currentPiece.template.length; row++) {
        for (let col = 0; col < currentPiece.template[row].length; col++) {
            if (currentPiece.template[row][col]) {
                const x = currentX + col;
                const y = currentY + row;
                
                if (y >= 0) {
                    board[y][x] = currentPiece.colorIndex + 1;
                }
            }
        }
    }
    
    clearLines();
    spawnNewPiece();
}

function clearLines() {
    let clearedLines = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(Array(COLS).fill(0));
            clearedLines++;
            row++;
        }
    }
    
    if (clearedLines > 0) {
        lines += clearedLines;
        score += clearedLines * clearedLines * 100;
        level = Math.floor(lines / 10) + 1;
        dropSpeed = Math.max(100, 1000 - (level - 1) * 50);
    }
}

function endGame() {
    gameRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    alert(`Игра окончена! Очки: ${score}`);
}

function gameLoop() {
    if (!gameRunning) return;
    
    if (!gamePaused) {
        const now = Date.now();
        
        if (demoMode && now - lastMoveTime > MOVE_DELAY) {
            makeDemoMove();
            lastMoveTime = now;
        }
        
        if (now - lastDropTime > dropSpeed) {
            if (canMove(currentPiece.template, currentX, currentY + 1)) {
                currentY++;
            } else {
                placePiece();
            }
            lastDropTime = now;
        }
    }
    
    updateUI();
    draw();
    requestAnimationFrame(gameLoop);
}

function makeDemoMove() {
    if (!aiTarget) aiTarget = findBestMove();
    if (!aiTarget) return;
    if (aiTarget.rotation > 0) { rotatePiece(); aiTarget.rotation--; return; }
    if (aiTarget.x < currentX && canMove(currentPiece.template, currentX - 1, currentY)) { currentX--; return; }
    if (aiTarget.x > currentX && canMove(currentPiece.template, currentX + 1, currentY)) { currentX++; return; }
    if (canMove(currentPiece.template, currentX, currentY + 1)) currentY++; // soft drop
}

function findBestMove() {
    let best = { x: currentX, rotation: 0, score: -Infinity };
    let testPiece = JSON.parse(JSON.stringify(currentPiece.template));
    for (let rotation = 0; rotation < 4; rotation++) {
        for (let x = -2; x < COLS + 2; x++) {
            if (!canMove(testPiece, x, currentY)) continue;
            let y = currentY;
            while (canMove(testPiece, x, y + 1)) y++;
            const tb = board.map(r => [...r]);
            placeTemplate(tb, testPiece, x, y);
            let score = evaluateBoard(tb);
            if (nextPiece) score += bestNextOnBoard(tb, nextPiece) * 0.5;
            if (score > best.score) best = { x, rotation, score };
        }
        testPiece = rotateMatrix(testPiece);
    }
    return best;
}

function placeTemplate(tb, piece, x, y) {
    for (let r = 0; r < piece.length; r++)
        for (let c = 0; c < piece[r].length; c++)
            if (piece[r][c] && y + r >= 0 && y + r < ROWS && x + c >= 0 && x + c < COLS)
                tb[y + r][x + c] = 1;
}

function evaluateBoard(tb) {
    let score = 0, linesToClear = 0;
    for (let r = 0; r < ROWS; r++) if (tb[r].every(cell => cell !== 0)) linesToClear++;
    score += linesToClear * 5000;
    const heights = getColumnHeights(tb);
    score -= Math.max(...heights) * 50;
    score -= countHoles(tb, heights) * 500;
    score -= calculateBumpiness(heights) * 100;
    return score;
}

function bestNextOnBoard(tb, nextTpl) {
    let best = -Infinity;
    let tpl = JSON.parse(JSON.stringify(nextTpl));
    for (let rot = 0; rot < 4; rot++) {
        for (let x = -2; x < COLS + 2; x++) {
            let y = 0; if (!canMove(tpl, x, y)) continue;
            while (canMove(tpl, x, y + 1)) y++;
            const t2 = tb.map(r => [...r]);
            placeTemplate(t2, tpl, x, y);
            best = Math.max(best, evaluateBoard(t2));
        }
        tpl = rotateMatrix(tpl);
    }
    return best;
}

function evaluateMove(piece, x, y) {
    // Create a copy of the board to simulate piece placement
    const testBoard = board.map(row => [...row]);
    
    // Place piece on test board
    for (let row = 0; row < piece.length; row++) {
        for (let col = 0; col < piece[row].length; col++) {
            if (piece[row][col]) {
                const boardY = y + row;
                const boardX = x + col;
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                    testBoard[boardY][boardX] = 1;
                }
            }
        }
    }
    
    let score = 0;
    
    // 1. Reward line clears
    let linesToClear = 0;
    for (let row = 0; row < ROWS; row++) {
        if (testBoard[row].every(cell => cell !== 0)) {
            linesToClear++;
        }
    }
    score += linesToClear * 5000;
    
    // 2. Minimize height (keep stack low)
    const heights = getColumnHeights(testBoard);
    const maxHeight = Math.max(...heights);
    score -= maxHeight * 50;
    
    // 3. Minimize holes (empty spaces with blocks above)
    const holes = countHoles(testBoard, heights);
    score -= holes * 500;
    
    // 4. Reward smoothness (flat surfaces)
    const bumpiness = calculateBumpiness(heights);
    score -= bumpiness * 100;
    
    // 5. Prefer filling existing holes
    const fillsHoles = evaluateHoleFilling(piece, x, y, testBoard);
    score += fillsHoles * 300;
    
    return score;
}

function getColumnHeights(testBoard) {
    const heights = Array(COLS).fill(0);
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            if (testBoard[row][col] !== 0) {
                heights[col] = ROWS - row;
                break;
            }
        }
    }
    return heights;
}

function countHoles(testBoard, heights) {
    let holes = 0;
    for (let col = 0; col < COLS; col++) {
        let blockFound = false;
        for (let row = 0; row < ROWS; row++) {
            if (testBoard[row][col] !== 0) {
                blockFound = true;
            } else if (blockFound && testBoard[row][col] === 0) {
                holes++;
            }
        }
    }
    return holes;
}

function calculateBumpiness(heights) {
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
        bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    return bumpiness;
}

function evaluateHoleFilling(piece, x, y, testBoard) {
    let fills = 0;
    for (let row = 0; row < piece.length; row++) {
        for (let col = 0; col < piece[row].length; col++) {
            if (piece[row][col]) {
                const boardY = y + row;
                const boardX = x + col;
                // Check if there are holes below
                if (boardY < ROWS - 1) {
                    for (let checkRow = boardY + 1; checkRow < ROWS; checkRow++) {
                        if (testBoard[checkRow][boardX] === 0) {
                            fills++;
                            break;
                        }
                    }
                }
            }
        }
    }
    return fills;
}

function updateUI() {
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level;
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                ctx.fillStyle = COLORS[board[row][col] - 1];
                ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        }
    }
    
    // Draw current piece
    if (currentPiece) {
        ctx.fillStyle = COLORS[currentPiece.colorIndex];
        for (let row = 0; row < currentPiece.template.length; row++) {
            for (let col = 0; col < currentPiece.template[row].length; col++) {
                if (currentPiece.template[row][col]) {
                    const x = currentX + col;
                    const y = currentY + row;
                    if (y >= 0) {
                        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    }
                }
            }
        }
    }
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
}

function drawNextPiece() {
    nextCtx.fillStyle = '#fafafa';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        const blockSize = 20;
        const offsetX = (nextCanvas.width - nextPiece[0].length * blockSize) / 2;
        const offsetY = (nextCanvas.height - nextPiece.length * blockSize) / 2;
        nextCtx.fillStyle = '#999';
        for (let row = 0; row < nextPiece.length; row++)
            for (let col = 0; col < nextPiece[row].length; col++)
                if (nextPiece[row][col])
                    nextCtx.fillRect(offsetX + col * blockSize, offsetY + row * blockSize, blockSize - 1, blockSize - 1);
    }
}