const defaultState = {
  mode: 4,
  startScore: 25000,
  returnScore: 30000,
  oka: 20,
  players: [
    { name: "プレイヤー1", score: 35000 },
    { name: "プレイヤー2", score: 28000 },
    { name: "プレイヤー3", score: 21000 },
    { name: "プレイヤー4", score: 16000 },
  ],
  uma: {
    4: [20, 10, -10, -20],
    3: [20, 0, -20],
  },
  history: [],
};

const storageKey = "mahjong-result-calculator";
const modeButtons = [...document.querySelectorAll(".mode-button")];
const startScoreInput = document.querySelector("#start-score");
const returnScoreInput = document.querySelector("#return-score");
const okaInput = document.querySelector("#oka");
const playerInputs = document.querySelector("#player-inputs");
const umaInputs = document.querySelector("#uma-inputs");
const resultList = document.querySelector("#result-list");
const scoreTotal = document.querySelector("#score-total");
const pointTotal = document.querySelector("#point-total");
const saveButton = document.querySelector("#save-result");
const resetButton = document.querySelector("#reset-button");
const historyList = document.querySelector("#history-list");
const emptyHistory = document.querySelector("#empty-history");
const clearHistoryButton = document.querySelector("#clear-history");

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

function activePlayers() {
  return state.players.slice(0, state.mode);
}

function formatScore(value) {
  return Number(value).toLocaleString("ja-JP");
}

function formatPoint(value) {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

function updateTotals(results) {
  const totalScore = activePlayers().reduce((sum, player) => sum + Number(player.score || 0), 0);
  const totalPoint = results.reduce((sum, result) => sum + result.point, 0);
  scoreTotal.textContent = `合計 ${formatScore(totalScore)}`;
  pointTotal.textContent = `合計 ${formatPoint(totalPoint)}`;
}

function calculateResults() {
  const ranked = activePlayers()
    .map((player, index) => ({
      index,
      name: player.name || `プレイヤー${index + 1}`,
      score: Number(player.score || 0),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    });

  return ranked.map((player, rankIndex) => {
    const rank = rankIndex + 1;
    const basePoint = (player.score - Number(state.returnScore || 0)) / 1000;
    const uma = Number(state.uma[state.mode][rankIndex] || 0);
    const oka = rank === 1 ? Number(state.oka || 0) : 0;
    const point = basePoint + uma + oka;

    return {
      ...player,
      rank,
      basePoint,
      uma,
      oka,
      point,
    };
  });
}

function renderSettings() {
  modeButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.mode) === state.mode);
  });

  startScoreInput.value = state.startScore;
  returnScoreInput.value = state.returnScore;
  okaInput.value = state.oka;
}

function renderPlayerInputs() {
  playerInputs.innerHTML = "";

  activePlayers().forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "player-row";

    const nameLabel = document.createElement("label");
    const nameInput = document.createElement("input");
    nameInput.className = "name-input";
    nameInput.type = "text";
    nameInput.maxLength = 16;
    nameInput.value = player.name;
    nameLabel.append("名前", nameInput);

    const scoreLabel = document.createElement("label");
    const scoreInput = document.createElement("input");
    scoreInput.className = "score-input";
    scoreInput.type = "number";
    scoreInput.step = 100;
    scoreInput.value = player.score;
    scoreLabel.append("最終持ち点", scoreInput);

    nameInput.addEventListener("input", (event) => {
      state.players[index].name = event.target.value;
      renderResults();
      saveState();
    });

    scoreInput.addEventListener("input", (event) => {
      state.players[index].score = Number(event.target.value);
      renderResults();
      saveState();
    });

    row.append(nameLabel, scoreLabel);
    playerInputs.append(row);
  });
}

function renderUmaInputs() {
  umaInputs.innerHTML = "";

  state.uma[state.mode].forEach((value, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.className = "uma-input";
    input.type = "number";
    input.step = 1;
    input.value = value;
    label.append(`${index + 1}位`, input);

    input.addEventListener("input", (event) => {
      state.uma[state.mode][index] = Number(event.target.value);
      renderResults();
      saveState();
    });

    umaInputs.append(label);
  });
}

function renderResults() {
  const results = calculateResults();
  resultList.innerHTML = "";

  results.forEach((result) => {
    const item = document.createElement("article");
    item.className = "result-card";

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

    item.append(rank, detail, output);
    resultList.append(item);
  });

  updateTotals(results);
}

function renderHistory() {
  historyList.innerHTML = "";

  state.history.forEach((record) => {
    const item = document.createElement("li");
    const rows = record.results
      .map((result) => `${result.rank}位 ${result.name} ${formatPoint(result.point)}`)
      .join(" / ");
    item.textContent = `${record.mode}麻 ${record.createdAt} - ${rows}`;
    historyList.append(item);
  });

  emptyHistory.classList.toggle("hidden", state.history.length > 0);
}

function renderAll() {
  renderSettings();
  renderPlayerInputs();
  renderUmaInputs();
  renderResults();
  renderHistory();
  saveState();
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = Number(button.dataset.mode);
    renderAll();
  });
});

startScoreInput.addEventListener("input", (event) => {
  state.startScore = Number(event.target.value);
  saveState();
});

returnScoreInput.addEventListener("input", (event) => {
  state.returnScore = Number(event.target.value);
  renderResults();
  saveState();
});

okaInput.addEventListener("input", (event) => {
  state.oka = Number(event.target.value);
  renderResults();
  saveState();
});

saveButton.addEventListener("click", () => {
  const results = calculateResults();
  state.history.unshift({
    mode: state.mode,
    createdAt: new Date().toLocaleString("ja-JP"),
    settings: {
      startScore: state.startScore,
      returnScore: state.returnScore,
      oka: state.oka,
      uma: [...state.uma[state.mode]],
    },
    results,
  });
  state.history = state.history.slice(0, 50);
  renderHistory();
  saveState();
});

clearHistoryButton.addEventListener("click", () => {
  if (!confirm("記録をすべて削除しますか？")) {
    return;
  }

  state.history = [];
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
