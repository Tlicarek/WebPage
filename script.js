const root = document.documentElement;
const pulses = document.querySelectorAll('[data-emit="pulse"]');
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function createRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function handleParallax(event) {
  const x = (event.clientX / window.innerWidth - 0.5) * 12;
  const y = (event.clientY / window.innerHeight - 0.5) * 12;
  if (orb) {
    orb.style.transform = `translate(${x}px, ${y}px)`;
  }
}

function bindMotionPreferences(shouldReduce) {
  pulses.forEach((button) => {
    button.removeEventListener('click', createRipple);
  });

  if (shouldReduce) {
    document.removeEventListener('pointermove', handleParallax);
    if (orb) {
      orb.style.transform = '';
    }
    return;
  }

  pulses.forEach((button) => {
    button.addEventListener('click', createRipple);
  });

  document.addEventListener('pointermove', handleParallax);
}

const orb = document.querySelector('.hero-orb .orb');
bindMotionPreferences(motionQuery.matches);

if (typeof motionQuery.addEventListener === 'function') {
  motionQuery.addEventListener('change', (event) => {
    bindMotionPreferences(event.matches);
  });
} else if (typeof motionQuery.addListener === 'function') {
  motionQuery.addListener((event) => {
    bindMotionPreferences(event.matches);
  });
}

let hueShift = 0;
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h') {
    hueShift = (hueShift + 40) % 360;
    root.style.setProperty('--primary', `hsl(${160 + hueShift}, 100%, 70%)`);
    root.style.setProperty('--accent', `hsl(${300 + hueShift}, 100%, 60%)`);
  }
});

// Sprint planner logic
const plannerForm = document.querySelector('.planner-form');
const plannerResults = document.querySelector('[data-planner-results]');
const timelineInput = document.querySelector('#timeline');
const timelineOutput = document.querySelector('[data-timeline-output]');
const copyButton = document.querySelector('[data-copy-plan]');
const copyFeedback = document.querySelector('[data-copy-feedback]');

const focusBlueprints = {
  innovation: {
    label: 'Innovation sprint',
    overview:
      'Rapidly prototype, test, and frame investment decisions for a new opportunity area.',
    phases: [
      {
        title: 'Decode the opportunity',
        summary:
          'Interview customers and domain experts, capture signal scans, and narrow to one bold hypothesis.',
      },
      {
        title: 'Prototype & experiment',
        summary:
          'Build lean artifacts, run experiments, and log evidence in the decision journal for fast iteration.',
      },
      {
        title: 'Storycraft & launch',
        summary:
          'Craft the value narrative, test adoption paths, and queue launch or investment recommendations.',
      },
    ],
    rituals: [
      'Daily orbit sync (15 minutes) to align priorities.',
      'Mid-week divergence workshop to reframe blockers.',
      'Friday demo pulse sharing prototype learnings.',
    ],
    signals: [
      'Validated desirability signals and adoption hypotheses.',
      'Prototype interaction heatmaps or test analytics.',
      'Next-step decision memo with investment ask.',
    ],
  },
  experience: {
    label: 'Customer experience upgrade',
    overview:
      'Map journeys, fix breakpoints, and layer delight moments across a service or product ecosystem.',
    phases: [
      {
        title: 'Journey intelligence',
        summary:
          'Audit touchpoints, pull support tickets, and co-create journey maps with frontline teams.',
      },
      {
        title: 'Experience redesign',
        summary:
          'Prototype service moments, draft new playbooks, and pilot revised flows with target segments.',
      },
      {
        title: 'Stabilize & amplify',
        summary:
          'Operationalize training, update tooling, and publish success dashboards for leadership.',
      },
    ],
    rituals: [
      'Service huddle twice per week to monitor sentiment.',
      'Cross-functional pairing sessions to unblock handoffs.',
      'Weekly leadership signal share with key metrics.',
    ],
    signals: [
      'Customer satisfaction delta with qualitative quotes.',
      'Operational efficiency improvements (time-to-resolve).',
      'Adoption of new playbooks across teams.',
    ],
  },
  ai: {
    label: 'AI integration rollout',
    overview:
      'Introduce AI capabilities responsibly with guardrails, enablement, and performance monitoring.',
    phases: [
      {
        title: 'Alignment & safety',
        summary:
          'Define success metrics, model boundaries, and compliance checkpoints with legal and risk partners.',
      },
      {
        title: 'Pilot & enablement',
        summary:
          'Stand up sandbox pilots, collect user feedback, and codify usage guidelines and prompts.',
      },
      {
        title: 'Scale & monitor',
        summary:
          'Roll out broadly with training, instrumentation dashboards, and ongoing model performance reviews.',
      },
    ],
    rituals: [
      'Risk triad review every Tuesday with compliance.',
      'Hands-on prompt lab for pilot teams each Thursday.',
      'Bi-weekly model metrics review with leadership.',
    ],
    signals: [
      'Documented guardrails and approved use cases.',
      'Pilot satisfaction and productivity uplift metrics.',
      'Live dashboards for accuracy, drift, and incident response.',
    ],
  },
  research: {
    label: 'Research & discovery',
    overview:
      'Capture insight signals, form opportunity theses, and prioritize experiments for future investment.',
    phases: [
      {
        title: 'Insight harvesting',
        summary:
          'Recruit participants, gather qualitative stories, and triangulate data with existing analytics.',
      },
      {
        title: 'Synthesis & framing',
        summary:
          'Cluster insights, build opportunity canvases, and quantify the value of promising themes.',
      },
      {
        title: 'Recommendation sprint',
        summary:
          'Draft evidence-backed bets, plan validation experiments, and socialize the roadmap.',
      },
    ],
    rituals: [
      'Daily field notes drop for asynchronous synthesis.',
      'Affinity mapping workshop twice per week.',
      'Executive readout rehearsal ahead of share-out.',
    ],
    signals: [
      'Insight library with tagged highlight reels.',
      'Prioritized opportunity backlog with sizing.',
      'Experiment roadmap with owners and next steps.',
    ],
  },
};

const cadenceGuidance = {
  steady: {
    label: 'steady cadence',
    note: 'Balanced pace with time for reflection and iteration.',
  },
  accelerated: {
    label: 'accelerated cadence',
    note: 'Compressed cycles emphasize rapid testing and decision velocity.',
  },
  moonshot: {
    label: 'moonshot cadence',
    note: 'High-intensity flow with extended collaboration blocks and bold goalposts.',
  },
};

let latestPlanText = '';

function updateTimelineOutput() {
  if (timelineInput && timelineOutput) {
    const weeks = Number(timelineInput.value);
    timelineOutput.textContent = `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
}

updateTimelineOutput();

timelineInput?.addEventListener('input', updateTimelineOutput);

function allocatePhases(totalWeeks, phaseCount) {
  const base = Math.floor(totalWeeks / phaseCount);
  const remainder = totalWeeks % phaseCount;
  const allocation = Array.from({ length: phaseCount }, (_, index) => base + (index < remainder ? 1 : 0));
  return allocation;
}

function buildPhaseMarkup(phases, weeksAllocation) {
  const items = phases.map((phase, index) => {
    const startWeek = weeksAllocation.slice(0, index).reduce((sum, value) => sum + value, 0) + 1;
    const endWeek = startWeek + weeksAllocation[index] - 1;
    const range = startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}–${endWeek}`;
    return `<li class="phase-item"><strong>${range}: ${phase.title}</strong>${phase.summary}</li>`;
  });

  return `<ul class="phase-list">${items.join('')}</ul>`;
}

function buildBulletList(items, className) {
  return `<ul class="${className}">${items
    .map((item) => `<li>${item}</li>`)
    .join('')}</ul>`;
}

function generatePlan(event) {
  event.preventDefault();
  if (!plannerForm || !plannerResults) return;

  const data = new FormData(plannerForm);
  const focusKey = data.get('focus');
  const blueprint = focusBlueprints[focusKey] ?? focusBlueprints.innovation;
  const initiative = (data.get('initiative') || '').toString().trim();
  const missionName = initiative.length ? initiative : `Untitled ${blueprint.label}`;
  const timelineWeeks = Math.max(2, Number(data.get('timeline')) || 6);
  const teamSize = Math.max(1, Number(data.get('team')) || 1);
  const cadenceKey = data.get('cadence');
  const cadence = cadenceGuidance[cadenceKey] ?? cadenceGuidance.steady;
  const constraint = (data.get('constraint') || '').toString().trim();

  const weeksAllocation = allocatePhases(timelineWeeks, blueprint.phases.length);
  const phaseMarkup = buildPhaseMarkup(blueprint.phases, weeksAllocation);
  const ritualsMarkup = buildBulletList(blueprint.rituals, 'ritual-list');
  const signalsMarkup = buildBulletList(blueprint.signals, 'signal-list');

  const constraintMessage = constraint
    ? `<p><strong>Constraints noted:</strong> ${constraint}</p>`
    : '';

  const teamGuidance = teamSize > 8
    ? 'Split into breakout pods of 4–6 to keep sessions participatory.'
    : teamSize > 4
    ? 'Expect collaborative workshops with everyone present.'
    : 'Lean team detected—prioritize async rituals to protect focus.';

  const html = `
    <section>
      <h3>Mission summary</h3>
      <p>${missionName} will run for ${timelineWeeks} weeks on a ${cadence.label}.</p>
      <p>${blueprint.overview}</p>
      <p>${cadence.note}</p>
      <p><strong>Team guidance:</strong> ${teamGuidance}</p>
      ${constraintMessage}
    </section>
    <section>
      <h3>Phase plan</h3>
      ${phaseMarkup}
    </section>
    <section>
      <h3>Rituals</h3>
      ${ritualsMarkup}
    </section>
    <section>
      <h3>Success signals</h3>
      ${signalsMarkup}
    </section>
  `;

  plannerResults.innerHTML = html;

  const phaseText = blueprint.phases
    .map((phase, index) => {
      const startWeek = weeksAllocation.slice(0, index).reduce((sum, value) => sum + value, 0) + 1;
      const endWeek = startWeek + weeksAllocation[index] - 1;
      const range = startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}-${endWeek}`;
      return `${range}: ${phase.title} — ${phase.summary}`;
    })
    .join('\n');

  latestPlanText = `${missionName} (${timelineWeeks} weeks, ${cadence.label})\n${blueprint.overview}\nCadence note: ${cadence.note}\nTeam guidance: ${teamGuidance}${
    constraint ? `\nConstraints: ${constraint}` : ''
  }\n\nPhases:\n${phaseText}\n\nRituals:\n${blueprint.rituals.join('\n')}\n\nSuccess signals:\n${blueprint.signals.join('\n')}`;

  if (copyFeedback) {
    copyFeedback.textContent = '';
  }
}

plannerForm?.addEventListener('submit', generatePlan);

copyButton?.addEventListener('click', async () => {
  if (!latestPlanText) {
    if (copyFeedback) {
      copyFeedback.textContent = 'Generate a blueprint before copying the summary.';
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(latestPlanText);
    copyFeedback && (copyFeedback.textContent = 'Blueprint copied to clipboard.');
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = latestPlanText;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copyFeedback &&
      (copyFeedback.textContent = 'Blueprint copied. If clipboard access is blocked, paste manually.');
  }
});
