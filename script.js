const BOARD_SIZE = 20;

const IMAGE_SIZE = 1378;
const GRID_START = 40;
const GRID_END = 1336;
const GRID_STEP = (GRID_END - GRID_START) / (BOARD_SIZE - 1);

const REQUIRED_FIVE_LINES = 2;

const players = [
    { id: 1, name: "A1", team: "A", img: "images/stone_a1.png" },
    { id: 2, name: "A2", team: "A", img: "images/stone_a2.png" },
    { id: 3, name: "B1", team: "B", img: "images/stone_b1.png" },
    { id: 4, name: "B2", team: "B", img: "images/stone_b2.png" }
];



let board = [];
let currentPlayerIndex = 0;
let gameOver = false;
let lastMove = null;


let winningCells = [];
let highlightCells = [];

const boardEl = document.getElementById("board");
const stoneLayer = document.getElementById("stoneLayer");
const turnText = document.getElementById("turnText");
const statusText = document.getElementById("statusText");
const resetBtn = document.getElementById("resetBtn");

function initBoardData() {
    board = Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => null)
    );
    currentPlayerIndex = 0;
    gameOver = false;
    lastMove = null;
    winningCells = [];
    highlightCells = [];
}

function updateInfo() {
    if (gameOver) return;
    const player = players[currentPlayerIndex];
    turnText.textContent = `現在の手番: ${player.name}（チーム${player.team}）`;
}

function getScale() {
    return boardEl.clientWidth / IMAGE_SIZE;
}

function getBoardPixelPosition(x, y) {
    const scale = getScale();

    return {
        left: (GRID_START + GRID_STEP * x) * scale,
        top: (GRID_START + GRID_STEP * y) * scale
    };
}

function getStoneSize() {
    return GRID_STEP * getScale() * 0.92;
}

function hasCell(cellList, x, y) {
    return cellList.some(cell => cell.x === x && cell.y === y);
}

function renderStones() {
    stoneLayer.innerHTML = "";

    const stoneSize = getStoneSize();

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cellData = board[y][x];
            if (!cellData) continue;

            const pos = getBoardPixelPosition(x, y);

            const stone = document.createElement("div");
            stone.className = "stone";
            stone.style.width = `${stoneSize}px`;
            stone.style.height = `${stoneSize}px`;
            stone.style.left = `${pos.left}px`;
            stone.style.top = `${pos.top}px`;
            stone.style.backgroundImage = `url(${cellData.img})`;

            if (lastMove && lastMove.x === x && lastMove.y === y) {
                stone.classList.add("last-move");
            }

            if (hasCell(highlightCells, x, y)) {
                stone.classList.add("win-stone");
            }

            if (hasCell(winningCells, x, y)) {
                stone.classList.add("win-stone");
            }

            stoneLayer.appendChild(stone);
        }
    }
}

function render() {
    updateHighlightCells();
    renderStones();
    updateInfo();
}

function getNearestGridIndex(mouseX, mouseY) {
    const rect = boardEl.getBoundingClientRect();
    const scale = getScale();

    const imageX = (mouseX - rect.left) / scale;
    const imageY = (mouseY - rect.top) / scale;

    const gridX = Math.round((imageX - GRID_START) / GRID_STEP);
    const gridY = Math.round((imageY - GRID_START) / GRID_STEP);

    return {
        x: Math.max(0, Math.min(BOARD_SIZE - 1, gridX)),
        y: Math.max(0, Math.min(BOARD_SIZE - 1, gridY))
    };
}

function handleBoardClick(event) {
    if (gameOver) return;

    const { x, y } = getNearestGridIndex(event.clientX, event.clientY);

    if (board[y][x] !== null) return;

    const player = players[currentPlayerIndex];

    board[y][x] = {
        playerId: player.id,
        playerName: player.name,
        team: player.team,
        img: player.img
    };

    lastMove = { x, y };

    const fiveLineResult = checkDoubleFiveWin(player.team);
    if (fiveLineResult.isWin) {
        gameOver = true;
        winningCells = fiveLineResult.cells;
        statusText.textContent = `チーム${player.team}の勝利！ 5連を2本完成！`;
        turnText.textContent = "ゲーム終了";
        render();
        return;
    }

    if (isBoardFull()) {
        gameOver = true;
        statusText.textContent = "引き分けです";
        turnText.textContent = "ゲーム終了";
        render();
        return;
    }

    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    statusText.textContent = "ゲーム中";
    render();
}

function isBoardFull() {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === null) {
                return false;
            }
        }
    }
    return true;
}

function collectDirectionCells(x, y, dx, dy, team) {
    const cells = [];
    let nx = x + dx;
    let ny = y + dy;

    while (
        nx >= 0 &&
        nx < BOARD_SIZE &&
        ny >= 0 &&
        ny < BOARD_SIZE &&
        board[ny][nx] !== null &&
        board[ny][nx].team === team
    ) {
        cells.push({ x: nx, y: ny });
        nx += dx;
        ny += dy;
    }

    return cells;
}

function normalizeLineKey(cells) {
    const sorted = [...cells].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
    });

    return sorted.map(cell => `${cell.x},${cell.y}`).join("|");
}

function findAllFiveLines(team) {
    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];

    const uniqueLines = new Map();

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === null || board[y][x].team !== team) continue;

            for (const [dx, dy] of directions) {
                const minusCells = collectDirectionCells(x, y, -dx, -dy, team);
                const plusCells = collectDirectionCells(x, y, dx, dy, team);

                const lineCells = [
                    ...minusCells.reverse(),
                    { x, y },
                    ...plusCells
                ];

                if (lineCells.length >= 5) {
                    const key = normalizeLineKey(lineCells);
                    if (!uniqueLines.has(key)) {
                        uniqueLines.set(key, lineCells);
                    }
                }
            }
        }
    }

    return [...uniqueLines.values()];
}

/*
  盤面全体から、5連になっている石を全部集める
*/
function updateHighlightCells() {
    const allTeams = ["A", "B"];
    const merged = [];
    const seen = new Set();

    for (const team of allTeams) {
        const lines = findAllFiveLines(team);

        for (const line of lines) {
            for (const cell of line) {
                const key = `${cell.x},${cell.y}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(cell);
                }
            }
        }
    }

    highlightCells = merged;
}

function checkDoubleFiveWin(team) {
    const allLines = findAllFiveLines(team);

    if (allLines.length >= REQUIRED_FIVE_LINES) {
        const merged = [];
        const seen = new Set();

        for (let i = 0; i < REQUIRED_FIVE_LINES; i++) {
            for (const cell of allLines[i]) {
                const key = `${cell.x},${cell.y}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(cell);
                }
            }
        }

        return {
            isWin: true,
            cells: merged
        };
    }

    return {
        isWin: false,
        cells: []
    };
}

resetBtn.addEventListener("click", () => {
    initBoardData();
    statusText.textContent = "ゲーム中";
    turnText.textContent = "現在の手番: A1（チームA）";
    render();
});

boardEl.addEventListener("click", handleBoardClick);
window.addEventListener("resize", render);

initBoardData();
render();