const defaultState = {
  players: [
    { name: "東家", score: 25000 },
    { name: "南家", score: 25000 },
    { name: "西家", score: 25000 },
    { name: "北家", score: 25000 },
  ],
  honba: 0,
  riichiSticks: 0,
  history: [],
};

const storageKey = "mahjong-scorekeeper-state";
const nameInputs = [...document.querySelectorAll(".player-name")];
const scoreLabels = [
  document.querySelector("#score-0"),
  document.querySelector("#score-1"),
  document.querySelector("#score-2"),
  document.querySelector("#score-3"),
];
const winnerSelect = document.querySelector("#winner");
const payerSelect = document.querySelector("#payer");
const pointsInput = document.querySelector("#points");
const honbaInput = document.querySelector("#honba");
const riichiInput = document.querySelector("#riichi-sticks");
const scoreForm = document.querySelector("#score-form");
const historyList = document.querySelector("#history");
const emptyHistory = document.querySelector("#empty-history");
const totalScore = document.querySelector("#total-score");
const resetButton = document.querySelector("#reset-game");
const riichiButton = document.querySelector("#riichi-button");
const undoButton = document.querySelector("#undo-button");

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatScore(score) {
  return score.toLocaleString("ja-JP");
}

function playerName(index) {
  return state.players[index].name || `プレイヤー${index + 1}`;
}

function snapshot() {
  return JSON.stringify({
    players: state.players,
    honba: state.honba,
    riichiSticks: state.riichiSticks,
  });
}

function restore(snapshotText) {
  const previous = JSON.parse(snapshotText);
  state.players = previous.players;
  state.honba = previous.honba;
  state.riichiSticks = previous.riichiSticks;
}

function renderOptions() {
  const currentWinner = winnerSelect.value;
  const currentPayer = payerSelect.value;
  winnerSelect.innerHTML = "";
  payerSelect.innerHTML = "";

  state.players.forEach((player, index) => {
    const winnerOption = new Option(player.name || `プレイヤー${index + 1}`, index);
    const payerOption = new Option(player.name || `プレイヤー${index + 1}`, index);
    winnerSelect.add(winnerOption);
    payerSelect.add(payerOption);
  });

  payerSelect.add(new Option("ツモ 全員払い", "all"));
  winnerSelect.value = currentWinner || "0";
  payerSelect.value = currentPayer || "1";
}

function render() {
  state.players.forEach((player, index) => {
    nameInputs[index].value = player.name;
    scoreLabels[index].textContent = formatScore(player.score);
  });

  honbaInput.value = state.honba;
  riichiInput.value = state.riichiSticks;
  totalScore.textContent = `合計 ${formatScore(
    state.players.reduce((sum, player) => sum + player.score, 0)
  )}`;

  renderOptions();
  renderHistory();
  saveState();
}

function renderHistory() {
  historyList.innerHTML = "";

  state.history.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry.text;
    historyList.append(item);
  });

  emptyHistory.classList.toggle("hidden", state.history.length > 0);
  undoButton.disabled = state.history.length === 0;
}

function addHistory(text, before) {
  state.history.unshift({
    text,
    before,
    createdAt: new Date().toISOString(),
  });
  state.history = state.history.slice(0, 30);
}

function applyWin(event) {
  event.preventDefault();

  const winner = Number(winnerSelect.value);
  const payer = payerSelect.value;
  const basePoints = Number(pointsInput.value);
  const honbaBonus = Number(honbaInput.value) * 300;
  const deposit = Number(riichiInput.value) * 1000;
  const before = snapshot();

  if (!Number.isFinite(basePoints) || basePoints <= 0) {
    return;
  }

  state.honba = Number(honbaInput.value);
  state.riichiSticks = Number(riichiInput.value);

  if (payer === "all") {
    const eachPayment = basePoints + honbaBonus;
    state.players.forEach((player, index) => {
      if (index !== winner) {
        player.score -= eachPayment;
        state.players[winner].score += eachPayment;
      }
    });
    state.players[winner].score += deposit;
    addHistory(
      `${playerName(winner)} ツモ +${formatScore(eachPayment * 3 + deposit)}`,
      before
    );
  } else {
    const payerIndex = Number(payer);

    if (payerIndex === winner) {
      return;
    }

    const payment = basePoints + honbaBonus + deposit;
    state.players[payerIndex].score -= payment;
    state.players[winner].score += payment;
    addHistory(
      `${playerName(winner)} ロン ${playerName(payerIndex)}から +${formatScore(payment)}`,
      before
    );
  }

  state.honba += 1;
  state.riichiSticks = 0;
  render();
}

function addRiichi() {
  const winner = Number(winnerSelect.value);
  const before = snapshot();
  state.players[winner].score -= 1000;
  state.riichiSticks += 1;
  addHistory(`${playerName(winner)} リーチ -1,000`, before);
  render();
}

nameInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    state.players[index].name = input.value.trim();
    renderOptions();
    saveState();
  });
});

document.querySelectorAll("[data-points]").forEach((button) => {
  button.addEventListener("click", () => {
    pointsInput.value = button.dataset.points;
  });
});

scoreForm.addEventListener("submit", applyWin);

honbaInput.addEventListener("input", () => {
  state.honba = Number(honbaInput.value);
  saveState();
});

riichiInput.addEventListener("input", () => {
  state.riichiSticks = Number(riichiInput.value);
  saveState();
});

riichiButton.addEventListener("click", addRiichi);

undoButton.addEventListener("click", () => {
  const [latest, ...rest] = state.history;

  if (!latest) {
    return;
  }

  restore(latest.before);
  state.history = rest;
  render();
});

resetButton.addEventListener("click", () => {
  if (!confirm("点数と履歴をリセットしますか？")) {
    return;
  }

  state = structuredClone(defaultState);
  render();
});

render();
