let COLS = 10;
let ROWS = 20;
const BLOCK_SIZE = 30;
let speedMultiplier = 1.0;

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
let trainingMode = false;
let baseDropSpeed = 1000;
let dropSpeed = 1000;
let lastDropTime = 0;
let lastMoveTime = 0;
const MOVE_DELAY = 100;
let nextPiece = null;
let aiTarget = null;

// Training mode statistics
let trainingStats = {
    gamesPlayed: 0,
    bestScore: 0,
    totalScore: 0,
    totalLines: 0,
    scores: []
};

// AI learning weights (adaptive based on performance)
let aiWeights = {
    lineClear: 8000,
    maxHeight: 80,
    holes: 700,
    bumpiness: 150,
    wellDepth: 50,
    transitions: 30,
    rowFill: 20,
    centerDist: 10,
    nextPieceLookahead: 0.4
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const demoBtn = document.getElementById('demoBtn');
const trainingBtn = document.getElementById('trainingBtn');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const speedInput = document.getElementById('speedInput');
const speedValue = document.getElementById('speedValue');
const trainingStatsEl = document.getElementById('trainingStats');
const trainingGamesEl = document.getElementById('trainingGames');
const trainingBestEl = document.getElementById('trainingBest');
const trainingAvgEl = document.getElementById('trainingAvg');
const trainingLinesEl = document.getElementById('trainingLines');

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
stopBtn.addEventListener('click', stopGame);
demoBtn.addEventListener('click', startDemo);
trainingBtn.addEventListener('click', startTraining);
widthInput.addEventListener('change', updateDimensions);
heightInput.addEventListener('change', updateDimensions);
speedInput.addEventListener('input', updateSpeed);
document.addEventListener('keydown', handleKeyPress);

function updateDimensions() {
    if (!gameRunning) {
        const newCols = parseInt(widthInput.value) || 10;
        const newRows = parseInt(heightInput.value) || 20;
        
        if (newCols >= 6 && newCols <= 20 && newRows >= 10 && newRows <= 40) {
            COLS = newCols;
            ROWS = newRows;
            resizeCanvas();
        }
    }
}

function updateSpeed() {
    speedMultiplier = parseFloat(speedInput.value);
    speedValue.textContent = speedMultiplier.toFixed(2) + 'x';
    
    if (gameRunning) {
        dropSpeed = Math.max(50, baseDropSpeed / speedMultiplier);
    }
}

function resizeCanvas() {
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
    if (gameRunning) {
        draw();
    }
}

function stopGame() {
    const wasTraining = trainingMode;
    gameRunning = false;
    gamePaused = false;
    trainingMode = false;
    demoMode = false;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    demoBtn.disabled = false;
    trainingBtn.disabled = false;
    widthInput.disabled = false;
    heightInput.disabled = false;
    speedInput.disabled = false;
    pauseBtn.textContent = 'Пауза';
    
    // Reset board
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    currentPiece = null;
    score = 0;
    lines = 0;
    level = 1;
    
    if (wasTraining) {
        trainingStatsEl.style.display = 'none';
    }
    
    updateUI();
    draw();
}

function startGame() {
    // Update dimensions from inputs if changed
    const newCols = parseInt(widthInput.value) || 10;
    const newRows = parseInt(heightInput.value) || 20;
    if (newCols >= 6 && newCols <= 20) COLS = newCols;
    if (newRows >= 10 && newRows <= 40) ROWS = newRows;
    
    resizeCanvas();
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    baseDropSpeed = 1000;
    dropSpeed = baseDropSpeed / speedMultiplier;
    gameRunning = true;
    gamePaused = false;
    demoMode = false;
    nextPiece = null;
    aiTarget = null;
    lastDropTime = Date.now();
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    demoBtn.disabled = true;
    trainingBtn.disabled = true;
    widthInput.disabled = true;
    heightInput.disabled = true;
    speedInput.disabled = true;
    
    updateUI();
    spawnNewPiece();
    gameLoop();
}

function startDemo() {
    // Update dimensions from inputs if changed
    const newCols = parseInt(widthInput.value) || 10;
    const newRows = parseInt(heightInput.value) || 20;
    if (newCols >= 6 && newCols <= 20) COLS = newCols;
    if (newRows >= 10 && newRows <= 40) ROWS = newRows;
    
    resizeCanvas();
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    baseDropSpeed = 800;
    dropSpeed = baseDropSpeed / speedMultiplier;
    gameRunning = true;
    gamePaused = false;
    demoMode = true;
    trainingMode = false;
    nextPiece = null;
    aiTarget = null;
    lastDropTime = Date.now();
    lastMoveTime = Date.now();
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    demoBtn.disabled = true;
    trainingBtn.disabled = true;
    widthInput.disabled = true;
    heightInput.disabled = true;
    speedInput.disabled = true;
    
    updateUI();
    spawnNewPiece();
    gameLoop();
}

function startTraining() {
    // Initialize training stats
    trainingStats = {
        gamesPlayed: 0,
        bestScore: 0,
        totalScore: 0,
        totalLines: 0,
        scores: []
    };
    
    // Show training stats
    trainingStatsEl.style.display = 'flex';
    updateTrainingStats();
    
    // Start first game
    startTrainingGame();
}

function startTrainingGame() {
    // Update dimensions from inputs if changed
    const newCols = parseInt(widthInput.value) || 10;
    const newRows = parseInt(heightInput.value) || 20;
    if (newCols >= 6 && newCols <= 20) COLS = newCols;
    if (newRows >= 10 && newRows <= 40) ROWS = newRows;
    
    resizeCanvas();
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    baseDropSpeed = 800;
    dropSpeed = baseDropSpeed / speedMultiplier;
    gameRunning = true;
    gamePaused = false;
    demoMode = true;
    trainingMode = true;
    nextPiece = null;
    aiTarget = null;
    lastDropTime = Date.now();
    lastMoveTime = Date.now();
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    demoBtn.disabled = true;
    trainingBtn.disabled = true;
    widthInput.disabled = true;
    heightInput.disabled = true;
    speedInput.disabled = true;
    
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
        baseDropSpeed = Math.max(100, 1000 - (level - 1) * 50);
        dropSpeed = Math.max(50, baseDropSpeed / speedMultiplier);
    }
}

function endGame() {
    const finalScore = score;
    const finalLines = lines;
    
    if (trainingMode) {
        // Stop current game
        gameRunning = false;
        
        // Record training statistics
        trainingStats.gamesPlayed++;
        trainingStats.totalScore += finalScore;
        trainingStats.totalLines += finalLines;
        trainingStats.scores.push(finalScore);
        
        if (finalScore > trainingStats.bestScore) {
            trainingStats.bestScore = finalScore;
        }
        
        // Keep only last 100 scores for rolling average
        if (trainingStats.scores.length > 100) {
            trainingStats.scores.shift();
        }
        
        // Learn from performance
        learnFromGame(finalScore, finalLines);
        
        // Update training stats display
        updateTrainingStats();
        
        // Auto-restart after a short delay (only if still in training mode and not paused)
        setTimeout(() => {
            if (trainingMode && !gamePaused) {
                startTrainingGame();
            }
        }, 500);
    } else {
        gameRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        demoBtn.disabled = false;
        trainingBtn.disabled = false;
        widthInput.disabled = false;
        heightInput.disabled = false;
        speedInput.disabled = false;
        pauseBtn.textContent = 'Пауза';
        alert(`Игра окончена! Очки: ${finalScore}`);
    }
}

function updateTrainingStats() {
    trainingGamesEl.textContent = trainingStats.gamesPlayed;
    trainingBestEl.textContent = trainingStats.bestScore;
    
    const avgScore = trainingStats.gamesPlayed > 0 
        ? Math.floor(trainingStats.totalScore / trainingStats.gamesPlayed)
        : 0;
    trainingAvgEl.textContent = avgScore;
    trainingLinesEl.textContent = trainingStats.totalLines;
}

function learnFromGame(finalScore, finalLines) {
    // Simple learning mechanism: adjust weights based on performance
    const recentAvg = trainingStats.scores.length > 0
        ? trainingStats.scores.reduce((a, b) => a + b, 0) / trainingStats.scores.length
        : finalScore;
    const previousAvg = trainingStats.gamesPlayed > 1
        ? (trainingStats.totalScore - finalScore) / (trainingStats.gamesPlayed - 1)
        : finalScore;
    
    // If performance improved, keep current weights, otherwise adjust
    const improvement = recentAvg - previousAvg;
    const learningRate = 0.05;
    
    if (improvement < 0 && trainingStats.gamesPlayed > 10) {
        // Performance declined, adjust weights slightly
        // Increase emphasis on line clears and reducing holes
        aiWeights.lineClear = Math.min(10000, aiWeights.lineClear * (1 + learningRate));
        aiWeights.holes = Math.min(1000, aiWeights.holes * (1 + learningRate * 0.5));
        
        // Decrease emphasis on less critical factors
        aiWeights.rowFill = Math.max(10, aiWeights.rowFill * (1 - learningRate * 0.3));
        aiWeights.centerDist = Math.max(5, aiWeights.centerDist * (1 - learningRate * 0.5));
    } else if (improvement > 0 && trainingStats.gamesPlayed > 5) {
        // Performance improved, fine-tune weights
        aiWeights.nextPieceLookahead = Math.min(0.6, aiWeights.nextPieceLookahead * (1 + learningRate * 0.2));
    }
    
    // Ensure weights stay within reasonable bounds
    aiWeights.lineClear = Math.max(5000, Math.min(12000, aiWeights.lineClear));
    aiWeights.holes = Math.max(500, Math.min(1000, aiWeights.holes));
    aiWeights.bumpiness = Math.max(100, Math.min(200, aiWeights.bumpiness));
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
    if (!aiTarget) {
        aiTarget = findBestMove();
        if (!aiTarget) return;
    }
    
    // Handle rotation
    if (aiTarget.rotation > 0) {
        const rotated = rotateMatrix(currentPiece.template);
        if (canMove(rotated, currentX, currentY)) {
            currentPiece.template = rotated;
            aiTarget.rotation--;
        }
        return;
    }
    
    // Handle horizontal movement
    if (aiTarget.x < currentX && canMove(currentPiece.template, currentX - 1, currentY)) {
        currentX--;
        return;
    }
    if (aiTarget.x > currentX && canMove(currentPiece.template, currentX + 1, currentY)) {
        currentX++;
        return;
    }
    
    // If in position, soft drop
    if (canMove(currentPiece.template, currentX, currentY + 1)) {
        currentY++;
    } else {
        // Reset target when piece is placed
        aiTarget = null;
    }
}

function findBestMove() {
    if (!currentPiece) return null;
    
    let best = { x: currentX, rotation: 0, score: -Infinity };
    let testPiece = JSON.parse(JSON.stringify(currentPiece.template));
    
    // Try all rotations (up to 4 unique rotations)
    const uniqueRotations = new Set();
    for (let rotation = 0; rotation < 4; rotation++) {
        const rotationKey = JSON.stringify(testPiece);
        if (uniqueRotations.has(rotationKey)) break;
        uniqueRotations.add(rotationKey);
        
        // Try all possible x positions
        for (let x = -2; x < COLS + 2; x++) {
            if (!canMove(testPiece, x, currentY)) continue;
            
            // Drop piece as far as possible
            let y = currentY;
            while (canMove(testPiece, x, y + 1)) {
                y++;
            }
            
            // Evaluate this position
            const testBoard = board.map(r => [...r]);
            placeTemplate(testBoard, testPiece, x, y);
            
            let score = evaluateBoardImproved(testBoard);
            
            // Look ahead: evaluate next piece placement - uses adaptive weight
            if (nextPiece) {
                score += evaluateNextPiecePlacement(testBoard, nextPiece) * aiWeights.nextPieceLookahead;
            }
            
            // Prefer positions closer to center - uses adaptive weight
            const centerDist = Math.abs(x - Math.floor(COLS / 2));
            score -= centerDist * aiWeights.centerDist;
            
            if (score > best.score) {
                best = { x, rotation, score };
            }
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

function evaluateBoardImproved(tb) {
    let score = 0;
    
    // 1. Reward line clears (highest priority) - uses adaptive weight
    let linesToClear = 0;
    for (let r = 0; r < ROWS; r++) {
        if (tb[r].every(cell => cell !== 0)) {
            linesToClear++;
        }
    }
    score += linesToClear * aiWeights.lineClear;
    
    // 2. Calculate column heights
    const heights = getColumnHeights(tb);
    const maxHeight = Math.max(...heights);
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
    
    // 3. Minimize max height (avoid stack overflow) - uses adaptive weight
    score -= maxHeight * aiWeights.maxHeight;
    
    // 4. Penalize holes heavily - uses adaptive weight
    const holes = countHoles(tb, heights);
    score -= holes * aiWeights.holes;
    
    // 5. Penalize bumpiness (prefer flat surfaces) - uses adaptive weight
    const bumpiness = calculateBumpiness(heights);
    score -= bumpiness * aiWeights.bumpiness;
    
    // 6. Reward well depth (deep wells are good for I-pieces) - uses adaptive weight
    const wellDepth = calculateWellDepth(tb, heights);
    score += wellDepth * aiWeights.wellDepth;
    
    // 7. Penalize column transitions (prefer smooth transitions) - uses adaptive weight
    const transitions = countColumnTransitions(tb);
    score -= transitions * aiWeights.transitions;
    
    // 8. Reward filling complete rows (even if not full) - uses adaptive weight
    const rowFill = calculateRowFillPercentage(tb);
    score += rowFill * aiWeights.rowFill;
    
    return score;
}

function calculateWellDepth(tb, heights) {
    let wellDepth = 0;
    for (let col = 0; col < COLS - 1; col++) {
        const diff = heights[col] - heights[col + 1];
        if (Math.abs(diff) >= 2) {
            wellDepth += Math.abs(diff) - 1;
        }
    }
    return wellDepth;
}

function countColumnTransitions(tb) {
    let transitions = 0;
    for (let col = 0; col < COLS; col++) {
        let last = false;
        for (let row = 0; row < ROWS; row++) {
            const current = tb[row][col] !== 0;
            if (last !== current && row > 0) {
                transitions++;
            }
            last = current;
        }
    }
    return transitions;
}

function calculateRowFillPercentage(tb) {
    let totalFill = 0;
    for (let row = 0; row < ROWS; row++) {
        const filled = tb[row].filter(cell => cell !== 0).length;
        totalFill += filled / COLS;
    }
    return totalFill;
}

function evaluateNextPiecePlacement(testBoard, nextTemplate) {
    let bestScore = -Infinity;
    let testTemplate = JSON.parse(JSON.stringify(nextTemplate));
    
    const uniqueRotations = new Set();
    for (let rot = 0; rot < 4; rot++) {
        const rotationKey = JSON.stringify(testTemplate);
        if (uniqueRotations.has(rotationKey)) break;
        uniqueRotations.add(rotationKey);
        
        for (let x = -2; x < COLS + 2; x++) {
            let y = 0;
            if (!canMove(testTemplate, x, y)) continue;
            
            while (canMove(testTemplate, x, y + 1)) {
                y++;
            }
            
            const t2 = testBoard.map(r => [...r]);
            placeTemplate(t2, testTemplate, x, y);
            const score = evaluateBoardImproved(t2);
            bestScore = Math.max(bestScore, score);
        }
        
        testTemplate = rotateMatrix(testTemplate);
    }
    
    return bestScore;
}

// Initialize canvas size on load
window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    updateSpeed(); // Initialize speed display
});

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