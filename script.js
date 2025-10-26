const storageKey = 'budget-beacon-state';
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const frequencyToMonthly = {
  monthly: 1,
  weekly: 4.345,
  biweekly: 2.1725,
  daily: 30.42,
  yearly: 1 / 12,
};

const elements = {
  incomeInput: document.querySelector('#incomeInput'),
  goalInput: document.querySelector('#goalInput'),
  incomeDisplay: document.querySelector('#incomeDisplay'),
  incomeNote: document.querySelector('#incomeNote'),
  expensesDisplay: document.querySelector('#expensesDisplay'),
  expenseNote: document.querySelector('#expenseNote'),
  savingsDisplay: document.querySelector('#savingsDisplay'),
  savingsNote: document.querySelector('#savingsNote'),
  planForm: document.querySelector('#planForm'),
  expenseForm: document.querySelector('#expenseForm'),
  expenseName: document.querySelector('#expenseName'),
  expenseCategory: document.querySelector('#expenseCategory'),
  expenseAmount: document.querySelector('#expenseAmount'),
  expenseFrequency: document.querySelector('#expenseFrequency'),
  expenseTableBody: document.querySelector('#expenseTableBody'),
  categoryBreakdown: document.querySelector('#categoryBreakdown'),
  actionPlan: document.querySelector('#actionPlan'),
  ratioChecks: document.querySelector('#ratioChecks'),
  budgetRuleList: document.querySelector('#budgetRuleList'),
  goalProgress: document.querySelector('#goalProgress'),
  goalPercent: document.querySelector('#goalPercent'),
  progressBar: document.querySelector('#progressIndicator'),
  goalTimeline: document.querySelector('#goalTimeline'),
  addSampleButton: document.querySelector('#addSampleButton'),
  clearDataButton: document.querySelector('#clearDataButton'),
  annualOutlook: document.querySelector('#annualOutlook'),
  copySummaryButton: document.querySelector('#copySummaryButton'),
  copySummaryStatus: document.querySelector('#copySummaryStatus'),
};

const defaultState = {
  income: 0,
  goal: 0,
  expenses: [],
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { ...defaultState };
    const parsed = JSON.parse(saved);
    return {
      income: Number(parsed.income) || 0,
      goal: Number(parsed.goal) || 0,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    };
  } catch (error) {
    console.warn('Budget Beacon: unable to load saved data', error);
    return { ...defaultState };
  }
}

function persistState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function applyStateToInputs() {
  elements.incomeInput.value = state.income || '';
  elements.goalInput.value = state.goal || '';
}

function handlePlanInput(event) {
  const value = Number(event.target.value);
  if (event.target.id === 'incomeInput') {
    state.income = Number.isFinite(value) && value >= 0 ? value : 0;
  }
  if (event.target.id === 'goalInput') {
    state.goal = Number.isFinite(value) && value >= 0 ? value : 0;
  }
  persistState();
  updateView();
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  const name = elements.expenseName.value.trim();
  const category = elements.expenseCategory.value;
  const amount = Number(elements.expenseAmount.value);
  const frequency = elements.expenseFrequency.value;

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  state.expenses.push({ name, category, amount, frequency });
  persistState();
  elements.expenseForm.reset();
  updateView();
  elements.expenseName.focus();
}

function removeExpense(index) {
  state.expenses.splice(index, 1);
  persistState();
  updateView();
}

function formatFrequency(frequency) {
  const mapping = {
    monthly: 'Monthly',
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    daily: 'Daily',
    yearly: 'Yearly',
  };
  return mapping[frequency] || frequency;
}

function calculateMonthlyAmount(expense) {
  const multiplier = frequencyToMonthly[expense.frequency] || 1;
  return expense.amount * multiplier;
}

function formatPercentage(value) {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
}

function summarizeExpenses() {
  const totals = {
    overall: 0,
    categories: new Map(),
  };

  state.expenses.forEach((expense) => {
    const monthlyAmount = calculateMonthlyAmount(expense);
    totals.overall += monthlyAmount;

    const categoryTotal = totals.categories.get(expense.category) || 0;
    totals.categories.set(expense.category, categoryTotal + monthlyAmount);
  });

  return totals;
}

function renderExpensesTable() {
  const rows = state.expenses.map((expense, index) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = expense.name;

    const categoryCell = document.createElement('td');
    categoryCell.textContent = expense.category;

    const frequencyCell = document.createElement('td');
    frequencyCell.textContent = formatFrequency(expense.frequency);

    const amountCell = document.createElement('td');
    amountCell.textContent = currencyFormatter.format(calculateMonthlyAmount(expense));

    const actionCell = document.createElement('td');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-btn';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => removeExpense(index));
    actionCell.appendChild(removeButton);

    row.append(nameCell, categoryCell, frequencyCell, amountCell, actionCell);
    return row;
  });

  elements.expenseTableBody.innerHTML = '';
  if (rows.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'No expenses yet. Add your first recurring cost to see the breakdown.';
    emptyRow.appendChild(cell);
    elements.expenseTableBody.appendChild(emptyRow);
  } else {
    rows.forEach((row) => elements.expenseTableBody.appendChild(row));
  }
}

function renderCategoryBreakdown(expenseTotals, monthlyExpenses, monthlyIncome) {
  elements.categoryBreakdown.innerHTML = '';
  if (expenseTotals.categories.size === 0) {
    const item = document.createElement('li');
    item.textContent = 'Log expenses to populate this list.';
    elements.categoryBreakdown.appendChild(item);
    return;
  }

  const sortedCategories = Array.from(expenseTotals.categories.entries()).sort((a, b) => b[1] - a[1]);

  sortedCategories.forEach(([category, amount]) => {
    const percentage = monthlyExpenses > 0 ? (amount / monthlyExpenses) * 100 : 0;
    const incomeShare = monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0;
    const item = document.createElement('li');
    item.innerHTML = `<span>${category}</span> ${currencyFormatter.format(amount)} · ${percentage.toFixed(
      1,
    )}% of spending${monthlyIncome > 0 ? ` (${incomeShare.toFixed(1)}% of income)` : ''}`;
    elements.categoryBreakdown.appendChild(item);
  });
}

function buildActionPlan(monthlyIncome, monthlyExpenses, monthlySavings) {
  const plan = document.createElement('div');
  plan.className = 'action-plan';

  if (monthlyIncome === 0 && state.expenses.length === 0) {
    plan.innerHTML = '<p>Enter your income and expenses to see personalized guidance.</p>';
    return plan;
  }

  if (monthlyIncome === 0) {
    plan.innerHTML =
      '<p>Add your monthly take-home pay so we can compare against your expenses and give you a savings forecast.</p>';
    return plan;
  }

  if (state.expenses.length === 0) {
    plan.innerHTML =
      '<p>Your income is logged. Add regular bills, subscriptions, and goals to understand how much you can save.</p>';
    return plan;
  }

  const difference = monthlyIncome - monthlyExpenses;
  const status = document.createElement('p');
  status.innerHTML = difference >= 0
    ? `<strong>Great work!</strong> You are projected to save ${currencyFormatter.format(difference)} each month.`
    : `<strong>Heads up:</strong> you are overspending by ${currencyFormatter.format(Math.abs(difference))} each month.`;
  plan.appendChild(status);

  if (difference < 0) {
    const tipList = document.createElement('ul');
    tipList.className = 'ratio-list';
    const mostCostly = [...state.expenses]
      .map((expense) => ({ ...expense, monthly: calculateMonthlyAmount(expense) }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 3);
    tipList.innerHTML = mostCostly
      .map(
        (expense) =>
          `<li><strong>${expense.name}</strong> in ${expense.category} costs ${currencyFormatter.format(
            expense.monthly,
          )} each month. Consider trimming it by 10% to free up ${currencyFormatter.format(expense.monthly * 0.1)}.</li>`,
      )
      .join('');
    plan.appendChild(tipList);
  } else {
    const savingsIdeas = document.createElement('ul');
    savingsIdeas.className = 'ratio-list';
    savingsIdeas.innerHTML = `
      <li>Automate a transfer of <strong>${currencyFormatter.format(difference)}</strong> to savings on payday.</li>
      <li>Allocate at least 10% of your income to future-you. That is ${currencyFormatter.format(monthlyIncome * 0.1)}.</li>
      <li>Use the reset button once a month to revisit your plan and keep habits fresh.</li>
    `;
    plan.appendChild(savingsIdeas);
  }

  return plan;
}

function buildRatioChecks(monthlyIncome, expenseTotals) {
  elements.ratioChecks.innerHTML = '';
  if (monthlyIncome === 0 || expenseTotals.categories.size === 0) {
    elements.ratioChecks.innerHTML = '<li>We will compare your spending to common budgeting rules of thumb.</li>';
    return;
  }

  const housing = expenseTotals.categories.get('Housing') || 0;
  const food = expenseTotals.categories.get('Food') || 0;
  const utilities = expenseTotals.categories.get('Utilities') || 0;
  const debt = expenseTotals.categories.get('Debt') || 0;

  const housingPercent = (housing / monthlyIncome) * 100;
  const foodPercent = (food / monthlyIncome) * 100;
  const utilitiesPercent = (utilities / monthlyIncome) * 100;
  const debtPercent = (debt / monthlyIncome) * 100;

  const checks = [
    {
      label: 'Housing',
      percent: housingPercent,
      guidance: housingPercent <= 30
        ? 'Nice! Housing is within the recommended 30% of take-home pay.'
        : 'Aim to keep housing near 30%. Consider negotiating rent or refinancing.',
    },
    {
      label: 'Food',
      percent: foodPercent,
      guidance: foodPercent <= 15
        ? 'Your food spending is on track. Keep meal planning to stay consistent.'
        : 'Food costs over 15% can often be trimmed with meal planning or bulk buys.',
    },
    {
      label: 'Utilities',
      percent: utilitiesPercent,
      guidance:
        utilitiesPercent <= 10
          ? 'Utility costs are manageable. Keep monitoring seasonal spikes.'
          : 'Utilities above 10% may benefit from energy audits or switching providers.',
    },
    {
      label: 'Debt',
      percent: debtPercent,
      guidance:
        debtPercent <= 20
          ? 'Debt payments are within a healthy range.'
          : 'Consider the avalanche or snowball method to accelerate debt payoff.',
    },
  ];

  checks.forEach((check) => {
    const item = document.createElement('li');
    const statusColor = check.percent <= (check.label === 'Debt' ? 20 : check.label === 'Food' ? 15 : check.label === 'Utilities' ? 10 : 30)
      ? 'style="color: var(--accent);"'
      : 'style="color: var(--danger);"';
    item.innerHTML = `<strong>${check.label}</strong>: ${check.percent.toFixed(1)}% of income <span ${statusColor}>${check.guidance}</span>`;
    elements.ratioChecks.appendChild(item);
  });
}

function categorizeForBudgetRule(category) {
  const normalized = category.toLowerCase();
  if (['housing', 'utilities', 'food', 'transportation', 'health', 'debt'].includes(normalized)) return 'needs';
  if (['savings', 'savings & investing', 'investing'].includes(normalized)) return 'savings';
  return 'wants';
}

function calculateBudgetRuleActuals(expenseTotals) {
  const buckets = { needs: 0, wants: 0, savings: 0 };
  expenseTotals.categories.forEach((amount, category) => {
    const bucket = categorizeForBudgetRule(category);
    buckets[bucket] += amount;
  });
  return buckets;
}

function calculateBudgetRuleTargets(monthlyIncome) {
  return {
    needs: monthlyIncome * 0.5,
    wants: monthlyIncome * 0.3,
    savings: monthlyIncome * 0.2,
  };
}

function renderBudgetRuleCheckup(monthlyIncome, monthlyExpenses, expenseTotals) {
  if (!elements.budgetRuleList) return;
  elements.budgetRuleList.innerHTML = '';
  if (monthlyIncome === 0 || expenseTotals.categories.size === 0) {
    elements.budgetRuleList.innerHTML =
      '<li>Record expenses to see how your plan aligns with popular rules of thumb.</li>';
    return;
  }

  const targets = calculateBudgetRuleTargets(monthlyIncome);
  const actuals = calculateBudgetRuleActuals(expenseTotals);
  const savings = Math.max(monthlyIncome - monthlyExpenses, 0);
  actuals.savings = Math.max(actuals.savings, savings);

  const rows = [
    { label: 'Needs (50%)', key: 'needs', benchmark: targets.needs },
    { label: 'Wants (30%)', key: 'wants', benchmark: targets.wants },
    { label: 'Savings (20%)', key: 'savings', benchmark: targets.savings },
  ];

  rows.forEach((row) => {
    const actualAmount = actuals[row.key];
    const actualPercent = (actualAmount / monthlyIncome) * 100;
    const difference = actualAmount - row.benchmark;
    const status = difference <= 0 ? 'On track' : `Over by ${currencyFormatter.format(difference)}`;
    const statusColor = difference <= 0 ? 'var(--accent)' : 'var(--danger)';

    const item = document.createElement('li');
    item.innerHTML = `
      <strong>${row.label}</strong>: ${currencyFormatter.format(actualAmount)} (${formatPercentage(actualPercent)})
      <span style="color: ${statusColor}; font-weight: 600;">${status}</span>
    `;
    elements.budgetRuleList.appendChild(item);
  });
}

function calculateAnnualTotals(monthlyIncome, monthlyExpenses, monthlySavings) {
  const monthsPerYear = 12;
  return {
    income: monthlyIncome * monthsPerYear,
    expenses: monthlyExpenses * monthsPerYear,
    savings: monthlySavings * monthsPerYear,
  };
}

function renderAnnualOutlook(monthlyIncome, monthlyExpenses, monthlySavings) {
  if (!elements.annualOutlook) return;

  elements.annualOutlook.innerHTML = '';
  if (monthlyIncome === 0 && monthlyExpenses === 0) {
    elements.annualOutlook.innerHTML =
      '<p>As you add numbers we will project income, expenses, and savings for the year.</p>';
    return;
  }

  const annual = calculateAnnualTotals(monthlyIncome, monthlyExpenses, monthlySavings);
  const savingsRate = monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100).toFixed(1) : '0.0';
  const savingsIsPositive = monthlySavings >= 0;
  const savingsText = savingsIsPositive
    ? `<strong>${currencyFormatter.format(annual.savings)}</strong> could be saved at this pace (${savingsRate}% rate).`
    : `At the current pace you may overspend by <strong>${currencyFormatter.format(Math.abs(annual.savings))}</strong> this year.`;
  const summary = document.createElement('div');
  summary.innerHTML = `
    <p><strong>${currencyFormatter.format(annual.income)}</strong> projected take-home pay.</p>
    <p><strong>${currencyFormatter.format(annual.expenses)}</strong> planned toward recurring expenses.</p>
    <p>${savingsText}</p>
  `;
  elements.annualOutlook.appendChild(summary);
}

function generateSummaryReport(monthlyIncome, monthlyExpenses, monthlySavings, expenseTotals) {
  const lines = [];
  lines.push(`Monthly income: ${currencyFormatter.format(monthlyIncome)}`);
  lines.push(`Monthly expenses: ${currencyFormatter.format(monthlyExpenses)}`);
  lines.push(`Projected savings: ${currencyFormatter.format(monthlySavings)}`);

  if (state.goal) {
    const monthsToGoal = monthlySavings > 0 ? Math.ceil(state.goal / monthlySavings) : Infinity;
    lines.push(`Goal: ${currencyFormatter.format(state.goal)} (${Number.isFinite(monthsToGoal) ? `${monthsToGoal} month${
      monthsToGoal === 1 ? '' : 's'
    }` : 'Not reachable yet'})`);
  }

  if (expenseTotals.categories.size > 0) {
    lines.push('Expense breakdown:');
    expenseTotals.categories.forEach((amount, category) => {
      lines.push(`  • ${category}: ${currencyFormatter.format(amount)} / month`);
    });
  }

  const annual = calculateAnnualTotals(monthlyIncome, monthlyExpenses, monthlySavings);
  lines.push(
    `Annual outlook → Income: ${currencyFormatter.format(annual.income)}, Expenses: ${currencyFormatter.format(
      annual.expenses,
    )}, Savings: ${currencyFormatter.format(annual.savings)}`,
  );

  return lines.join('\n');
}

async function copyPlanSummary(monthlyIncome, monthlyExpenses, monthlySavings, expenseTotals) {
  if (!navigator.clipboard) {
    if (elements.copySummaryStatus) {
      elements.copySummaryStatus.textContent = 'Clipboard access is not available in this browser.';
    }
    return;
  }

  const report = generateSummaryReport(monthlyIncome, monthlyExpenses, monthlySavings, expenseTotals);
  try {
    await navigator.clipboard.writeText(report);
    if (elements.copySummaryStatus) {
      elements.copySummaryStatus.textContent = 'Plan summary copied to clipboard!';
    }
  } catch (error) {
    console.warn('Budget Beacon: unable to copy summary', error);
    if (elements.copySummaryStatus) {
      elements.copySummaryStatus.textContent = 'We could not copy the summary. Try copying manually.';
    }
  }
}

function updateGoalProgress(monthlySavings) {
  if (!state.goal) {
    elements.goalProgress.hidden = true;
    return;
  }

  elements.goalProgress.hidden = false;
  const progress = Math.max(0, Math.min(100, (monthlySavings / state.goal) * 100));
  elements.goalPercent.textContent = `${progress.toFixed(0)}%`;
  elements.progressBar.style.width = `${progress}%`;
  const ariaValue = Math.round(progress);
  const progressBar = elements.goalProgress.querySelector('[role="progressbar"]');
  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', ariaValue);
  }

  if (monthlySavings <= 0) {
    elements.goalTimeline.textContent = 'Increase your savings to make progress toward this goal.';
    return;
  }

  const months = Math.ceil(state.goal / monthlySavings);
  elements.goalTimeline.textContent = `At this pace you will reach your goal in about ${months} month${months === 1 ? '' : 's'}.`;
}

function updateTotalsDisplay(monthlyIncome, monthlyExpenses, monthlySavings) {
  elements.incomeDisplay.textContent = currencyFormatter.format(monthlyIncome);
  elements.expensesDisplay.textContent = currencyFormatter.format(monthlyExpenses);
  elements.savingsDisplay.textContent = currencyFormatter.format(monthlySavings);

  if (monthlyIncome === 0) {
    elements.incomeNote.textContent = 'Enter your take-home pay to begin.';
  } else {
    elements.incomeNote.textContent = 'Update anytime your income changes.';
  }

  if (state.expenses.length === 0) {
    elements.expenseNote.textContent = 'Add recurring bills, subscriptions, and goals.';
  } else {
    elements.expenseNote.textContent = `${state.expenses.length} expense${state.expenses.length === 1 ? '' : 's'} tracked.`;
  }

  if (monthlyIncome === 0) {
    elements.savingsNote.textContent = 'Savings appear once income and expenses are entered.';
  } else if (monthlySavings >= 0) {
    elements.savingsNote.textContent = 'Set a savings goal to keep motivation high.';
  } else {
    elements.savingsNote.textContent = 'You are overspending. Use the action plan for ideas to rebalance.';
  }
}

function updateView() {
  const expenseTotals = summarizeExpenses();
  const monthlyIncome = state.income;
  const monthlyExpenses = Number(expenseTotals.overall.toFixed(2));
  const monthlySavings = Number((monthlyIncome - monthlyExpenses).toFixed(2));

  updateTotalsDisplay(monthlyIncome, monthlyExpenses, monthlySavings);
  renderExpensesTable();
  renderCategoryBreakdown(expenseTotals, monthlyExpenses, monthlyIncome);
  const actionPlan = buildActionPlan(monthlyIncome, monthlyExpenses, monthlySavings);
  elements.actionPlan.innerHTML = '';
  elements.actionPlan.append(...actionPlan.children);
  buildRatioChecks(monthlyIncome, expenseTotals);
  renderBudgetRuleCheckup(monthlyIncome, monthlyExpenses, expenseTotals);
  renderAnnualOutlook(monthlyIncome, monthlyExpenses, monthlySavings);
  updateGoalProgress(monthlySavings);
  persistState();

  if (elements.copySummaryButton) {
    elements.copySummaryButton.onclick = () =>
      copyPlanSummary(monthlyIncome, monthlyExpenses, monthlySavings, expenseTotals);
  }

  return { expenseTotals, monthlyIncome, monthlyExpenses, monthlySavings };
}

function attachEventListeners() {
  elements.planForm.addEventListener('input', handlePlanInput);
  elements.expenseForm.addEventListener('submit', handleExpenseSubmit);
  elements.addSampleButton.addEventListener('click', loadSampleData);
  elements.clearDataButton.addEventListener('click', clearAllData);
}

function loadSampleData() {
  state = {
    income: 4800,
    goal: 1200,
    expenses: [
      { name: 'Rent', category: 'Housing', amount: 1850, frequency: 'monthly' },
      { name: 'Internet', category: 'Utilities', amount: 70, frequency: 'monthly' },
      { name: 'Electric', category: 'Utilities', amount: 95, frequency: 'monthly' },
      { name: 'Groceries', category: 'Food', amount: 110, frequency: 'weekly' },
      { name: 'Commuter pass', category: 'Transportation', amount: 120, frequency: 'monthly' },
      { name: 'Student loan', category: 'Debt', amount: 225, frequency: 'monthly' },
      { name: 'Gym membership', category: 'Health', amount: 45, frequency: 'monthly' },
      { name: 'Streaming bundle', category: 'Lifestyle', amount: 28, frequency: 'monthly' },
      { name: 'Emergency fund', category: 'Savings', amount: 150, frequency: 'monthly' },
    ],
  };
  applyStateToInputs();
  updateView();
}

function clearAllData() {
  if (!confirm('This will clear your saved plan from this browser. Continue?')) return;
  state = { ...defaultState };
  applyStateToInputs();
  updateView();
}

applyStateToInputs();
attachEventListeners();
updateView();
