const STORAGE_KEY = 'finance-forge-state-v1';

const DEFAULT_STATE = {
  income: 0,
  goal: 0,
  emergencyBalance: 0,
  expenses: [],
  debts: [],
  investment: {
    starting: 1000,
    contribution: 300,
    rate: 6,
    years: 10,
    schedule: []
  },
  settings: {
    projectionGrowth: 0,
    emergencyMonths: 3,
    extraPayment: 0
  }
};

let state = loadState();

const expenseForm = document.getElementById('expenseForm');
const incomeInput = document.getElementById('incomeInput');
const goalInput = document.getElementById('goalInput');
const emergencyBalanceInput = document.getElementById('emergencyBalanceInput');
const expenseTableBody = document.getElementById('expenseTableBody');
const loadSampleButton = document.getElementById('loadSample');
const resetButton = document.getElementById('resetData');
const projectionGrowthInput = document.getElementById('projectionGrowth');
const projectionChart = document.getElementById('projectionChart');
const categoryBreakdown = document.getElementById('categoryBreakdown');
const ratioCheck = document.getElementById('ratioCheck');
const cashflowNotes = document.getElementById('cashflowNotes');
const insightFeed = document.getElementById('insightFeed');
const goalProgress = document.getElementById('goalProgress');
const goalPercent = document.getElementById('goalPercent');
const progressIndicator = document.getElementById('progressIndicator');
const goalTimeline = document.getElementById('goalTimeline');
const statIncome = document.getElementById('statIncome');
const statExpenses = document.getElementById('statExpenses');
const statSavings = document.getElementById('statSavings');
const statRunway = document.getElementById('statRunway');
const statNote = document.getElementById('statNote');
const cashflowRangeInput = document.getElementById('emergencyMonths');
const emergencyMonthValue = document.getElementById('emergencyMonthValue');
const emergencySummary = document.getElementById('emergencySummary');
const scenarioSummary = document.getElementById('scenarioSummary');
const debtForm = document.getElementById('debtForm');
const debtTableBody = document.getElementById('debtTableBody');
const extraPaymentInput = document.getElementById('extraPayment');
const debtSummary = document.getElementById('debtSummary');
const investmentForm = document.getElementById('investmentForm');
const investmentSummary = document.getElementById('investmentSummary');
const investmentTableBody = document.getElementById('investmentTableBody');
const investStartingInput = document.getElementById('investStarting');
const investContributionInput = document.getElementById('investContribution');
const investRateInput = document.getElementById('investRate');
const investYearsInput = document.getElementById('investYears');

init();

function init() {
  if (!state.investment.schedule.length) {
    state.investment = {
      ...state.investment,
      ...runInvestmentProjection(
        state.investment.starting,
        state.investment.contribution,
        state.investment.rate,
        state.investment.years
      )
    };
  }

  incomeInput.value = toInputValue(state.income);
  goalInput.value = toInputValue(state.goal);
  emergencyBalanceInput.value = toInputValue(state.emergencyBalance);
  projectionGrowthInput.value = toInputValue(state.settings.projectionGrowth);
  cashflowRangeInput.value = state.settings.emergencyMonths;
  emergencyMonthValue.textContent = state.settings.emergencyMonths;
  extraPaymentInput.value = toInputValue(state.settings.extraPayment);

  investStartingInput.value = toInputValue(state.investment.starting);
  investContributionInput.value = toInputValue(state.investment.contribution);
  investRateInput.value = toInputValue(state.investment.rate);
  investYearsInput.value = toInputValue(state.investment.years);

  attachEvents();
  updateWorkspace();
}

function attachEvents() {
  incomeInput.addEventListener('input', () => {
    state.income = parseNumber(incomeInput.value);
    persist();
    updateWorkspace();
  });

  goalInput.addEventListener('input', () => {
    state.goal = parseNumber(goalInput.value);
    persist();
    updateWorkspace();
  });

  emergencyBalanceInput.addEventListener('input', () => {
    state.emergencyBalance = parseNumber(emergencyBalanceInput.value);
    persist();
    updateWorkspace();
  });

  projectionGrowthInput.addEventListener('input', () => {
    state.settings.projectionGrowth = parseNumber(projectionGrowthInput.value);
    persist();
    renderProjection();
    updateInsights();
  });

  cashflowRangeInput.addEventListener('input', () => {
    state.settings.emergencyMonths = Number(cashflowRangeInput.value);
    emergencyMonthValue.textContent = state.settings.emergencyMonths;
    persist();
    updateSafetyNet();
    updateInsights();
  });

  expenseForm.addEventListener('submit', handleExpenseSubmit);
  loadSampleButton.addEventListener('click', handleLoadSample);
  resetButton.addEventListener('click', handleReset);
  debtForm.addEventListener('submit', handleDebtSubmit);
  extraPaymentInput.addEventListener('input', () => {
    state.settings.extraPayment = parseNumber(extraPaymentInput.value);
    persist();
    updateDebtLab();
    updateInsights();
  });

  investmentForm.addEventListener('submit', handleInvestmentSubmit);
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('expenseName').value.trim();
  const category = document.getElementById('expenseCategory').value;
  const amount = parseNumber(document.getElementById('expenseAmount').value);
  const frequency = document.getElementById('expenseFrequency').value;

  if (!name || amount <= 0) return;

  const expense = {
    id: createId(),
    name,
    category,
    amount,
    frequency,
    monthly: convertToMonthly(amount, frequency),
    createdAt: Date.now()
  };

  state.expenses.push(expense);
  persist();
  expenseForm.reset();
  updateWorkspace();
}

function handleDebtSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('debtName').value.trim();
  const balance = parseNumber(document.getElementById('debtBalance').value);
  const rate = parseNumber(document.getElementById('debtRate').value);
  const payment = parseNumber(document.getElementById('debtPayment').value);

  if (!name || balance <= 0 || payment <= 0) return;

  state.debts.push({
    id: createId(),
    name,
    balance,
    rate,
    payment
  });

  persist();
  debtForm.reset();
  updateWorkspace();
}

function handleInvestmentSubmit(event) {
  event.preventDefault();
  const starting = parseNumber(investStartingInput.value);
  const contribution = parseNumber(investContributionInput.value);
  const rate = parseNumber(investRateInput.value);
  const years = Number(investYearsInput.value) || 1;

  state.investment.starting = starting;
  state.investment.contribution = contribution;
  state.investment.rate = rate;
  state.investment.years = years;
  state.investment = {
    ...state.investment,
    ...runInvestmentProjection(starting, contribution, rate, years)
  };

  persist();
  updateInvestmentLab();
  updateInsights();
}

function handleLoadSample() {
  state = {
    income: 5400,
    goal: 12000,
    emergencyBalance: 4800,
    expenses: [
      { id: createId(), name: 'Rent', category: 'Housing', amount: 1850, frequency: 'monthly', monthly: 1850 },
      { id: createId(), name: 'Groceries', category: 'Food', amount: 150, frequency: 'weekly', monthly: convertToMonthly(150, 'weekly') },
      { id: createId(), name: 'Utilities', category: 'Utilities', amount: 210, frequency: 'monthly', monthly: 210 },
      { id: createId(), name: 'Transit pass', category: 'Transportation', amount: 90, frequency: 'monthly', monthly: 90 },
      { id: createId(), name: 'Streaming bundle', category: 'Lifestyle', amount: 45, frequency: 'monthly', monthly: 45 },
      { id: createId(), name: 'Retirement contribution', category: 'Savings', amount: 400, frequency: 'monthly', monthly: 400 },
      { id: createId(), name: 'Gym', category: 'Health', amount: 28, frequency: 'biweekly', monthly: convertToMonthly(28, 'biweekly') }
    ],
    debts: [
      { id: createId(), name: 'Auto loan', balance: 9200, rate: 4.1, payment: 285 },
      { id: createId(), name: 'Student loan', balance: 14250, rate: 5.2, payment: 180 },
      { id: createId(), name: 'Credit card', balance: 3200, rate: 17.9, payment: 120 }
    ],
    investment: {
      starting: 8000,
      contribution: 450,
      rate: 7,
      years: 12,
      ...runInvestmentProjection(8000, 450, 7, 12)
    },
    settings: {
      projectionGrowth: 3,
      emergencyMonths: 5,
      extraPayment: 150
    }
  };

  syncInputs();
  persist();
  updateWorkspace();
}

function handleReset() {
  state = deepClone(DEFAULT_STATE);
  syncInputs();
  persist();
  updateWorkspace();
}

function syncInputs() {
  incomeInput.value = toInputValue(state.income);
  goalInput.value = toInputValue(state.goal);
  emergencyBalanceInput.value = toInputValue(state.emergencyBalance);
  projectionGrowthInput.value = toInputValue(state.settings.projectionGrowth);
  cashflowRangeInput.value = state.settings.emergencyMonths;
  emergencyMonthValue.textContent = state.settings.emergencyMonths;
  extraPaymentInput.value = toInputValue(state.settings.extraPayment);

  investStartingInput.value = toInputValue(state.investment.starting);
  investContributionInput.value = toInputValue(state.investment.contribution);
  investRateInput.value = toInputValue(state.investment.rate);
  investYearsInput.value = toInputValue(state.investment.years);
}

function updateWorkspace() {
  updateBudgetStudio();
  updateDashboard();
  updateProjection();
  updateSafetyNet();
  updateDebtLab();
  updateInvestmentLab();
  updateInsights();
}

function updateBudgetStudio() {
  renderExpenses();
  renderCategoryBreakdown();
  updateRatioCheck();
  updateCashflowNotes();
  updateGoalProgress();
}

function updateDashboard() {
  const { totalExpenses } = computeExpenseTotals();
  const projectedSavings = calculateProjectedSavings();
  statIncome.textContent = formatCurrency(state.income);
  statExpenses.textContent = formatCurrency(totalExpenses);
  statSavings.textContent = formatCurrency(projectedSavings);

  const essential = calculateEssentialSpending();
  const runway = essential > 0 ? state.emergencyBalance / essential : 0;
  statRunway.textContent = `${runway > 0 ? runway.toFixed(1) : '0'} months`;

  if (projectedSavings < 0) {
    statNote.textContent = 'Spending exceeds income. Trim expenses or boost earnings to unlock savings.';
  } else if (projectedSavings === 0) {
    statNote.textContent = 'Every dollar is allocated. Add buffer for unexpected expenses or goals.';
  } else {
    statNote.textContent = 'Surplus available. Allocate it to savings, debt payoff, or investment goals.';
  }
}

function updateProjection() {
  renderProjection();
}

function renderProjection() {
  const projectedSavings = Math.max(0, calculateProjectedSavings());
  const growthRate = state.settings.projectionGrowth;
  const bars = buildProjectionSeries(projectedSavings, growthRate);
  projectionChart.replaceChildren();

  if (!bars.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Add income and expenses to simulate savings momentum.';
    empty.className = 'muted';
    projectionChart.append(empty);
    return;
  }

  const max = Math.max(...bars.map((b) => b.value));

  bars.forEach((bar) => {
    const el = document.createElement('div');
    el.className = 'projection-bar';
    const height = max ? Math.max(8, (bar.value / max) * 100) : 0;
    el.style.height = `${height}%`;
    el.dataset.month = bar.label;
    const span = document.createElement('span');
    span.textContent = formatCompactCurrency(bar.value);
    el.append(span);
    projectionChart.append(el);
  });
}

function updateSafetyNet() {
  updateEmergencySummary();
  updateScenarioSummary();
}

function updateEmergencySummary() {
  const essential = calculateEssentialSpending();
  const months = state.settings.emergencyMonths;
  const target = essential * months;
  const balance = state.emergencyBalance;
  const projectedSavings = calculateProjectedSavings();
  const deficit = Math.max(0, target - balance);
  const timeline = projectedSavings > 0 ? Math.ceil(deficit / projectedSavings) : null;

  emergencySummary.replaceChildren();

  const summary = document.createElement('div');
  summary.className = 'callout ' + (deficit <= 0 ? 'positive' : projectedSavings <= 0 ? 'negative' : 'warning');
  summary.innerHTML = `
    <strong>Target:</strong> ${formatCurrency(target)}<br>
    <strong>On hand:</strong> ${formatCurrency(balance)}<br>
    <strong>Gap:</strong> ${formatCurrency(deficit)}
  `;
  emergencySummary.append(summary);

  const note = document.createElement('p');
  if (deficit <= 0) {
    note.textContent = 'Emergency fund covers the selected runway. Consider investing additional surplus or raising the bar.';
  } else if (projectedSavings <= 0) {
    note.textContent = 'Savings are not increasing. Create surplus in your budget to build the emergency fund.';
  } else {
    note.textContent = `At the current savings pace it will take about ${formatMonths(timeline)} to close the gap.`;
  }
  emergencySummary.append(note);
}

function updateScenarioSummary() {
  scenarioSummary.replaceChildren();
  const { categoryTotals, totalExpenses } = computeExpenseTotals();
  if (totalExpenses === 0) {
    const p = document.createElement('p');
    p.textContent = 'Log expenses to compare your plan with the 50/30/20 guideline.';
    scenarioSummary.append(p);
    return;
  }

  const allocations = calculateAllocations(categoryTotals, totalExpenses);
  const callout = document.createElement('div');
  callout.className = 'callout ' + (allocations.wants <= 0.3 ? 'positive' : allocations.wants <= 0.45 ? 'warning' : 'negative');
  callout.innerHTML = `Needs ${Math.round(allocations.needs * 100)}% · Wants ${Math.round(allocations.wants * 100)}% · Savings ${Math.round(allocations.savings * 100)}%`;
  scenarioSummary.append(callout);

  const p = document.createElement('p');
  if (allocations.savings >= 0.2 && allocations.needs <= 0.5) {
    p.textContent = 'Spending aligns with the 50/30/20 rule—keep reinforcing savings habits to stay on track.';
  } else if (allocations.savings < 0.2) {
    p.textContent = 'Savings are under the 20% mark. Reassign some wants or boost income to accelerate progress.';
  } else if (allocations.needs > 0.5) {
    p.textContent = 'Essential costs exceed the 50% guideline. Investigate housing, utilities, or insurance for optimization opportunities.';
  } else {
    p.textContent = 'Use your surplus to bolster savings or pay down debt faster.';
  }
  scenarioSummary.append(p);
}

function updateDebtLab() {
  renderDebtTable();
  renderDebtSummary();
}

function renderDebtTable() {
  debtTableBody.replaceChildren();
  if (!state.debts.length) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.textContent = 'Add your liabilities to simulate the payoff path.';
    row.append(cell);
    debtTableBody.append(row);
    return;
  }

  const simulation = simulateDebtSnowball(state.debts, state.settings.extraPayment);

  state.debts.forEach((debt) => {
    const row = document.createElement('tr');
    const schedule = simulation.schedule.find((item) => item.id === debt.id);

    const payoff = schedule && schedule.payoffMonth ? formatMonths(schedule.payoffMonth) : simulation.stalled ? 'Stalled' : '—';
    const interest = schedule ? formatCurrency(schedule.interestPaid) : '$0';

    row.innerHTML = `
      <td>${debt.name}</td>
      <td>${formatCurrency(debt.balance)}</td>
      <td>${debt.rate.toFixed(2)}%</td>
      <td>${formatCurrency(debt.payment)}</td>
      <td>${payoff}</td>
      <td>${interest}</td>
    `;
    const action = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'table-action';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Delete ${debt.name}`);
    btn.textContent = '✕';
    btn.addEventListener('click', () => {
      state.debts = state.debts.filter((item) => item.id !== debt.id);
      persist();
      updateWorkspace();
    });
    action.append(btn);
    row.append(action);
    debtTableBody.append(row);
  });
}

function renderDebtSummary() {
  debtSummary.replaceChildren();
  if (!state.debts.length) {
    const p = document.createElement('p');
    p.textContent = 'Bring in auto, student, or credit lines to unlock the snowball simulator.';
    debtSummary.append(p);
    return;
  }

  const simulation = simulateDebtSnowball(state.debts, state.settings.extraPayment);
  const payoffMonths = simulation.months;
  const summary = document.createElement('div');
  if (simulation.stalled) {
    summary.className = 'callout negative';
    summary.innerHTML = 'Payments are too low to overcome interest. Increase minimums or extra payment to make progress.';
  } else {
    const payoffText = payoffMonths ? formatMonths(payoffMonths) : '—';
    summary.className = 'callout ' + (payoffMonths <= 36 ? 'positive' : payoffMonths <= 72 ? 'warning' : 'negative');
    summary.innerHTML = `Debt free in ${payoffText}<br>Total interest: ${formatCurrency(simulation.totalInterest)}`;
  }
  debtSummary.append(summary);

  const next = simulation.schedule.find((d) => d.balance > 0.01);
  const p = document.createElement('p');
  if (!next) {
    p.textContent = 'Everything is paid off—consider redirecting payments to investments or new goals.';
  } else if (simulation.stalled) {
    p.textContent = `${next.name} never shrinks under current payments. Boost the payment or negotiate a lower APR.`;
  } else {
    p.textContent = `${next.name} clears first. Add ${formatCurrency(state.settings.extraPayment)} extra each month to compress the timeline.`;
  }
  debtSummary.append(p);
}

function updateInvestmentLab() {
  renderInvestmentSummary();
  renderInvestmentTable();
}

function renderInvestmentSummary() {
  investmentSummary.replaceChildren();
  const { schedule, totalContribution, totalGrowth, finalBalance } = state.investment;
  if (!schedule || !schedule.length) {
    const p = document.createElement('p');
    p.textContent = 'Enter a starting balance, contribution, and time horizon to project growth.';
    investmentSummary.append(p);
    return;
  }

  const callout = document.createElement('div');
  callout.className = 'callout positive';
  callout.innerHTML = `Balance after ${schedule.length} years: ${formatCurrency(finalBalance)}`;
  investmentSummary.append(callout);

  const p = document.createElement('p');
  p.textContent = `Total contributed: ${formatCurrency(totalContribution)} · Growth earned: ${formatCurrency(totalGrowth)}`;
  investmentSummary.append(p);
}

function renderInvestmentTable() {
  investmentTableBody.replaceChildren();
  const { schedule } = state.investment;
  if (!schedule || !schedule.length) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Run a projection to populate results.';
    row.append(cell);
    investmentTableBody.append(row);
    return;
  }

  schedule.forEach((year) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>Year ${year.year}</td>
      <td>${formatCurrency(year.cumulativeContribution)}</td>
      <td>${formatCurrency(year.growth)}</td>
      <td>${formatCurrency(year.endBalance)}</td>
    `;
    investmentTableBody.append(row);
  });
}

function renderExpenses() {
  expenseTableBody.replaceChildren();

  if (!state.expenses.length) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No recurring expenses yet.';
    row.append(cell);
    expenseTableBody.append(row);
    return;
  }

  state.expenses
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((expense) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${expense.name}</td>
        <td>${expense.category}</td>
        <td>${formatFrequency(expense.frequency)}</td>
        <td>${formatCurrency(expense.monthly)}</td>
      `;
      const action = document.createElement('td');
      const btn = document.createElement('button');
      btn.className = 'table-action';
      btn.type = 'button';
      btn.setAttribute('aria-label', `Delete ${expense.name}`);
      btn.textContent = '✕';
      btn.addEventListener('click', () => {
        state.expenses = state.expenses.filter((item) => item.id !== expense.id);
        persist();
        updateWorkspace();
      });
      action.append(btn);
      row.append(action);
      expenseTableBody.append(row);
    });
}

function renderCategoryBreakdown() {
  categoryBreakdown.replaceChildren();
  const { categoryTotals, totalExpenses } = computeExpenseTotals();
  if (totalExpenses === 0) {
    const li = document.createElement('li');
    li.textContent = 'Add expenses to analyze how cash is distributed.';
    categoryBreakdown.append(li);
    return;
  }

  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([category, value]) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = category;
    const amount = document.createElement('span');
    amount.className = 'value';
    amount.textContent = `${formatCurrency(value)} · ${(value / totalExpenses * 100).toFixed(1)}%`;
    li.append(label, amount);
    categoryBreakdown.append(li);
  });
}

function updateRatioCheck() {
  ratioCheck.replaceChildren();
  const { categoryTotals, totalExpenses } = computeExpenseTotals();
  if (totalExpenses === 0) {
    const p = document.createElement('p');
    p.textContent = 'Track expenses to compare against the 50/30/20 rule.';
    ratioCheck.append(p);
    return;
  }

  const allocations = calculateAllocations(categoryTotals, totalExpenses);
  const card = document.createElement('div');
  const statusClass = allocations.savings >= 0.2 && allocations.needs <= 0.5 ? 'positive' : allocations.savings < 0.15 ? 'negative' : 'warning';
  card.className = `callout ${statusClass}`;
  card.innerHTML = `Savings ${Math.round(allocations.savings * 100)}% · Needs ${Math.round(allocations.needs * 100)}% · Wants ${Math.round(allocations.wants * 100)}%`;
  ratioCheck.append(card);

  const p = document.createElement('p');
  if (allocations.savings >= 0.2 && allocations.needs <= 0.5) {
    p.textContent = 'Strong balance between essentials, lifestyle, and future goals.';
  } else if (allocations.savings < 0.15) {
    p.textContent = 'Savings are trailing. Redirect part of your discretionary spending.';
  } else {
    p.textContent = 'Fine-tune needs vs wants to unlock additional savings power.';
  }
  ratioCheck.append(p);
}

function updateCashflowNotes() {
  cashflowNotes.replaceChildren();
  const { categoryTotals, totalExpenses } = computeExpenseTotals();
  const projectedSavings = calculateProjectedSavings();

  if (!state.expenses.length) {
    const p = document.createElement('p');
    p.textContent = 'Start logging recurring costs—categorize essentials first to build an accurate baseline.';
    cashflowNotes.append(p);
    return;
  }

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    const callout = document.createElement('div');
    callout.className = 'callout warning';
    callout.textContent = `${topCategory[0]} leads spending at ${formatCurrency(topCategory[1])}. Review this bucket for efficiency gains.`;
    cashflowNotes.append(callout);
  }

  const savingsNote = document.createElement('p');
  if (projectedSavings < 0) {
    savingsNote.textContent = 'Plan spends more than you bring in. Mark costs as negotiable or add income drivers.';
  } else if (projectedSavings === 0) {
    savingsNote.textContent = 'All income is spoken for. Consider scheduling a small automatic transfer to savings for resilience.';
  } else {
    savingsNote.textContent = `Projected surplus of ${formatCurrency(projectedSavings)} per month. Assign it across goals or the debt snowball.`;
  }
  cashflowNotes.append(savingsNote);

  const required = state.goal > 0 ? Math.max(0, state.goal - state.emergencyBalance) : 0;
  if (required > 0 && projectedSavings > 0) {
    const timeline = Math.ceil(required / projectedSavings);
    const p = document.createElement('p');
    p.textContent = `Keep the momentum—your savings goal is ${formatCurrency(state.goal)} and you could reach it in about ${formatMonths(timeline)}.`;
    cashflowNotes.append(p);
  }
}

function updateGoalProgress() {
  const goal = state.goal;
  const balance = state.emergencyBalance;
  if (!goal || goal <= 0) {
    goalProgress.hidden = true;
    return;
  }

  goalProgress.hidden = false;
  const percent = Math.min(100, (balance / goal) * 100 || 0);
  goalPercent.textContent = `${Math.round(percent)}%`;
  progressIndicator.style.width = `${percent}%`;
  progressIndicator.parentElement.setAttribute('aria-valuenow', Math.round(percent));

  const projectedSavings = calculateProjectedSavings();
  if (balance >= goal) {
    goalTimeline.textContent = 'Goal reached—redirect future savings to new priorities.';
  } else if (projectedSavings <= 0) {
    goalTimeline.textContent = 'Create surplus to accelerate progress toward this goal.';
  } else {
    const remaining = goal - balance;
    const months = Math.ceil(remaining / projectedSavings);
    goalTimeline.textContent = `Stay consistent for roughly ${formatMonths(months)} to reach ${formatCurrency(goal)}.`;
  }
}

function updateInsights() {
  insightFeed.replaceChildren();
  const insights = buildInsights();
  if (!insights.length) {
    const li = document.createElement('li');
    li.textContent = 'Add information to generate personalized observations.';
    insightFeed.append(li);
    return;
  }

  insights.forEach((insight) => {
    const li = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = insight.title;
    const body = document.createElement('span');
    body.textContent = insight.body;
    li.append(title, body);
    insightFeed.append(li);
  });
}

function buildInsights() {
  const insights = [];
  const projectedSavings = calculateProjectedSavings();
  const essential = calculateEssentialSpending();

  if (projectedSavings < 0) {
    insights.push({
      title: 'Budget deficit',
      body: 'Expenses exceed income. Target lifestyle costs for cuts or expand income streams to rebalance the plan.'
    });
  } else if (projectedSavings > 0) {
    insights.push({
      title: 'Deploy surplus',
      body: `Direct ${formatCurrency(projectedSavings)} of monthly surplus toward investments or debt acceleration.`
    });
  }

  const runway = essential > 0 ? state.emergencyBalance / essential : 0;
  if (runway < state.settings.emergencyMonths && essential > 0) {
    insights.push({
      title: 'Emergency runway short',
      body: `Emergency savings cover ${runway.toFixed(1)} months but you want ${state.settings.emergencyMonths}. Allocate surplus to close the gap.`
    });
  }

  if (state.debts.length) {
    const simulation = simulateDebtSnowball(state.debts, state.settings.extraPayment);
    if (simulation.stalled) {
      insights.push({
        title: 'Snowball stalled',
        body: 'Minimums and extra payments are not enough to reduce balances. Increase payments or lower interest rates.'
      });
    } else if (simulation.months) {
      const years = (simulation.months / 12).toFixed(1);
      insights.push({
        title: 'Debt freedom timeline',
        body: `Snowball strategy becomes debt free in ~${years} years with the current extra payment of ${formatCurrency(state.settings.extraPayment)}.`
      });
    }
    const highestRate = state.debts.slice().sort((a, b) => b.rate - a.rate)[0];
    if (highestRate && highestRate.rate > 12) {
      insights.push({
        title: 'High interest focus',
        body: `${highestRate.name} charges ${highestRate.rate.toFixed(1)}% APR. Consider a balance transfer or payoff blitz.`
      });
    }
  }

  if (state.investment.schedule && state.investment.schedule.length) {
    const final = state.investment.finalBalance;
    const years = state.investment.schedule.length;
    insights.push({
      title: 'Wealth trajectory',
      body: `Projected portfolio reaches ${formatCurrency(final)} in ${years} years under current assumptions.`
    });
  }

  return insights;
}

function simulateDebtSnowball(debts, extraPayment) {
  if (!debts.length) {
    return { schedule: [], months: 0, totalInterest: 0, stalled: false };
  }

  const schedule = debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: debt.balance,
    rate: debt.rate,
    payment: debt.payment,
    payoffMonth: null,
    interestPaid: 0
  }));

  schedule.sort((a, b) => a.balance - b.balance);

  let months = 0;
  let totalInterest = 0;

  while (schedule.some((debt) => debt.balance > 0.01) && months < 1200) {
    months += 1;

    schedule.forEach((debt) => {
      if (debt.balance <= 0) return;
      const monthlyRate = debt.rate > 0 ? debt.rate / 100 / 12 : 0;
      const interest = debt.balance * monthlyRate;
      debt.balance += interest;
      debt.interestPaid += interest;
      totalInterest += interest;
    });

    let extra = extraPayment;
    const active = schedule.filter((debt) => debt.balance > 0.01);

    active.forEach((debt, index) => {
      if (debt.balance <= 0) return;
      let payment = debt.payment;
      if (index === 0) {
        payment += extra;
        extra = 0;
      }
      if (payment <= 0) return;
      if (payment > debt.balance) {
        extra += payment - debt.balance;
        payment = debt.balance;
      }
      debt.balance -= payment;
      if (debt.balance <= 0.01) {
        debt.balance = 0;
        if (!debt.payoffMonth) debt.payoffMonth = months;
      }
    });

    while (extra > 0.01) {
      const next = schedule.find((debt) => debt.balance > 0.01);
      if (!next) break;
      const payment = Math.min(extra, next.balance);
      next.balance -= payment;
      if (next.balance <= 0.01) {
        next.balance = 0;
        if (!next.payoffMonth) next.payoffMonth = months;
      }
      extra -= payment;
    }
  }

  const stalled = schedule.some((debt) => debt.balance > 0.01);
  return { schedule, months, totalInterest, stalled };
}

function runInvestmentProjection(starting, monthlyContribution, annualRate, years) {
  const schedule = [];
  let balance = starting;
  let cumulativeContribution = starting;
  let totalGrowth = 0;

  for (let year = 1; year <= years; year += 1) {
    const contribution = monthlyContribution * 12;
    balance += contribution;
    cumulativeContribution += contribution;
    const growth = balance * (annualRate / 100);
    balance += growth;
    totalGrowth += growth;
    schedule.push({
      year,
      cumulativeContribution,
      growth,
      endBalance: balance
    });
  }

  return {
    schedule,
    totalContribution: cumulativeContribution,
    totalGrowth,
    finalBalance: balance
  };
}

function buildProjectionSeries(base, growthRate) {
  if (!base) return [];
  const series = [];
  let monthly = base;
  const growthFactor = 1 + growthRate / 100;

  for (let month = 1; month <= 12; month += 1) {
    if (month > 1 && (month - 1) % 3 === 0) {
      monthly *= growthFactor;
    }
    series.push({ value: monthly, label: `M${month}` });
  }

  return series;
}

function computeExpenseTotals() {
  const totals = { totalExpenses: 0, categoryTotals: {} };

  state.expenses.forEach((expense) => {
    const monthly = convertToMonthly(expense.amount, expense.frequency);
    expense.monthly = monthly;
    totals.totalExpenses += monthly;
    totals.categoryTotals[expense.category] = (totals.categoryTotals[expense.category] || 0) + monthly;
  });

  return totals;
}

function calculateProjectedSavings() {
  const { totalExpenses } = computeExpenseTotals();
  return state.income - totalExpenses;
}

function calculateEssentialSpending() {
  const essentials = new Set(['Housing', 'Utilities', 'Food', 'Transportation', 'Health', 'Debt']);
  const { categoryTotals } = computeExpenseTotals();
  return Object.entries(categoryTotals)
    .filter(([category]) => essentials.has(category))
    .reduce((sum, [, value]) => sum + value, 0);
}

function calculateAllocations(categoryTotals, totalExpenses) {
  const needCategories = new Set(['Housing', 'Utilities', 'Food', 'Transportation', 'Health', 'Debt']);
  const savingsCategories = new Set(['Savings', 'Savings & Investing']);

  let needs = 0;
  let savings = 0;

  Object.entries(categoryTotals).forEach(([category, value]) => {
    if (needCategories.has(category)) {
      needs += value;
    } else if (savingsCategories.has(category)) {
      savings += value;
    }
  });

  const wants = Math.max(0, totalExpenses - needs - savings);
  return {
    needs: needs / totalExpenses,
    wants: wants / totalExpenses,
    savings: savings / totalExpenses
  };
}

function formatCurrency(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function formatCompactCurrency(value) {
  if (!Number.isFinite(value)) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return formatCurrency(value);
}

function formatFrequency(frequency) {
  const mapping = {
    monthly: 'Monthly',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    daily: 'Daily',
    yearly: 'Yearly'
  };
  return mapping[frequency] || frequency;
}

function convertToMonthly(amount, frequency) {
  switch (frequency) {
    case 'weekly':
      return amount * 52 / 12;
    case 'biweekly':
      return amount * 26 / 12;
    case 'daily':
      return amount * 365 / 12;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

function parseNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInputValue(value) {
  return value ? Number(value).toString() : '';
}

function formatMonths(totalMonths) {
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) return '0 months';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  return parts.join(' ') || '0 months';
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...deepClone(DEFAULT_STATE),
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
      investment: { ...DEFAULT_STATE.investment, ...parsed.investment }
    };
  } catch (error) {
    console.warn('Failed to load state', error);
    return deepClone(DEFAULT_STATE);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
