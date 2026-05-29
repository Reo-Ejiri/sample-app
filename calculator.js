function activeSeats(state) {
  return state.seats.slice(0, state.tableSize);
}

function automaticOka(state) {
  return ((Number(state.returnScore) - Number(state.startScore)) * state.tableSize) / 1000;
}

function depositPoint(state) {
  return Number(state.depositSticks || 0);
}

function expectedScoreTotal(state) {
  return Number(state.startScore || 0) * state.tableSize - Number(state.depositSticks || 0) * 1000;
}

function formatScore(value) {
  return Number(value || 0).toLocaleString("ja-JP");
}

function formatPoint(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

function playerLabel(state, labels, seat, index) {
  if (state.format === "tournament") {
    const player = state.roster.find((item) => item.id === seat.playerId);
    return player?.name || `${labels.participant}${index + 1}`;
  }

  return seat.name || `${labels.player}${index + 1}`;
}

function calculateResults(state, labels) {
  const ranked = activeSeats(state)
    .map((seat, index) => ({
      id: state.format === "tournament" ? seat.playerId : seat.name || `player-${index + 1}`,
      originalIndex: index,
      name: playerLabel(state, labels, seat, index),
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
    const oka = rank === 1 ? automaticOka(state) : 0;
    const deposit = rank === 1 ? depositPoint(state) : 0;

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
}

function gameTotals(state, seats, results) {
  const scoreSum = seats.reduce((sum, seat) => sum + Number(seat.score || 0), 0);
  const expectedScore = expectedScoreTotal(state);
  const pointSum = results.reduce((sum, result) => sum + result.point, 0);

  return {
    scoreSum,
    expectedScore,
    pointSum,
    scoreValid: scoreSum === expectedScore,
    pointValid: Math.round(pointSum * 10) === 0,
  };
}

window.MahjongCalculator = {
  activeSeats,
  automaticOka,
  calculateResults,
  depositPoint,
  expectedScoreTotal,
  formatPoint,
  formatScore,
  gameTotals,
  playerLabel,
};
