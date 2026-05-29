const defaultState = {
  format: "normal",
  tableSize: 4,
  participantCount: 8,
  startScore: 25000,
  returnScore: 30000,
  seats: [
    { playerId: "p1", name: "プレイヤー1", score: 35000 },
    { playerId: "p2", name: "プレイヤー2", score: 28000 },
    { playerId: "p3", name: "プレイヤー3", score: 21000 },
    { playerId: "p4", name: "プレイヤー4", score: 16000 },
  ],
  roster: Array.from({ length: 8 }, (_, index) => ({
    id: `p${index + 1}`,
    name: `参加者${index + 1}`,
  })),
  uma: {
    4: [20, 10, -10, -20],
    3: [20, 0, -20],
  },
  history: [],
};

const storageKey = "mahjong-result-calculator-v2";
const formatButtons = [...document.querySelectorAll(".format-button")];
const tableButtons = [...document.querySelectorAll(".table-button")];
const startScoreInput = document.querySelector("#start-score");
const returnScoreInput = document.querySelector("#return-score");
const okaOutput = document.querySelector("#oka-output");
const participantCountInput = document.querySelector("#participant-count");
const tournamentPanel = document.querySelector("#tournament-panel");
const rosterList = document.querySelector("#roster-list");
const seatInputs = document.querySelector("#seat-inputs");
const umaInputs = document.querySelector("#uma-inputs");
const scoreTotal = document.querySelector("#score-total");
const pointTotal = document.querySelector("#point-total");
const resultList = document.querySelector("#result-list");
const saveButton = document.querySelector("#save-result");
const summaryList = document.querySelector("#summary-list");
const emptySummary = document.querySelector("#empty-summary");
const gameCount = document.querySelector("#game-count");
const historyList = document.querySelector("#history-list");
const emptyHistory = document.querySelector("#empty-history");
const clearHistoryButton = document.querySelector("#clear-history");
const resetButton = document.querySelector("#reset-button");

let state = loadState();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return clone(defaultState);
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      ...clone(defaultState),
      ...parsed,
      uma: { ...clone(defaultState).uma, ...parsed.uma },
    };
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function ensureStateShape() {
  while (state.seats.length < 4) {
    const number = state.seats.length + 1;
    state.seats.push({
      playerId: `p${number}`,
      name: `プレイヤー${number}`,
      score: state.startScore,
    });
  }

  while (state.roster.length < state.participantCount) {
    const number = state.roster.length + 1;
    state.roster.push({ id: `p${number}`, name: `参加者${number}` });
  }

  state.roster = state.roster.slice(0, state.participantCount);
}

function activeSeats() {
  return state.seats.slice(0, state.tableSize);
}

function automaticOka() {
  return ((Number(state.returnScore) - Number(state.startScore)) * state.tableSize) / 1000;
}

function formatScore(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

function formatPoint(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

function playerLabel(seat, index) {
  if (state.format === "tournament") {
    const player = state.roster.find((item) => item.id === seat.playerId);
    return player?.name || `参加者${index + 1}`;
  }

  return seat.name || `プレイヤー${index + 1}`;
}

function calculateResults() {
  const ranked = activeSeats()
    .map((seat, index) => ({
      id: state.format === "tournament" ? seat.playerId : seat.name || `player-${index + 1}`,
      originalIndex: index,
      name: playerLabel(seat, index),
      score: Number(seat.score || 0),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.originalIndex - b.originalIndex;
    });

  return ranked.map((player, rankIndex) => {
    const rank = rankIndex + 1;
    const basePoint = (player.score - Number(state.returnScore || 0)) / 1000;
    const uma = Number(state.uma[state.tableSize][rankIndex] || 0);
    const oka = rank === 1 ? automaticOka() : 0;

    return {
      ...player,
      rank,
      basePoint,
      uma,
      oka,
      point: basePoint + uma + oka,
    };
  });
}

function renderSettings() {
  formatButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.format === state.format);
  });

  tableButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.tableSize) === state.tableSize);
  });

  startScoreInput.value = state.startScore;
  returnScoreInput.value = state.returnScore;
  participantCountInput.value = state.participantCount;
  okaOutput.textContent = formatPoint(automaticOka());
  tournamentPanel.classList.toggle("hidden", state.format !== "tournament");
}

function renderRoster() {
  rosterList.innerHTML = "";

  state.roster.forEach((player, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 18;
    input.value = player.name;
    label.append(`参加者${index + 1}`, input);

    input.addEventListener("input", () => {
      state.roster[index].name = input.value;
      renderSeats();
      renderResults();
      renderSummary();
      saveState();
    });

    rosterList.append(label);
  });
}

function renderSeats() {
  seatInputs.innerHTML = "";

  activeSeats().forEach((seat, index) => {
    const row = document.createElement("div");
    row.className = "seat-row";

    const seatName = document.createElement("span");
    seatName.className = "seat-label";
    seatName.textContent = `${index + 1}人目`;

    const playerField = document.createElement("label");
    playerField.append(state.format === "tournament" ? "参加者" : "名前");

    if (state.format === "tournament") {
      const select = document.createElement("select");
      state.roster.forEach((player) => {
        select.add(new Option(player.name, player.id));
      });
      select.value = seat.playerId;
      select.addEventListener("change", () => {
        state.seats[index].playerId = select.value;
        renderResults();
        saveState();
      });
      playerField.append(select);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 18;
      input.value = seat.name;
      input.addEventListener("input", () => {
        state.seats[index].name = input.value;
        renderResults();
        saveState();
      });
      playerField.append(input);
    }

    const scoreField = document.createElement("label");
    const scoreInput = document.createElement("input");
    scoreInput.type = "number";
    scoreInput.step = 100;
    scoreInput.value = seat.score;
    scoreField.append("最終持ち点", scoreInput);
    scoreInput.addEventListener("input", () => {
      state.seats[index].score = Number(scoreInput.value);
      renderResults();
      saveState();
    });

    row.append(seatName, playerField, scoreField);
    seatInputs.append(row);
  });
}

function renderUma() {
  umaInputs.innerHTML = "";

  state.uma[state.tableSize].forEach((value, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "number";
    input.step = 1;
    input.value = value;
    label.append(`${index + 1}位`, input);

    input.addEventListener("input", () => {
      state.uma[state.tableSize][index] = Number(input.value);
      renderResults();
      saveState();
    });

    umaInputs.append(label);
  });
}

function renderResults() {
  const results = calculateResults();
  const scoreSum = activeSeats().reduce((sum, seat) => sum + Number(seat.score || 0), 0);
  const expectedScore = Number(state.startScore || 0) * state.tableSize;
  const pointSum = results.reduce((sum, result) => sum + result.point, 0);

  scoreTotal.textContent = `入力合計 ${formatScore(scoreSum)} / 基準 ${formatScore(expectedScore)}`;
  pointTotal.textContent = `合計 ${formatPoint(pointSum)}`;
  resultList.innerHTML = "";

  results.forEach((result) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const rank = document.createElement("div");
    rank.className = "rank";
    rank.textContent = `${result.rank}位`;

    const detail = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = result.name;
    const breakdown = document.createElement("p");
    breakdown.textContent = `${formatScore(result.score)}点 / 素点 ${formatPoint(
      result.basePoint
    )} / ウマ ${formatPoint(result.uma)} / オカ ${formatPoint(result.oka)}`;
    detail.append(name, breakdown);

    const output = document.createElement("output");
    output.textContent = formatPoint(result.point);

    card.append(rank, detail, output);
    resultList.append(card);
  });
}

function buildSummary() {
  const summary = new Map();

  state.history.forEach((record) => {
    record.results.forEach((result) => {
      const key = result.id || result.name;
      const current = summary.get(key) || {
        name: result.name,
        games: 0,
        total: 0,
        top: 0,
      };
      current.name = result.name;
      current.games += 1;
      current.total += Number(result.point || 0);
      current.top += result.rank === 1 ? 1 : 0;
      summary.set(key, current);
    });
  });

  return [...summary.values()].sort((a, b) => b.total - a.total);
}

function renderSummary() {
  const summary = buildSummary();
  summaryList.innerHTML = "";
  gameCount.textContent = `${state.history.length}半荘`;

  summary.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `
      <span>${index + 1}位</span>
      <strong></strong>
      <small>${player.games}半荘 / 1着 ${player.top}回</small>
      <output>${formatPoint(player.total)}</output>
    `;
    row.querySelector("strong").textContent = player.name;
    summaryList.append(row);
  });

  emptySummary.classList.toggle("hidden", summary.length > 0);
}

function renderHistory() {
  historyList.innerHTML = "";

  state.history.forEach((record) => {
    const item = document.createElement("li");
    const rows = record.results
      .map((result) => `${result.rank}位 ${result.name} ${formatPoint(result.point)}`)
      .join(" / ");
    item.textContent = `${record.tableSize}麻 ${record.createdAt} - ${rows}`;
    historyList.append(item);
  });

  emptyHistory.classList.toggle("hidden", state.history.length > 0);
}

function renderAll() {
  ensureStateShape();
  renderSettings();
  renderRoster();
  renderSeats();
  renderUma();
  renderResults();
  renderSummary();
  renderHistory();
  saveState();
}

function updateTableDefaults() {
  if (state.tableSize === 4) {
    state.startScore = 25000;
    state.returnScore = 30000;
  } else {
    state.startScore = 35000;
    state.returnScore = 40000;
  }

  state.seats.forEach((seat, index) => {
    seat.score = state.startScore + (state.tableSize - index - 1) * 3000;
  });
}

formatButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.format = button.dataset.format;
    renderAll();
  });
});

tableButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.tableSize = Number(button.dataset.tableSize);
    updateTableDefaults();
    renderAll();
  });
});

startScoreInput.addEventListener("input", () => {
  state.startScore = Number(startScoreInput.value);
  renderSettings();
  renderResults();
  saveState();
});

returnScoreInput.addEventListener("input", () => {
  state.returnScore = Number(returnScoreInput.value);
  renderSettings();
  renderResults();
  saveState();
});

participantCountInput.addEventListener("input", () => {
  state.participantCount = Math.max(5, Math.min(32, Number(participantCountInput.value || 5)));
  ensureStateShape();
  renderRoster();
  renderSeats();
  renderResults();
  saveState();
});

saveButton.addEventListener("click", () => {
  const results = calculateResults();
  const selectedIds = activeSeats().map((seat) => seat.playerId);
  const duplicated = state.format === "tournament" && new Set(selectedIds).size !== selectedIds.length;

  if (duplicated) {
    alert("大会モードでは同じ参加者を同じ半荘に重複して入れられません。");
    return;
  }

  state.history.unshift({
    format: state.format,
    tableSize: state.tableSize,
    createdAt: new Date().toLocaleString("ja-JP"),
    settings: {
      startScore: state.startScore,
      returnScore: state.returnScore,
      oka: automaticOka(),
      uma: [...state.uma[state.tableSize]],
    },
    results,
  });
  state.history = state.history.slice(0, 100);
  renderSummary();
  renderHistory();
  saveState();
});

clearHistoryButton.addEventListener("click", () => {
  if (!confirm("記録をすべて削除しますか？")) {
    return;
  }

  state.history = [];
  renderSummary();
  renderHistory();
  saveState();
});

resetButton.addEventListener("click", () => {
  if (!confirm("設定と入力内容を初期化しますか？")) {
    return;
  }

  state = clone(defaultState);
  renderAll();
});

renderAll();
