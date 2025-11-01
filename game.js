// ============================================
// ОСНОВНЫЕ КОНСТАНТЫ И ПЕРЕМЕННЫЕ ИГРЫ
// ============================================

// Размеры игрового поля
// COLS - количество столбцов (ширина поля)
// ROWS - количество строк (высота поля)
// BLOCK_SIZE - размер одного блока в пикселях
let COLS = 10;
let ROWS = 20;
const BLOCK_SIZE = 30;

// Множитель скорости падения фигур (1.0 = нормальная скорость)
let speedMultiplier = 1.0;

// Массив цветов для фигур (в формате HEX: #RRGGBB)
// Каждая фигура получает случайный цвет из этого массива
const COLORS = [
    '#00f0f1', // Голубой
    '#0000ff', // Синий
    '#f0a000', // Оранжевый
    '#00f000', // Зелёный
    '#ff0000', // Красный
    '#a000f0', // Фиолетовый
    '#f0f000'  // Жёлтый
];

// Шаблоны всех фигур Тетриса
// Каждая фигура представлена двумерным массивом (матрицей)
// 1 означает наличие блока, 0 - пустое место
// Порядок: I, O, S, Z, L, J, T фигуры
const PIECES = [
    [[1, 1, 1, 1]],                    // I-фигура (палка)
    [[1, 1], [1, 1]],                   // O-фигура (квадрат)
    [[0, 1, 1], [1, 1, 0]],             // S-фигура (зигзаг)
    [[1, 1, 0], [0, 1, 1]],             // Z-фигура (обратный зигзаг)
    [[1, 0, 0], [1, 1, 1]],             // L-фигура (буква Г)
    [[0, 0, 1], [1, 1, 1]],             // J-фигура (обратная Г)
    [[0, 1, 0], [1, 1, 1]]              // T-фигура (буква Т)
];

// ============================================
// СОСТОЯНИЕ ИГРЫ
// ============================================

// Игровое поле - двумерный массив ROWS x COLS
// 0 = пустая клетка, число > 0 = цвет фигуры (индекс + 1)
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));

// Текущая падающая фигура (объект с шаблоном и цветом)
let currentPiece = null;

// Позиция текущей фигуры на поле (координаты левого верхнего угла)
let currentX = 0;  // Столбец
let currentY = 0;  // Строка

// Статистика игры
let score = 0;      // Очки игрока
let lines = 0;      // Количество очищенных линий
let level = 1;      // Текущий уровень (увеличивается каждые 10 линий)

// Флаги состояния игры
let gameRunning = false;   // Игра запущена?
let gamePaused = false;    // Игра на паузе?
let demoMode = false;      // Режим демонстрации (бот играет)?
let trainingMode = false;  // Режим тренировки (автоматическое обучение)?

// Скорость падения фигур (в миллисекундах)
// baseDropSpeed - базовая скорость, зависит от уровня
// dropSpeed - текущая скорость с учётом множителя
let baseDropSpeed = 1000;  // 1000 мс = 1 секунда
let dropSpeed = 1000;

// Время последнего падения фигуры (для контроля скорости)
let lastDropTime = 0;

// Время последнего движения в демо-режиме
let lastMoveTime = 0;
const MOVE_DELAY = 100;  // Задержка между движениями бота (мс)

// Следующая фигура (для предпросмотра)
let nextPiece = null;

// Целевая позиция для ИИ в демо-режиме (куда бот хочет поставить фигуру)
let aiTarget = null;

// ============================================
// СТАТИСТИКА ТРЕНИРОВКИ
// ============================================

// Объект для хранения статистики во время тренировки ИИ
let trainingStats = {
    gamesPlayed: 0,    // Количество сыгранных игр
    bestScore: 0,      // Лучший результат
    totalScore: 0,     // Сумма всех очков (для расчёта среднего)
    totalLines: 0,     // Общее количество очищенных линий
    scores: []         // Массив последних 100 результатов
};

// ============================================
// ВЕСА ДЛЯ ОЦЕНКИ ПОЗИЦИЙ ИИ
// ============================================

// Эти числа определяют, насколько важны разные факторы при выборе хода
// Чем больше число, тем важнее фактор
// ИИ корректирует эти веса в процессе обучения
let aiWeights = {
    lineClear: 8000,        // Очистка линий (самый важный фактор!)
    maxHeight: 80,          // Максимальная высота стопки (меньше = лучше)
    holes: 700,             // Дыры в стопке (очень плохо)
    bumpiness: 150,         // Неровность поверхности (гладкая поверхность лучше)
    wellDepth: 50,          // Глубина "колодцев" (хорошо для I-фигур)
    transitions: 30,        // Переходы между заполненными/пустыми клетками
    rowFill: 20,            // Заполненность рядов (даже частично заполненные)
    centerDist: 10,         // Расстояние от центра (ближе к центру лучше)
    nextPieceLookahead: 0.4 // Насколько учитывать следующую фигуру (0.4 = 40%)
};

// ============================================
// ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ ИЗ HTML (DOM)
// ============================================

// Canvas - элемент HTML5 для рисования графики
// gameCanvas - основное игровое поле
// nextCanvas - маленькое поле для показа следующей фигуры
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');  // Контекст для рисования (2D)

const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// Получаем ссылки на HTML-элементы для отображения статистики
const scoreEl = document.getElementById('score');           // Элемент для очков
const linesEl = document.getElementById('lines');           // Элемент для линий
const levelEl = document.getElementById('level');           // Элемент для уровня

// Получаем ссылки на кнопки управления
const startBtn = document.getElementById('startBtn');      // Кнопка "Начать"
const pauseBtn = document.getElementById('pauseBtn');       // Кнопка "Пауза"
const stopBtn = document.getElementById('stopBtn');        // Кнопка "Остановить"
const demoBtn = document.getElementById('demoBtn');         // Кнопка "Демо"
const trainingBtn = document.getElementById('trainingBtn');  // Кнопка "Тренировка"

// Получаем ссылки на поля ввода настроек
const widthInput = document.getElementById('widthInput');     // Поле ввода ширины
const heightInput = document.getElementById('heightInput');  // Поле ввода высоты
const speedInput = document.getElementById('speedInput');    // Слайдер скорости
const speedValue = document.getElementById('speedValue');    // Отображение значения скорости

// Получаем ссылки на элементы статистики тренировки
const trainingStatsEl = document.getElementById('trainingStats');    // Контейнер статистики
const trainingGamesEl = document.getElementById('trainingGames');    // Количество игр
const trainingBestEl = document.getElementById('trainingBest');      // Лучший результат
const trainingAvgEl = document.getElementById('trainingAvg');         // Средний результат
const trainingLinesEl = document.getElementById('trainingLines');    // Всего линий

// ============================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ============================================

// Привязываем функции к событиям (клики на кнопки, нажатия клавиш)
// addEventListener('событие', функция) - слушатель событий
startBtn.addEventListener('click', startGame);              // При клике на "Начать" → запуск игры
pauseBtn.addEventListener('click', togglePause);             // При клике на "Пауза" → пауза/продолжение
stopBtn.addEventListener('click', stopGame);                 // При клике на "Остановить" → остановка
demoBtn.addEventListener('click', startDemo);               // При клике на "Демо" → демо-режим
trainingBtn.addEventListener('click', startTraining);       // При клике на "Тренировка" → режим тренировки

// Обработчики изменения настроек
widthInput.addEventListener('change', updateDimensions);    // При изменении ширины → обновить размеры
heightInput.addEventListener('change', updateDimensions);  // При изменении высоты → обновить размеры
speedInput.addEventListener('input', updateSpeed);          // При изменении скорости → обновить скорость

// Обработчик нажатий клавиш (для управления фигурой)
document.addEventListener('keydown', handleKeyPress);        // При нажатии клавиши → обработка управления

/**
 * Обновляет размеры игрового поля на основе введённых пользователем значений
 * Можно изменить размеры только когда игра не запущена
 */
function updateDimensions() {
    // Проверяем, что игра не запущена (размеры нельзя менять во время игры)
    if (!gameRunning) {
        // Получаем новые значения из полей ввода
        // parseInt() - преобразует строку в число
        // || 10 - если значение невалидно, используем 10 по умолчанию
        const newCols = parseInt(widthInput.value) || 10;
        const newRows = parseInt(heightInput.value) || 20;
        
        // Проверяем, что значения в допустимых пределах
        if (newCols >= 6 && newCols <= 20 && newRows >= 10 && newRows <= 40) {
            COLS = newCols;  // Обновляем ширину
            ROWS = newRows;  // Обновляем высоту
            resizeCanvas(); // Перерисовываем canvas под новый размер
        }
    }
}

/**
 * Обновляет скорость игры на основе значения слайдера
 * speedMultiplier: 0.25 = медленно, 1.0 = нормально, 3.0 = очень быстро
 */
function updateSpeed() {
    // Получаем значение из слайдера (может быть дробным, поэтому parseFloat)
    speedMultiplier = parseFloat(speedInput.value);
    
    // Обновляем отображение скорости (toFixed(2) - округляем до 2 знаков)
    speedValue.textContent = speedMultiplier.toFixed(2) + 'x';
    
    // Если игра запущена, сразу применяем новую скорость
    if (gameRunning) {
        // Вычисляем новую скорость падения
        // Чем больше множитель, тем меньше время падения (быстрее)
        // Math.max(50, ...) - минимальная скорость 50 мс (очень быстро)
        dropSpeed = Math.max(50, baseDropSpeed / speedMultiplier);
    }
}

/**
 * Изменяет размер canvas (игрового поля) в зависимости от размеров поля
 * Canvas должен быть точно такого размера, чтобы вместить все клетки
 */
function resizeCanvas() {
    // Устанавливаем ширину = количество столбцов * размер блока
    canvas.width = COLS * BLOCK_SIZE;
    
    // Устанавливаем высоту = количество строк * размер блока
    canvas.height = ROWS * BLOCK_SIZE;
    
    // Если игра запущена, перерисовываем поле
    if (gameRunning) {
        draw();
    }
}

/**
 * Останавливает игру и сбрасывает все параметры
 * Возвращает игру в начальное состояние
 */
function stopGame() {
    // Запоминаем, был ли включён режим тренировки (чтобы скрыть статистику)
    const wasTraining = trainingMode;
    
    // Сбрасываем все флаги состояния
    gameRunning = false;   // Игра остановлена
    gamePaused = false;    // Снимаем паузу
    trainingMode = false;  // Выключаем режим тренировки
    demoMode = false;      // Выключаем демо-режим
    
    // Включаем/выключаем кнопки в зависимости от состояния
    startBtn.disabled = false;    // Можно начать новую игру
    pauseBtn.disabled = true;     // Пауза недоступна (игра остановлена)
    stopBtn.disabled = true;       // Остановка недоступна (уже остановлено)
    demoBtn.disabled = false;      // Можно запустить демо
    trainingBtn.disabled = false;  // Можно запустить тренировку
    widthInput.disabled = false;   // Можно изменить ширину
    heightInput.disabled = false;  // Можно изменить высоту
    speedInput.disabled = false;   // Можно изменить скорость
    pauseBtn.textContent = 'Пауза'; // Возвращаем текст кнопки
    
    // Очищаем игровое поле (создаём новый пустой массив)
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    currentPiece = null;  // Удаляем текущую фигуру
    score = 0;            // Сбрасываем очки
    lines = 0;            // Сбрасываем линии
    level = 1;            // Возвращаем уровень в 1
    
    // Если была тренировка, скрываем панель статистики
    if (wasTraining) {
        trainingStatsEl.style.display = 'none';
    }
    
    // Обновляем интерфейс и перерисовываем поле
    updateUI();
    draw();
}

/**
 * Запускает новую игру
 * Инициализирует все параметры и начинает игровой цикл
 */
function startGame() {
    // Обновляем размеры поля из полей ввода (если были изменены)
    const newCols = parseInt(widthInput.value) || 10;
    const newRows = parseInt(heightInput.value) || 20;
    
    // Проверяем валидность и обновляем размеры
    if (newCols >= 6 && newCols <= 20) COLS = newCols;
    if (newRows >= 10 && newRows <= 40) ROWS = newRows;
    
    // Подстраиваем размер canvas под новые размеры поля
    resizeCanvas();
    
    // Создаём новое пустое игровое поле
    // Array(ROWS).fill() - создаём массив из ROWS элементов
    // .map(() => Array(COLS).fill(0)) - каждый элемент = массив из COLS нулей
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    
    // Сбрасываем статистику
    score = 0;
    lines = 0;
    level = 1;
    
    // Устанавливаем начальную скорость падения
    baseDropSpeed = 1000;  // Базовая скорость 1 секунда
    dropSpeed = baseDropSpeed / speedMultiplier;  // Учитываем множитель скорости
    
    // Устанавливаем флаги состояния
    gameRunning = true;   // Игра запущена
    gamePaused = false;   // Не на паузе
    demoMode = false;     // Не демо-режим (играет человек)
    
    // Очищаем временные данные
    nextPiece = null;     // Нет следующей фигуры
    aiTarget = null;      // Нет цели для ИИ
    
    // Запоминаем текущее время для отсчёта падения фигур
    lastDropTime = Date.now();  // Date.now() возвращает текущее время в миллисекундах
    
    // Обновляем состояние кнопок
    startBtn.disabled = true;     // Нельзя начать новую игру (уже запущена)
    pauseBtn.disabled = false;     // Можно поставить на паузу
    stopBtn.disabled = false;      // Можно остановить
    demoBtn.disabled = true;       // Нельзя запустить демо (игра уже запущена)
    trainingBtn.disabled = true;   // Нельзя запустить тренировку
    widthInput.disabled = true;   // Нельзя изменить размеры во время игры
    heightInput.disabled = true;
    speedInput.disabled = true;
    
    // Обновляем отображение статистики и рисуем начальное состояние
    updateUI();
    spawnNewPiece();  // Появляется первая фигура
    gameLoop();       // Запускаем игровой цикл (бесконечный цикл обновления)
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

/**
 * Создаёт новую фигуру и размещает её в верхней части поля
 * Если следующая фигура уже была подготовлена - использует её
 * Иначе выбирает случайную фигуру из набора
 */
function spawnNewPiece() {
    // Если есть подготовленная следующая фигура - используем её
    // Иначе выбираем случайную фигуру из массива PIECES
    // Math.random() - случайное число от 0 до 1
    // Math.floor(...) - округление вниз до целого
    // PIECES.length - количество доступных фигур
    const pieceTemplate = nextPiece || PIECES[Math.floor(Math.random() * PIECES.length)];
    
    // Создаём объект текущей фигуры с шаблоном и случайным цветом
    currentPiece = {
        template: pieceTemplate,  // Шаблон фигуры (двумерный массив)
        colorIndex: Math.floor(Math.random() * COLORS.length)  // Индекс цвета
    };
    
    // Генерируем следующую фигуру для предпросмотра
    nextPiece = PIECES[Math.floor(Math.random() * PIECES.length)];
    
    // Размещаем фигуру по центру поля вверху
    // COLS / 2 - центр по горизонтали
    // currentPiece.template[0].length - ширина фигуры
    // Вычитаем половину ширины, чтобы фигура была по центру
    currentX = Math.floor(COLS / 2 - currentPiece.template[0].length / 2);
    currentY = 0;  // Верхняя строка
    
    // Проверяем, можно ли разместить новую фигуру
    // Если нельзя - игра заканчивается (поле переполнено)
    if (!canMove(currentPiece.template, currentX, currentY)) {
        endGame();  // Конец игры
    }
    
    // Обновляем отображение следующей фигуры
    drawNextPiece();
    
    // Если это демо-режим, вычисляем лучший ход для ИИ
    // Иначе aiTarget остаётся null (управляет человек)
    aiTarget = demoMode ? findBestMove() : null;
}

/**
 * Обрабатывает нажатия клавиш для управления фигурой
 * @param {KeyboardEvent} e - объект события нажатия клавиши
 */
function handleKeyPress(e) {
    // Если игра не запущена или на паузе, не обрабатываем нажатия
    if (!gameRunning || gamePaused) return;
    
    // switch - конструкция для выбора действия в зависимости от нажатой клавиши
    switch(e.key) {
        case 'ArrowLeft':  // Стрелка влево
            // Проверяем, можно ли сдвинуть фигуру влево, и если да - сдвигаем
            if (canMove(currentPiece.template, currentX - 1, currentY)) {
                currentX--;  // Уменьшаем X (движение влево)
            }
            break;
            
        case 'ArrowRight':  // Стрелка вправо
            // Проверяем, можно ли сдвинуть фигуру вправо, и если да - сдвигаем
            if (canMove(currentPiece.template, currentX + 1, currentY)) {
                currentX++;  // Увеличиваем X (движение вправо)
            }
            break;
            
        case 'ArrowDown':  // Стрелка вниз (ускоренное падение)
            // Проверяем, можно ли сдвинуть фигуру вниз, и если да - сдвигаем
            if (canMove(currentPiece.template, currentX, currentY + 1)) {
                currentY++;  // Увеличиваем Y (движение вниз)
                score += 1;   // Даём небольшой бонус за ускоренное падение
            }
            break;
            
        case ' ':  // Пробел (поворот)
            e.preventDefault();  // Предотвращаем прокрутку страницы при нажатии пробела
            rotatePiece();        // Поворачиваем фигуру
            break;
    }
}

/**
 * Поворачивает текущую фигуру на 90 градусов по часовой стрелке
 * Поворот происходит только если фигура может быть размещена в новой ориентации
 */
function rotatePiece() {
    // Получаем повёрнутую версию шаблона фигуры
    const rotated = rotateMatrix(currentPiece.template);
    
    // Проверяем, можно ли разместить повёрнутую фигуру в текущей позиции
    if (canMove(rotated, currentX, currentY)) {
        // Если можно - заменяем шаблон на повёрнутый
        currentPiece.template = rotated;
    }
    // Если нельзя повернуть (мешает стена или блоки) - ничего не делаем
}

/**
 * Поворачивает матрицу (двумерный массив) на 90 градусов по часовой стрелке
 * Используется для поворота фигур Тетриса
 * @param {Array} matrix - исходная матрица (шаблон фигуры)
 * @returns {Array} - повёрнутая матрица
 * 
 * Пример:
 * Исходная:  [1, 1]      Повёрнутая: [0, 1]
 *            [0, 1]                   [1, 1]
 */
function rotateMatrix(matrix) {
    const n = matrix.length;        // Количество строк исходной матрицы
    const m = matrix[0].length;     // Количество столбцов исходной матрицы
    
    // Создаём новую матрицу с перевёрнутыми размерами (m строк, n столбцов)
    const rotated = Array(m).fill().map(() => Array(n).fill(0));
    
    // Проходим по всем элементам исходной матрицы
    for (let i = 0; i < n; i++) {       // i - номер строки исходной
        for (let j = 0; j < m; j++) {   // j - номер столбца исходной
            // Формула поворота на 90° по часовой стрелке:
            // Элемент [i][j] → позиция [j][n-1-i]
            rotated[j][n - 1 - i] = matrix[i][j];
        }
    }
    
    return rotated;
}

/**
 * Проверяет, можно ли разместить фигуру в заданной позиции
 * @param {Array} piece - шаблон фигуры (двумерный массив)
 * @param {number} x - позиция по горизонтали (столбец)
 * @param {number} y - позиция по вертикали (строка)
 * @returns {boolean} - true если можно разместить, false если нельзя
 */
function canMove(piece, x, y) {
    // Проходим по всем клеткам фигуры
    for (let row = 0; row < piece.length; row++) {
        for (let col = 0; col < piece[row].length; col++) {
            // Проверяем только клетки, где есть блок (значение 1)
            if (piece[row][col]) {
                // Вычисляем абсолютную позицию этого блока на игровом поле
                const newX = x + col;  // Позиция столбца
                const newY = y + row;  // Позиция строки
                
                // Проверка 1: Выход за границы поля
                // Если блок выходит за левую/правую границу или за нижнюю - нельзя
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;  // Невозможно разместить
                }
                
                // Проверка 2: Столкновение с уже установленными блоками
                // Если на этой позиции уже есть блок (не 0) - нельзя
                if (newY >= 0 && board[newY][newX]) {
                    return false;  // Невозможно разместить (пересечение)
                }
            }
        }
    }
    // Если все проверки пройдены - можно разместить
    return true;
}

/**
 * Размещает текущую фигуру на игровом поле
 * Вызывается когда фигура не может больше падать (достигла дна или других блоков)
 * После размещения проверяет и очищает заполненные линии, затем создаёт новую фигуру
 */
function placePiece() {
    // Проходим по всем блокам текущей фигуры
    for (let row = 0; row < currentPiece.template.length; row++) {
        for (let col = 0; col < currentPiece.template[row].length; col++) {
            // Если в этой позиции есть блок фигуры
            if (currentPiece.template[row][col]) {
                // Вычисляем абсолютные координаты на игровом поле
                const x = currentX + col;
                const y = currentY + row;
                
                // Размещаем блок только если он в пределах поля (y >= 0)
                // (верхние блоки, которые за пределами, игнорируем)
                if (y >= 0) {
                    // Записываем цвет фигуры в игровое поле
                    // colorIndex + 1, потому что 0 = пустая клетка
                    board[y][x] = currentPiece.colorIndex + 1;
                }
            }
        }
    }
    
    // Проверяем и очищаем заполненные линии
    clearLines();
    
    // Создаём новую фигуру для продолжения игры
    spawnNewPiece();
}

/**
 * Проверяет и очищает полностью заполненные линии
 * Удаляет заполненные линии и сдвигает всё вниз
 * Начисляет очки и увеличивает уровень при очистке линий
 */
function clearLines() {
    let clearedLines = 0;  // Счётчик очищенных линий
    
    // Проходим по всем строкам снизу вверх (от ROWS-1 до 0)
    // Снизу вверх, чтобы правильно сдвигать блоки после удаления строки
    for (let row = ROWS - 1; row >= 0; row--) {
        // Проверяем, заполнена ли вся строка
        // every() возвращает true если все элементы удовлетворяют условию
        // cell !== 0 означает "не пустая клетка"
        if (board[row].every(cell => cell !== 0)) {
            // Удаляем заполненную строку
            // splice(row, 1) - удаляет 1 элемент начиная с позиции row
            board.splice(row, 1);
            
            // Добавляем новую пустую строку в начало массива
            // unshift() добавляет элемент в начало массива
            board.unshift(Array(COLS).fill(0));
            
            clearedLines++;  // Увеличиваем счётчик
            row++;           // Не уменьшаем row, т.к. строки сдвинулись вниз
        }
    }
    
    // Если были очищены линии, обновляем статистику
    if (clearedLines > 0) {
        // Обновляем количество очищенных линий
        lines += clearedLines;
        
        // Начисляем очки: квадрат количества линий × 100
        // 1 линия = 100, 2 линии = 400, 3 линии = 900, 4 линии = 1600
        score += clearedLines * clearedLines * 100;
        
        // Уровень увеличивается каждые 10 очищенных линий
        // Math.floor() - округление вниз (1.9 → 1)
        level = Math.floor(lines / 10) + 1;
        
        // Увеличиваем скорость с уровнем
        // Базовая скорость уменьшается на 50 мс за уровень
        // Минимум 100 мс между падениями
        baseDropSpeed = Math.max(100, 1000 - (level - 1) * 50);
        
        // Применяем текущий множитель скорости
        // Минимум 50 мс (очень быстро)
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

/**
 * Главный игровой цикл - вызывается постоянно для обновления игры
 * Это сердце игры - функция вызывается ~60 раз в секунду
 * requestAnimationFrame обеспечивает плавную анимацию
 */
function gameLoop() {
    // Если игра не запущена, прекращаем цикл
    if (!gameRunning) return;
    
    // Выполняем игровую логику только если игра не на паузе
    if (!gamePaused) {
        const now = Date.now();  // Получаем текущее время в миллисекундах
        
        // Если включён демо-режим (бот играет)
        // Проверяем, прошло ли достаточно времени с последнего движения бота
        if (demoMode && now - lastMoveTime > MOVE_DELAY) {
            makeDemoMove();        // Делаем ход бота
            lastMoveTime = now;    // Обновляем время последнего движения
        }
        
        // Проверяем, пора ли фигуре упасть вниз
        // Сравниваем разницу времени с установленной скоростью падения
        if (now - lastDropTime > dropSpeed) {
            // Пытаемся сдвинуть фигуру вниз
            if (canMove(currentPiece.template, currentX, currentY + 1)) {
                // Если можно - сдвигаем вниз
                currentY++;
            } else {
                // Если нельзя - фигура достигла дна или блоков
                // Размещаем её на поле и создаём новую
                placePiece();
            }
            lastDropTime = now;  // Обновляем время последнего падения
        }
    }
    
    // Обновляем отображение статистики (очки, линии, уровень)
    updateUI();
    
    // Перерисовываем игровое поле
    draw();
    
    // Запрашиваем следующий кадр анимации
    // Это создаёт бесконечный цикл: gameLoop → requestAnimationFrame → gameLoop → ...
    // Браузер автоматически оптимизирует частоту вызовов (~60 FPS)
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