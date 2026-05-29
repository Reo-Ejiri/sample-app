const {
  activeSeats: getActiveSeats,
  automaticOka: getAutomaticOka,
  calculateResults: getCalculatedResults,
  depositPoint: getDepositPoint,
  expectedScoreTotal: getExpectedScoreTotal,
  formatPoint: formatPointValue,
  formatScore: formatScoreValue,
  gameTotals,
  playerLabel: getPlayerLabel,
} = window.MahjongCalculator;

const labels = {
  player: "\u30d7\u30ec\u30a4\u30e4\u30fc",
  participant: "\u53c2\u52a0\u8005",
  normalName: "\u540d\u524d",
  finalScore: "\u6700\u7d42\u6301\u3061\u70b9",
  seat: "\u4eba\u76ee",
  rank: "\u4f4d",
  points: "\u70b9",
  base: "\u7d20\u70b9",
  uma: "\u30a6\u30de",
  oka: "\u30aa\u30ab",
  deposit: "\u4f9b\u8a17",
  total: "\u5408\u8a08",
  inputTotal: "\u5165\u529b\u5408\u8a08",
  expected: "\u57fa\u6e96",
  hanchan: "\u534a\u8358",
  top: "1\u7740",
  standardRules: "\u6a19\u6e96\u30eb\u30fc\u30eb",
  selectedDayTotal: "\u9078\u629e\u65e5\u306e\u5408\u8a08",
  correctionTotal: "\u4fee\u6b63\u5408\u8a08",
  correction: "\u4fee\u6b63",
  edit: "\u7de8\u96c6",
  delete: "\u524a\u9664",
  saveGame: "\u3053\u306e\u534a\u8358\u3092\u8a18\u9332",
  updateGame: "\u7de8\u96c6\u5185\u5bb9\u3092\u4fdd\u5b58",
  exportPrefix: "\u9ebb\u96c0\u6210\u7e3e",
};

const ruleNames = {
  allRed: "\u5168\u8d64",
  chips: "\u30c1\u30c3\u30d7\u3042\u308a",
  abortiveDraw: "\u9014\u4e2d\u6d41\u5c40\u3042\u308a",
  pao: "\u30d1\u30aa\u3042\u308a",
  doubleRon: "\u30c0\u30d6\u30ed\u30f3\u3042\u308a",
  openTanyao: "\u98df\u3044\u30bf\u30f3\u3042\u308a",
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
      rules: { ...clone(defaultState).rules, ...parsed.rules },
      dateNotes: { ...clone(defaultState).dateNotes, ...parsed.dateNotes },
      corrections: parsed.corrections || [],
    };
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
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

  if (!state.selectedDate) {
    state.selectedDate = todayKey();
  }

  if (!state.calendarMonth) {
    state.calendarMonth = state.selectedDate.slice(0, 7);
  }

  state.history.forEach((record) => {
    if (!record.id) {
      record.id = crypto.randomUUID();
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

function activeRuleNames(rules = state.rules) {
  const names = Object.entries(ruleNames)
    .filter(([key]) => rules[key])
    .map(([, name]) => name);

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
  const totals = gameTotals(state, activeSeats(), results);

  scoreTotal.textContent = `${labels.inputTotal} ${formatScore(totals.scoreSum)} / ${
    labels.expected
  } ${formatScore(totals.expectedScore)}`;
  pointTotal.textContent = `${labels.total} ${formatPoint(totals.pointSum)}`;
  scoreTotal.classList.toggle("invalid", !totals.scoreValid);
  pointTotal.classList.toggle("invalid", !totals.pointValid);
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

function validateCurrentGame(results = calculateResults()) {
  const totals = gameTotals(state, activeSeats(), results);

  if (!totals.scoreValid) {
    alert(
      `\u6700\u7d42\u6301\u3061\u70b9\u306e\u5408\u8a08\u304c\u5408\u3063\u3066\u3044\u307e\u305b\u3093\u3002\n\u5165\u529b\u5408\u8a08: ${formatScore(
        totals.scoreSum
      )}\n\u57fa\u6e96: ${formatScore(totals.expectedScore)}`
    );
    return false;
  }

  if (!totals.pointValid) {
    alert(
      `\u30dd\u30a4\u30f3\u30c8\u5408\u8a08\u304c0.0\u306b\u306a\u3063\u3066\u3044\u307e\u305b\u3093\u3002\n\u5408\u8a08: ${formatPoint(
        totals.pointSum
      )}\n\u9806\u4f4d\u30a6\u30de\u306e\u5408\u8a08\u3082\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002`
    );
    return false;
  }

  return true;
}

function currentRecord(results) {
  return {
    id: editingRecordId || crypto.randomUUID(),
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
    meta.textContent = `${player.games}${labels.hanchan} / ${labels.top} ${player.top}\u56de`;

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
  if (!confirm("\u3053\u306e\u534a\u8358\u8a18\u9332\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f")) {
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
    text.textContent = `${record.date} ${record.tableSize}\u9ebb ${record.createdAt}${rules} - ${rows}`;

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

function exportJson() {
  const filename = `${labels.exportPrefix}-${state.selectedDate}.json`;
  downloadText(filename, JSON.stringify(exportedState(), null, 2), "application/json");
}

function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = normalizeImportedState(JSON.parse(reader.result));

      if (!confirm("\u73fe\u5728\u306e\u30c7\u30fc\u30bf\u3092\u8aad\u307f\u8fbc\u3093\u3060\u30c7\u30fc\u30bf\u3067\u7f6e\u304d\u63db\u3048\u307e\u3059\u304b\uff1f")) {
        return;
      }

      state = imported;
      editingRecordId = null;
      renderAll();
    } catch {
      alert("\u8aad\u307f\u8fbc\u3081\u306a\u3044JSON\u30d5\u30a1\u30a4\u30eb\u3067\u3059\u3002");
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
    alert("\u5927\u4f1a\u30e2\u30fc\u30c9\u3067\u306f\u540c\u3058\u53c2\u52a0\u8005\u3092\u540c\u3058\u534a\u8358\u306b\u91cd\u8907\u3057\u3066\u5165\u308c\u3089\u308c\u307e\u305b\u3093\u3002");
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
    alert("\u4fee\u6b63\u30dd\u30a4\u30f3\u30c8\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
    return;
  }

  if (Math.round(total * 10) !== 0) {
    alert("\u4fee\u6b63\u5408\u8a08\u304c0.0\u306b\u306a\u308b\u3088\u3046\u306b\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
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
  if (!confirm("\u8a18\u9332\u3092\u3059\u3079\u3066\u524a\u9664\u3057\u307e\u3059\u304b\uff1f")) {
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
  if (!confirm("\u8a2d\u5b9a\u3068\u5165\u529b\u5185\u5bb9\u3092\u521d\u671f\u5316\u3057\u307e\u3059\u304b\uff1f")) {
    return;
  }

  state = clone(defaultState);
  editingRecordId = null;
  renderAll();
});

renderAll();
