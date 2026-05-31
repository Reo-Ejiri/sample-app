(function () {
const fallbackCalculator = {
  activeSeats(state) {
    return state.seats.slice(0, state.tableSize);
  },
  automaticOka(state) {
    return ((Number(state.returnScore) - Number(state.startScore)) * state.tableSize) / 1000;
  },
  calculateResults(state, labels) {
    const ranked = fallbackCalculator
      .activeSeats(state)
      .map((seat, index) => ({
        id: state.format === "tournament" ? seat.playerId : seat.name || `player-${index + 1}`,
        originalIndex: index,
        name: fallbackCalculator.playerLabel(state, labels, seat, index),
        score: Number(seat.score || 0),
      }))
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.originalIndex - b.originalIndex));

    return ranked.map((player, rankIndex) => {
      const rank = rankIndex + 1;
      const basePoint = (player.score - Number(state.returnScore || 0)) / 1000;
      const uma = Number(state.uma[state.tableSize][rankIndex] || 0);
      const oka = rank === 1 ? fallbackCalculator.automaticOka(state) : 0;
      const deposit = rank === 1 ? fallbackCalculator.depositPoint(state) : 0;

      return {
        ...player,
        rank,
        basePoint,
        uma,
        oka,
        deposit,
        point: basePoint + uma + oka + deposit,
      };
    });
  },
  depositPoint(state) {
    return Number(state.depositSticks || 0);
  },
  expectedScoreTotal(state) {
    return Number(state.startScore || 0) * state.tableSize - Number(state.depositSticks || 0) * 1000;
  },
  formatPoint(value) {
    const rounded = Math.round(Number(value || 0) * 10) / 10;
    return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
  },
  formatScore(value) {
    return Number(value || 0).toLocaleString("ja-JP");
  },
  gameTotals(state, seats, results) {
    const scoreSum = seats.reduce((sum, seat) => sum + Number(seat.score || 0), 0);
    const expectedScore = fallbackCalculator.expectedScoreTotal(state);
    const pointSum = results.reduce((sum, result) => sum + result.point, 0);

    return {
      scoreSum,
      expectedScore,
      pointSum,
      scoreValid: scoreSum === expectedScore,
      pointValid: Math.round(pointSum * 10) === 0,
    };
  },
  playerLabel(state, labels, seat, index) {
    if (state.format === "tournament") {
      const player = state.roster.find((item) => item.id === seat.playerId);
      return player?.name || `${labels.participant}${index + 1}`;
    }

    return seat.name || `${labels.player}${index + 1}`;
  },
};

const calculator = { ...fallbackCalculator, ...(window.MahjongCalculator || {}) };

const {
  activeSeats: getActiveSeats,
  automaticOka: getAutomaticOka,
  calculateResults: getCalculatedResults,
  depositPoint: getDepositPoint,
  expectedScoreTotal: getExpectedScoreTotal,
  formatPoint: formatPointValue,
  formatScore: formatScoreValue,
  gameTotals: getGameTotals,
  playerLabel: getPlayerLabel,
} = calculator;

const labels = {
  player: "プレイヤー",
  participant: "参加者",
  normalName: "名前",
  finalScore: "最終持ち点",
  seat: "人目",
  rank: "位",
  points: "点",
  base: "素点",
  uma: "ウマ",
  oka: "オカ",
  deposit: "供託",
  total: "合計",
  inputTotal: "入力合計",
  expected: "基準",
  hanchan: "半荘",
  top: "1着",
  standardRules: "標準ルール",
  selectedDayTotal: "選択日の合計",
  correctionTotal: "修正合計",
  correction: "修正",
  edit: "編集",
  delete: "削除",
  saveGame: "この半荘を記録",
  updateGame: "編集内容を保存",
  exportPrefix: "麻雀成績",
};

const ruleNames = {
  allRed: "全赤",
  chips: "チップあり",
  abortiveDraw: "途中流局あり",
  pao: "パオあり",
  doubleRon: "ダブロンあり",
  openTanyao: "食いタンあり",
  kitaNuki: "北抜きあり",
  tsumoLoss: "ツモ損あり",
  sanmaRedFives: "赤5筒・赤5索あり",
  noMiddleManzu: "萬子2〜8なし",
};

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const defaultState = {
  format: "normal",
  tableSize: 4,
  selectedDate: todayKey(),
  calendarMonth: todayKey().slice(0, 7),
  participantCount: 8,
  startScore: 25000,
  returnScore: 30000,
  depositSticks: 0,
  seats: [
    { playerId: "p1", name: `${labels.player}1`, score: 35000 },
    { playerId: "p2", name: `${labels.player}2`, score: 28000 },
    { playerId: "p3", name: `${labels.player}3`, score: 21000 },
    { playerId: "p4", name: `${labels.player}4`, score: 16000 },
  ],
  roster: Array.from({ length: 8 }, (_, index) => ({
    id: `p${index + 1}`,
    name: `${labels.participant}${index + 1}`,
  })),
  uma: {
    4: [20, 10, -10, -20],
    3: [20, 0, -20],
  },
  rules: {
    allRed: false,
    chips: false,
    abortiveDraw: true,
    pao: true,
    doubleRon: true,
    openTanyao: true,
    kitaNuki: true,
    tsumoLoss: false,
    sanmaRedFives: true,
    noMiddleManzu: true,
    note: "",
  },
  dateNotes: {},
  history: [],
  corrections: [],
};

const storageKey = "mahjong-result-calculator-v3";
const formatButtons = [...document.querySelectorAll(".format-button")];
const tableButtons = [...document.querySelectorAll(".table-button")];
const startScoreInput = document.querySelector("#start-score");
const returnScoreInput = document.querySelector("#return-score");
const depositSticksInput = document.querySelector("#deposit-sticks");
const okaOutput = document.querySelector("#oka-output");
const participantCountInput = document.querySelector("#participant-count");
const tournamentPanel = document.querySelector("#tournament-panel");
const rosterList = document.querySelector("#roster-list");
const seatInputs = document.querySelector("#seat-inputs");
const umaInputs = document.querySelector("#uma-inputs");
const scoreTotal = document.querySelector("#score-total");
const pointTotal = document.querySelector("#point-total");
const validationMessage = document.querySelector("#validation-message");
const resultList = document.querySelector("#result-list");
const saveButton = document.querySelector("#save-result");
const cancelEditButton = document.querySelector("#cancel-edit");
const summaryList = document.querySelector("#summary-list");
const emptySummary = document.querySelector("#empty-summary");
const gameCount = document.querySelector("#game-count");
const historyList = document.querySelector("#history-list");
const emptyHistory = document.querySelector("#empty-history");
const clearHistoryButton = document.querySelector("#clear-history");
const resetButton = document.querySelector("#reset-button");
const recordDateInput = document.querySelector("#record-date");
const dayNoteInput = document.querySelector("#day-note");
const calendarTitle = document.querySelector("#calendar-title");
const calendarGrid = document.querySelector("#calendar-grid");
const prevMonthButton = document.querySelector("#prev-month");
const nextMonthButton = document.querySelector("#next-month");
const ruleChecks = [...document.querySelectorAll(".rule-check")];
const ruleNoteInput = document.querySelector("#rule-note");
const ruleSummary = document.querySelector("#rule-summary");
const correctionList = document.querySelector("#correction-list");
const correctionTotal = document.querySelector("#correction-total");
const correctionNoteInput = document.querySelector("#correction-note");
const saveCorrectionButton = document.querySelector("#save-correction");
const exportJsonButton = document.querySelector("#export-json");
const importJsonInput = document.querySelector("#import-json");
const exportCsvButton = document.querySelector("#export-csv");

let state = loadState();
let editingRecordId = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function dateKeyIsValid(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function monthKeyIsValid(value) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function safeRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadState() {
  let saved = null;

  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    saved = null;
  }

  if (!saved) {
    return clone(defaultState);
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      ...clone(defaultState),
      ...parsed,
      uma: { ...clone(defaultState).uma, ...parsed.uma },
      rules: { ...clone(defaultState).rules, ...parsed.rules },
      dateNotes: { ...clone(defaultState).dateNotes, ...parsed.dateNotes },
      corrections: parsed.corrections || [],
    };
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Some embedded previews disable storage. The app should still render and calculate.
  }
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportedState() {
  return {
    app: "mahjong-result-calculator",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  };
}

function normalizeImportedState(payload) {
  const imported = payload?.state || payload;

  if (!imported || typeof imported !== "object" || !Array.isArray(imported.history)) {
    throw new Error("Invalid import file");
  }

  return {
    ...clone(defaultState),
    ...imported,
    uma: { ...clone(defaultState).uma, ...(imported.uma || {}) },
    rules: { ...clone(defaultState).rules, ...(imported.rules || {}) },
    dateNotes: { ...clone(defaultState).dateNotes, ...(imported.dateNotes || {}) },
    history: imported.history || [],
    corrections: imported.corrections || [],
  };
}

function ensureStateShape() {
  state.format = state.format === "tournament" ? "tournament" : "normal";
  state.tableSize = Number(state.tableSize) === 3 ? 3 : 4;
  state.participantCount = Math.max(5, Math.min(32, Math.round(finiteNumber(state.participantCount, 8))));
  state.startScore = finiteNumber(state.startScore, state.tableSize === 3 ? 35000 : 25000);
  state.returnScore = finiteNumber(state.returnScore, state.tableSize === 3 ? 40000 : 30000);
  state.depositSticks = Math.max(0, Math.round(finiteNumber(state.depositSticks, 0)));
  state.seats = Array.isArray(state.seats) ? state.seats : clone(defaultState.seats);
  state.roster = Array.isArray(state.roster) ? state.roster : clone(defaultState.roster);
  state.history = Array.isArray(state.history) ? state.history : [];
  state.corrections = Array.isArray(state.corrections) ? state.corrections : [];
  state.dateNotes = state.dateNotes && typeof state.dateNotes === "object" ? state.dateNotes : {};
  state.rules = { ...clone(defaultState).rules, ...(state.rules || {}) };
  state.uma = { ...clone(defaultState).uma, ...(state.uma || {}) };
  state.uma[3] = Array.isArray(state.uma[3]) && state.uma[3].length >= 3 ? state.uma[3] : clone(defaultState.uma[3]);
  state.uma[4] = Array.isArray(state.uma[4]) && state.uma[4].length >= 4 ? state.uma[4] : clone(defaultState.uma[4]);

  while (state.seats.length < 4) {
    const number = state.seats.length + 1;
    state.seats.push({
      playerId: `p${number}`,
      name: `${labels.player}${number}`,
      score: state.startScore,
    });
  }

  while (state.roster.length < state.participantCount) {
    const number = state.roster.length + 1;
    state.roster.push({ id: `p${number}`, name: `${labels.participant}${number}` });
  }

  state.roster = state.roster.slice(0, state.participantCount);

  if (!dateKeyIsValid(state.selectedDate)) {
    state.selectedDate = todayKey();
  }

  if (!monthKeyIsValid(state.calendarMonth)) {
    state.calendarMonth = state.selectedDate.slice(0, 7);
  }

  state.seats.forEach((seat, index) => {
    seat.playerId = seat.playerId || `p${index + 1}`;
    seat.name = seat.name || `${labels.player}${index + 1}`;
    seat.score = finiteNumber(seat.score, state.startScore);
  });

  state.roster.forEach((player, index) => {
    player.id = player.id || `p${index + 1}`;
    player.name = player.name || `${labels.participant}${index + 1}`;
  });

  state.history.forEach((record) => {
    if (!record.id) {
      record.id = safeRandomId();
    }
  });
}

function activeSeats() {
  return getActiveSeats(state);
}

function automaticOka() {
  return getAutomaticOka(state);
}

function depositPoint() {
  return getDepositPoint(state);
}

function expectedScoreTotal() {
  return getExpectedScoreTotal(state);
}

function formatScore(value) {
  return formatScoreValue(value);
}

function formatPoint(value) {
  return formatPointValue(value);
}

function playerLabel(seat, index) {
  return getPlayerLabel(state, labels, seat, index);
}

function calculateResults() {
  return getCalculatedResults(state, labels);
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
  depositSticksInput.value = state.depositSticks;
  participantCountInput.value = state.participantCount;
  okaOutput.textContent = formatPoint(automaticOka());
  tournamentPanel.classList.toggle("hidden", state.format !== "tournament");
}

function ruleAppliesToTable(input) {
  const tableSize = input.closest(".table-rule")?.dataset.tableSize;
  return !tableSize || Number(tableSize) === state.tableSize;
}

function activeRuleNames(rules = state.rules) {
  const activeRuleKeys = ruleChecks
    .filter((input) => ruleAppliesToTable(input))
    .map((input) => input.dataset.rule);
  const names = activeRuleKeys.filter((key) => rules[key]).map((key) => ruleNames[key]);

  if (rules.note) {
    names.push(rules.note);
  }

  return names;
}

function renderDayTools() {
  recordDateInput.value = state.selectedDate;
  dayNoteInput.value = state.dateNotes[state.selectedDate] || "";
  renderCalendar();
}

function renderCalendar() {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const monthRecords = new Map();

  state.history.forEach((record) => {
    if (!record.date?.startsWith(state.calendarMonth)) {
      return;
    }

    monthRecords.set(record.date, (monthRecords.get(record.date) || 0) + 1);
  });

  state.corrections.forEach((correction) => {
    if (!correction.date?.startsWith(state.calendarMonth)) {
      return;
    }

    monthRecords.set(correction.date, (monthRecords.get(correction.date) || 0) + 1);
  });

  calendarTitle.textContent = `${year}/${String(month).padStart(2, "0")}`;
  calendarGrid.innerHTML = "";

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    calendarGrid.append(document.createElement("span"));
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = `${state.calendarMonth}-${String(day).padStart(2, "0")}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;
    button.classList.toggle("active", date === state.selectedDate);
    button.classList.toggle("has-record", monthRecords.has(date) || Boolean(state.dateNotes[date]));
    button.title = monthRecords.has(date) ? `${monthRecords.get(date)}${labels.hanchan}` : "";
    button.addEventListener("click", () => {
      state.selectedDate = date;
      state.calendarMonth = date.slice(0, 7);
      renderAll();
    });
    calendarGrid.append(button);
  }
}

function renderRules() {
  ruleChecks.forEach((input) => {
    input.checked = Boolean(state.rules[input.dataset.rule]);
    input.closest(".table-rule")?.classList.toggle("hidden", !ruleAppliesToTable(input));
  });

  ruleNoteInput.value = state.rules.note || "";
  const names = activeRuleNames();
  ruleSummary.textContent = names.length ? names.join(" / ") : labels.standardRules;
}

function renderRoster() {
  rosterList.innerHTML = "";

  state.roster.forEach((player, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 18;
    input.value = player.name;
    label.append(`${labels.participant}${index + 1}`, input);

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
    seatName.textContent = `${index + 1}${labels.seat}`;

    const playerField = document.createElement("label");
    playerField.append(state.format === "tournament" ? labels.participant : labels.normalName);

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
    scoreField.append(labels.finalScore, scoreInput);
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
    label.append(`${index + 1}${labels.rank}`, input);

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
  const totals = getGameTotals(state, activeSeats(), results);
  const validationMessages = currentGameValidationMessages(results, totals);

  scoreTotal.textContent = `${labels.inputTotal} ${formatScore(totals.scoreSum)} / ${
    labels.expected
  } ${formatScore(totals.expectedScore)}`;
  pointTotal.textContent = `${labels.total} ${formatPoint(totals.pointSum)}`;
  scoreTotal.classList.toggle("invalid", !totals.scoreValid);
  pointTotal.classList.toggle("invalid", !totals.pointValid);
  validationMessage.textContent = validationMessages.join(" ");
  validationMessage.classList.toggle("visible", validationMessages.length > 0);
  saveButton.disabled = validationMessages.length > 0;
  resultList.innerHTML = "";

  results.forEach((result) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const rank = document.createElement("div");
    rank.className = "rank";
    rank.textContent = `${result.rank}${labels.rank}`;

    const detail = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = result.name;
    const breakdown = document.createElement("p");
    breakdown.textContent = `${formatScore(result.score)}${labels.points} / ${labels.base} ${formatPoint(
      result.basePoint
    )} / ${labels.uma} ${formatPoint(result.uma)} / ${labels.oka} ${formatPoint(
      result.oka
    )} / ${labels.deposit} ${formatPoint(result.deposit)}`;
    detail.append(name, breakdown);

    const output = document.createElement("output");
    output.textContent = formatPoint(result.point);

    card.append(rank, detail, output);
    resultList.append(card);
  });
}

function currentGameValidationMessages(results = calculateResults(), totals = getGameTotals(state, activeSeats(), results)) {
  const messages = [];
  const selectedIds = activeSeats().map((seat) => seat.playerId);
  const duplicated = state.format === "tournament" && new Set(selectedIds).size !== selectedIds.length;

  if (duplicated) {
    messages.push(
      "大会モードでは同じ参加者を同じ半荘に重複して入れられません。"
    );
  }

  if (!totals.scoreValid) {
    messages.push(
      `最終持ち点の合計が基準と一致していません（${formatScore(
        totals.scoreSum
      )} / ${formatScore(totals.expectedScore)}）。`
    );
  }

  if (!totals.pointValid) {
    messages.push(
      `ポイント合計が0.0になるよう、順位ウマや返し点を確認してください（現在 ${formatPoint(
        totals.pointSum
      )}）。`
    );
  }

  return messages;
}

function validateCurrentGame(results = calculateResults()) {
  const messages = currentGameValidationMessages(results);

  if (messages.length) {
    renderResults();
    alert(messages.join("\n"));
    return false;
  }

  return true;
}

function currentRecord(results) {
  return {
    id: editingRecordId || safeRandomId(),
    format: state.format,
    tableSize: state.tableSize,
    participantCount: state.participantCount,
    date: state.selectedDate,
    createdAt: editingRecordId
      ? state.history.find((record) => record.id === editingRecordId)?.createdAt || new Date().toLocaleString("ja-JP")
      : new Date().toLocaleString("ja-JP"),
    updatedAt: editingRecordId ? new Date().toLocaleString("ja-JP") : "",
    settings: {
      startScore: state.startScore,
      returnScore: state.returnScore,
      depositSticks: state.depositSticks,
      oka: automaticOka(),
      uma: [...state.uma[state.tableSize]],
    },
    rules: {
      ...clone(state.rules),
      names: activeRuleNames(),
    },
    memo: state.dateNotes[state.selectedDate] || "",
    roster: clone(state.roster),
    seats: activeSeats().map((seat) => ({ ...seat })),
    results,
  };
}

function buildSummary() {
  const summary = new Map();

  state.history
    .filter((record) => record.date === state.selectedDate)
    .forEach((record) => {
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

  state.corrections
    .filter((correction) => correction.date === state.selectedDate)
    .forEach((correction) => {
      correction.items.forEach((item) => {
        const key = item.id || item.name;
        const current = summary.get(key) || {
          name: item.name,
          games: 0,
          total: 0,
          top: 0,
        };
        current.name = item.name;
        current.total += Number(item.point || 0);
        summary.set(key, current);
      });
    });

  return [...summary.values()].sort((a, b) => b.total - a.total);
}

function correctionPlayers() {
  const players = new Map();

  activeSeats().forEach((seat, index) => {
    const id = state.format === "tournament" ? seat.playerId : seat.name || `seat-${index + 1}`;
    players.set(id, { id, name: playerLabel(seat, index) });
  });

  state.history
    .filter((record) => record.date === state.selectedDate)
    .forEach((record) => {
      record.results.forEach((result) => {
        const id = result.id || result.name;
        players.set(id, { id, name: result.name });
      });
    });

  state.corrections
    .filter((correction) => correction.date === state.selectedDate)
    .forEach((correction) => {
      correction.items.forEach((item) => {
        const id = item.id || item.name;
        players.set(id, { id, name: item.name });
      });
    });

  return [...players.values()];
}

function renderCorrections() {
  const players = correctionPlayers();
  correctionList.innerHTML = "";

  players.forEach((player) => {
    const row = document.createElement("label");
    row.className = "correction-row";
    row.dataset.playerId = player.id;
    row.dataset.playerName = player.name;

    const name = document.createElement("span");
    name.textContent = player.name;

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.1";
    input.value = "0";
    input.addEventListener("input", updateCorrectionTotal);

    row.append(name, input);
    correctionList.append(row);
  });

  updateCorrectionTotal();
}

function currentCorrectionItems() {
  return [...correctionList.querySelectorAll(".correction-row")]
    .map((row) => ({
      id: row.dataset.playerId,
      name: row.dataset.playerName,
      point: Number(row.querySelector("input").value || 0),
    }))
    .filter((item) => item.point !== 0);
}

function updateCorrectionTotal() {
  const total = currentCorrectionItems().reduce((sum, item) => sum + item.point, 0);
  correctionTotal.textContent = `${labels.correctionTotal} ${formatPoint(total)}`;
  correctionTotal.classList.toggle("invalid", Math.round(total * 10) !== 0);
}

function renderSummary() {
  const summary = buildSummary();
  summaryList.innerHTML = "";
  const selectedGames = state.history.filter((record) => record.date === state.selectedDate).length;
  gameCount.textContent = `${labels.selectedDayTotal} ${selectedGames}${labels.hanchan}`;

  summary.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "summary-row";

    const rank = document.createElement("span");
    rank.textContent = `${index + 1}${labels.rank}`;

    const name = document.createElement("strong");
    name.textContent = player.name;

    const meta = document.createElement("small");
    meta.textContent = `${player.games}${labels.hanchan} / ${labels.top} ${player.top}回`;

    const output = document.createElement("output");
    output.textContent = formatPoint(player.total);

    row.append(rank, name, meta, output);
    summaryList.append(row);
  });

  emptySummary.classList.toggle("hidden", summary.length > 0);
}

function seatsFromRecord(record) {
  if (record.seats?.length) {
    return clone(record.seats);
  }

  return [...record.results]
    .sort((a, b) => (a.originalIndex ?? a.rank) - (b.originalIndex ?? b.rank))
    .map((result, index) => ({
      playerId: result.id || `p${index + 1}`,
      name: result.name,
      score: result.score,
    }));
}

function editRecord(recordId) {
  const record = state.history.find((item) => item.id === recordId);

  if (!record) {
    return;
  }

  editingRecordId = record.id;
  state.format = record.format || state.format;
  state.tableSize = record.tableSize || state.tableSize;
  state.participantCount = record.participantCount || state.participantCount;
  state.selectedDate = record.date || state.selectedDate;
  state.calendarMonth = state.selectedDate.slice(0, 7);
  state.startScore = record.settings?.startScore ?? state.startScore;
  state.returnScore = record.settings?.returnScore ?? state.returnScore;
  state.depositSticks = record.settings?.depositSticks ?? 0;
  state.uma[state.tableSize] = [...(record.settings?.uma || state.uma[state.tableSize])];
  state.rules = { ...clone(defaultState).rules, ...(record.rules || {}) };
  state.roster = record.roster?.length ? clone(record.roster) : state.roster;
  state.seats = seatsFromRecord(record);

  if (record.memo) {
    state.dateNotes[state.selectedDate] = record.memo;
  }

  renderAll();
  document.querySelector(".entry-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteRecord(recordId) {
  if (!confirm("この半荘記録を削除しますか？")) {
    return;
  }

  state.history = state.history.filter((record) => record.id !== recordId);

  if (editingRecordId === recordId) {
    editingRecordId = null;
  }

  renderAll();
}

function renderEditState() {
  saveButton.textContent = editingRecordId ? labels.updateGame : labels.saveGame;
  cancelEditButton.classList.toggle("hidden", !editingRecordId);
}

function renderHistory() {
  historyList.innerHTML = "";

  state.history.forEach((record) => {
    const item = document.createElement("li");
    item.className = "history-item";
    const rows = record.results
      .map((result) => `${result.rank}${labels.rank} ${result.name} ${formatPoint(result.point)}`)
      .join(" / ");
    const rules = record.rules?.names?.length ? ` [${record.rules.names.join(" / ")}]` : "";

    const text = document.createElement("span");
    text.textContent = `${record.date} ${record.tableSize}麻 ${record.createdAt}${rules} - ${rows}`;

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const editButton = document.createElement("button");
    editButton.className = "ghost-button small-button";
    editButton.type = "button";
    editButton.textContent = labels.edit;
    editButton.addEventListener("click", () => editRecord(record.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "danger-button small-button";
    deleteButton.type = "button";
    deleteButton.textContent = labels.delete;
    deleteButton.addEventListener("click", () => deleteRecord(record.id));

    actions.append(editButton, deleteButton);
    item.append(text, actions);
    historyList.append(item);
  });

  state.corrections.forEach((correction) => {
    const item = document.createElement("li");
    item.className = "history-item correction-history";
    const rows = correction.items
      .map((entry) => `${entry.name} ${formatPoint(entry.point)}`)
      .join(" / ");
    const note = correction.note ? ` (${correction.note})` : "";
    item.textContent = `${correction.date} ${labels.correction} ${correction.createdAt}${note} - ${rows}`;
    historyList.append(item);
  });

  emptyHistory.classList.toggle("hidden", state.history.length + state.corrections.length > 0);
}

function renderAll() {
  ensureStateShape();
  renderSettings();
  renderDayTools();
  renderRules();
  renderRoster();
  renderSeats();
  renderUma();
  renderResults();
  renderSummary();
  renderCorrections();
  renderHistory();
  renderEditState();
  saveState();
}

function showStartupError(error) {
  const panel = document.querySelector(".entry-panel") || document.body;
  const message = document.createElement("p");
  message.className = "validation-message visible";
  message.textContent = `起動エラー: ${error?.message || error}`;
  panel.prepend(message);
}

function exportJson() {
  const filename = `${labels.exportPrefix}-${state.selectedDate}.json`;
  downloadText(filename, JSON.stringify(exportedState(), null, 2), "application/json");
}

function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = normalizeImportedState(JSON.parse(reader.result));

      if (!confirm("現在のデータを読み込んだデータで置き換えますか？")) {
        return;
      }

      state = imported;
      editingRecordId = null;
      renderAll();
    } catch {
      alert("読み込めないJSONファイルです。");
    } finally {
      importJsonInput.value = "";
    }
  });
  reader.readAsText(file);
}

function exportSelectedDayCsv() {
  const rows = [["date", "rank", "name", "games", "top", "point"]];
  buildSummary().forEach((player, index) => {
    rows.push([
      state.selectedDate,
      index + 1,
      player.name,
      player.games,
      player.top,
      Math.round(player.total * 10) / 10,
    ]);
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadText(`${labels.exportPrefix}-${state.selectedDate}.csv`, csv, "text/csv;charset=utf-8");
}

function updateTableDefaults() {
  if (state.tableSize === 4) {
    state.startScore = 25000;
    state.returnScore = 30000;
  } else {
    state.startScore = 35000;
    state.returnScore = 40000;
  }

  state.depositSticks = 0;
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

recordDateInput.addEventListener("input", () => {
  state.selectedDate = recordDateInput.value || todayKey();
  state.calendarMonth = state.selectedDate.slice(0, 7);
  renderAll();
});

dayNoteInput.addEventListener("input", () => {
  state.dateNotes[state.selectedDate] = dayNoteInput.value.trim();
  renderCalendar();
  saveState();
});

prevMonthButton.addEventListener("click", () => {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  state.calendarMonth = monthKey(date);
  renderCalendar();
  saveState();
});

nextMonthButton.addEventListener("click", () => {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const date = new Date(year, month, 1);
  state.calendarMonth = monthKey(date);
  renderCalendar();
  saveState();
});

ruleChecks.forEach((input) => {
  input.addEventListener("change", () => {
    state.rules[input.dataset.rule] = input.checked;
    renderRules();
    saveState();
  });
});

ruleNoteInput.addEventListener("input", () => {
  state.rules.note = ruleNoteInput.value.trim();
  renderRules();
  saveState();
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

depositSticksInput.addEventListener("input", () => {
  state.depositSticks = Number(depositSticksInput.value || 0);
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

  if (!validateCurrentGame(results)) {
    renderResults();
    return;
  }

  const record = currentRecord(results);

  if (editingRecordId) {
    state.history = state.history.map((item) => (item.id === editingRecordId ? record : item));
    editingRecordId = null;
  } else {
    state.history.unshift(record);
  }

  state.history = state.history.slice(0, 100);
  renderCalendar();
  renderSummary();
  renderCorrections();
  renderHistory();
  renderEditState();
  saveState();
});

cancelEditButton.addEventListener("click", () => {
  editingRecordId = null;
  renderEditState();
});

exportJsonButton.addEventListener("click", exportJson);

importJsonInput.addEventListener("change", () => {
  const [file] = importJsonInput.files;

  if (file) {
    importJson(file);
  }
});

exportCsvButton.addEventListener("click", exportSelectedDayCsv);

saveCorrectionButton.addEventListener("click", () => {
  const items = currentCorrectionItems();
  const total = items.reduce((sum, item) => sum + item.point, 0);

  if (!items.length) {
    alert("修正ポイントを入力してください。");
    return;
  }

  if (Math.round(total * 10) !== 0) {
    alert("修正合計が0.0になるように入力してください。");
    return;
  }

  state.corrections.unshift({
    date: state.selectedDate,
    createdAt: new Date().toLocaleString("ja-JP"),
    note: correctionNoteInput.value.trim(),
    items,
  });
  correctionNoteInput.value = "";
  renderSummary();
  renderCorrections();
  renderHistory();
  saveState();
});

clearHistoryButton.addEventListener("click", () => {
  if (!confirm("記録をすべて削除しますか？")) {
    return;
  }

  state.history = [];
  state.corrections = [];
  editingRecordId = null;
  renderCalendar();
  renderSummary();
  renderCorrections();
  renderHistory();
  renderEditState();
  saveState();
});

resetButton.addEventListener("click", () => {
  if (!confirm("設定と入力内容を初期化しますか？")) {
    return;
  }

  state = clone(defaultState);
  editingRecordId = null;
  renderAll();
});

try {
  renderAll();
} catch (error) {
  showStartupError(error);
  throw error;
}
})();
