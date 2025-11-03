(() => {
  const STORAGE_KEYS = {
    items: 'wishfully:items',
    settings: 'wishfully:settings'
  };

  const DEFAULT_SETTINGS = {
    sort: 'priority',
    groupByPriority: false
  };

  const curatedCatalog = [
    {
      keywords: ['nintendo switch oled', 'switch oled'],
      alzaUrl: 'https://www.alza.cz/nintendo-switch-oled-model-bila-d6768814.htm',
      officialUrl: 'https://www.nintendo.com/switch/oled-model/',
      officialLabel: 'Buy from Nintendo',
      foundOnAlza: true
    },
    {
      keywords: ['sony wh-1000xm5', 'wh1000xm5', 'sony xm5'],
      alzaUrl: 'https://www.alza.cz/sony-wh-1000xm5-black-d6944853.htm',
      officialUrl: 'https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b',
      officialLabel: 'Buy from Sony',
      foundOnAlza: true
    },
    {
      keywords: ['dyson airwrap', 'airwrap multi-styler'],
      alzaUrl: null,
      officialUrl: 'https://www.dyson.com/hair-care/dyson-airwrap',
      officialLabel: 'Buy from Dyson',
      foundOnAlza: false
    },
    {
      keywords: ['lego millennium falcon', 'millennium falcon lego', 'lego 75192'],
      alzaUrl: 'https://www.alza.cz/lego-star-wars-75192-millennium-falcon-d5139818.htm',
      officialUrl: 'https://www.lego.com/en-us/product/millennium-falcon-75192',
      officialLabel: 'Buy from LEGO',
      foundOnAlza: true
    },
    {
      keywords: ['kindle scribe', 'amazon kindle scribe'],
      alzaUrl: null,
      officialUrl: 'https://www.amazon.com/kindle-scribe',
      officialLabel: 'Buy from Amazon',
      foundOnAlza: false
    }
  ];

  const brandDirectory = new Map([
    ['apple', { url: 'https://www.apple.com/shop', label: 'Visit Apple Store' }],
    ['nintendo', { url: 'https://www.nintendo.com/store/', label: 'Visit Nintendo Store' }],
    ['dyson', { url: 'https://www.dyson.com', label: 'Visit Dyson' }],
    ['lego', { url: 'https://www.lego.com', label: 'Visit LEGO' }],
    ['sony', { url: 'https://electronics.sony.com', label: 'Visit Sony' }],
    ['amazon', { url: 'https://www.amazon.com', label: 'Visit Amazon' }],
    ['ikea', { url: 'https://www.ikea.com', label: 'Visit IKEA' }],
    ['samsung', { url: 'https://www.samsung.com/us/', label: 'Visit Samsung' }],
    ['microsoft', { url: 'https://www.microsoft.com/store', label: 'Visit Microsoft Store' }]
  ]);

  const selectors = {
    wishForm: document.getElementById('wishForm'),
    wishName: document.getElementById('wishName'),
    wishPriority: document.getElementById('wishPriority'),
    wishNotes: document.getElementById('wishNotes'),
    aiStatus: document.getElementById('aiStatus'),
    aiResults: document.getElementById('aiResults'),
    itemCount: document.getElementById('itemCount'),
    wishlistContainer: document.getElementById('wishlistContainer'),
    emptyState: document.getElementById('emptyState'),
    sortOrder: document.getElementById('sortOrder'),
    groupToggle: document.getElementById('groupToggle'),
    clearButton: document.getElementById('clearButton')
  };

  const lookupCache = new Map();
  let previewRequestId = 0;

  const state = {
    items: loadItems(),
    settings: loadSettings()
  };

  attachListeners();
  render();
  if (selectors.wishName) {
    selectors.wishName.focus({ preventScroll: true });
  }

  function attachListeners() {
    selectors.wishForm.addEventListener('submit', handleAddWish);
    selectors.sortOrder.addEventListener('change', () => {
      state.settings.sort = selectors.sortOrder.value;
      persistSettings();
      renderWishlist();
    });
    selectors.groupToggle.addEventListener('change', () => {
      state.settings.groupByPriority = selectors.groupToggle.checked;
      persistSettings();
      renderWishlist();
    });
    selectors.clearButton.addEventListener('click', handleClearAll);

    selectors.wishName.addEventListener('input', debounce(handlePreviewLookup, 400));

    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEYS.items) {
        state.items = loadItems();
        render();
      }
      if (event.key === STORAGE_KEYS.settings) {
        state.settings = loadSettings();
        selectors.sortOrder.value = state.settings.sort;
        selectors.groupToggle.checked = state.settings.groupByPriority;
        renderWishlist();
      }
    });
  }

  function handleAddWish(event) {
    event.preventDefault();
    const name = selectors.wishName.value.trim();
    if (!name) return;

    const priority = Number.parseInt(selectors.wishPriority.value, 10) || 1;
    const notes = selectors.wishNotes.value.trim();

    selectors.aiStatus.textContent = 'Saving and scouting links…';

    searchMarketplace(name)
      .then((lookup) => {
        addWish({ name, priority, notes, lookup });
        showLookupPreview(name, lookup);
        selectors.wishForm.reset();
        selectors.wishPriority.value = priority.toString();
        selectors.wishName.focus();
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.warn('Lookup failed', error);
        const fallbackLookup = buildFallbackLookup(name);
        addWish({ name, priority, notes, lookup: fallbackLookup });
        showLookupPreview(name, fallbackLookup);
      })
      .finally(() => {
        selectors.aiStatus.textContent = 'Add another wish or browse your list below.';
      });
  }

  function handleClearAll() {
    if (!state.items.length) return;
    const confirmed = window.confirm('Remove every item from your wishlist? This cannot be undone.');
    if (!confirmed) return;
    state.items = [];
    persistItems();
    render();
  }

  function handlePreviewLookup() {
    const query = selectors.wishName.value.trim();
    if (!query) {
      selectors.aiStatus.textContent = 'Start typing an item name to let the AI scout the best link.';
      selectors.aiResults.hidden = true;
      selectors.aiResults.innerHTML = '';
      return;
    }

    selectors.aiStatus.textContent = 'Checking Alza for this item…';
    const requestId = ++previewRequestId;
    searchMarketplace(query, { forceFresh: true })
      .then((lookup) => {
        if (requestId !== previewRequestId) return;
        showLookupPreview(query, lookup);
        selectors.aiStatus.textContent = lookup.foundOnAlza
          ? 'Found it on Alza! Add the item to save the link.'
          : 'Not spotted on Alza. We surfaced the best official alternative.';
      })
      .catch((error) => {
        if (error.name === 'AbortError' || requestId !== previewRequestId) return;
        console.warn('Lookup preview failed', error);
        const fallbackLookup = buildFallbackLookup(query);
        showLookupPreview(query, fallbackLookup);
        selectors.aiStatus.textContent = 'Having trouble reaching Alza, here is an official store link instead.';
      });
  }

  function searchMarketplace(query, options = {}) {
    const normalized = query.trim().toLowerCase();
    const { forceFresh = false } = options;
    if (!normalized) return Promise.reject(new Error('Empty query'));

    if (forceFresh) {
      lookupCache.delete(normalized);
    }

    if (!forceFresh && lookupCache.has(normalized)) {
      return Promise.resolve(lookupCache.get(normalized));
    }

    const curated = findCuratedMatch(query, normalized);
    if (curated) {
      lookupCache.set(normalized, curated);
      return Promise.resolve(curated);
    }

    const encoded = encodeURIComponent(query);
    const fetchPromise = fetch(`https://r.jina.ai/https://www.alza.cz/search.htm?exps=${encoded}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Alza lookup failed with status ${response.status}`);
        return response.text();
      })
      .then((content) => {
        const result = interpretAlzaResponse(content, query, encoded);
        lookupCache.set(normalized, result);
        return result;
      })
      .catch((error) => {
        if (error.name === 'AbortError') throw error;
        console.warn('Falling back after lookup error', error);
        const fallback = buildFallbackLookup(query, encoded);
        lookupCache.set(normalized, fallback);
        return fallback;
      });

    return fetchPromise;
  }

  function interpretAlzaResponse(content, query, encodedQuery) {
    const notFoundPattern = /(nic nebylo nalezeno|nic jsme nenašli|nenalezen)/i;
    const hasProductPattern = /(product-box|bx-catalogProduct|ProductBox)/i;

    if (!notFoundPattern.test(content) && hasProductPattern.test(content)) {
      return {
        query,
        foundOnAlza: true,
        alzaUrl: `https://www.alza.cz/search.htm?exps=${encodedQuery}`,
        officialUrl: `https://www.alza.cz/search.htm?exps=${encodedQuery}`,
        officialLabel: 'View on Alza'
      };
    }

    return buildFallbackLookup(query, encodedQuery);
  }

  function findCuratedMatch(originalQuery, normalizedQuery = originalQuery.toLowerCase()) {
    for (const item of curatedCatalog) {
      if (item.keywords.some((keyword) => normalizedQuery.includes(keyword))) {
        return {
          query: originalQuery,
          foundOnAlza: Boolean(item.alzaUrl),
          alzaUrl: item.alzaUrl ?? `https://www.alza.cz/search.htm?exps=${encodeURIComponent(normalizedQuery)}`,
          officialUrl: item.officialUrl,
          officialLabel: item.officialLabel
        };
      }
    }
    return null;
  }

  function buildFallbackLookup(query, encodedQuery = encodeURIComponent(query)) {
    const official = guessOfficialStore(query);
    return {
      query,
      foundOnAlza: false,
      alzaUrl: `https://www.alza.cz/search.htm?exps=${encodedQuery}`,
      officialUrl: official.url,
      officialLabel: official.label
    };
  }

  function guessOfficialStore(query) {
    const normalized = query.toLowerCase();
    for (const [keyword, details] of brandDirectory.entries()) {
      if (normalized.includes(keyword)) {
        return { url: details.url, label: details.label };
      }
    }
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(`${query} official store`)}`,
      label: 'Search official store'
    };
  }

  function addWish({ name, priority, notes, lookup }) {
    const wish = {
      id: createId(),
      name,
      priority,
      notes,
      createdAt: new Date().toISOString(),
      links: {
        foundOnAlza: lookup.foundOnAlza,
        alza: lookup.alzaUrl,
        official: lookup.officialUrl,
        officialLabel: lookup.officialLabel
      }
    };
    state.items.push(wish);
    persistItems();
    renderWishlist();
  }

  function persistItems() {
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  }

  function persistSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  }

  function loadItems() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.items);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to load wishlist items', error);
      return [];
    }
  }

  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.settings);
      if (!stored) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (error) {
      console.warn('Failed to load wishlist settings', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function render() {
    selectors.sortOrder.value = state.settings.sort;
    selectors.groupToggle.checked = state.settings.groupByPriority;
    renderWishlist();
  }

  function renderWishlist() {
    selectors.wishlistContainer.innerHTML = '';

    if (!state.items.length) {
      selectors.emptyState.hidden = false;
      selectors.itemCount.textContent = 'No wishes yet';
      return;
    }

    selectors.emptyState.hidden = true;
    const sorted = sortItems([...state.items], state.settings.sort);
    selectors.itemCount.textContent = `${state.items.length} ${state.items.length === 1 ? 'wish' : 'wishes'}`;

    if (state.settings.groupByPriority) {
      renderGroupedList(sorted);
    } else {
      sorted.forEach((wish) => {
        selectors.wishlistContainer.appendChild(createWishCard(wish));
      });
    }
  }

  function renderGroupedList(items) {
    const byPriority = new Map();
    items.forEach((wish) => {
      const bucket = byPriority.get(wish.priority) ?? [];
      bucket.push(wish);
      byPriority.set(wish.priority, bucket);
    });

    const priorities = Array.from(byPriority.keys()).sort((a, b) => b - a);

    priorities.forEach((priority) => {
      const section = document.createElement('section');
      section.className = 'priority-group';
      section.setAttribute('role', 'group');
      section.setAttribute('aria-labelledby', `priority-${priority}`);

      const heading = document.createElement('h3');
      heading.className = 'priority-heading';
      heading.id = `priority-${priority}`;
      heading.textContent = `Priority ${priority}`;
      section.appendChild(heading);

      const list = document.createElement('div');
      list.className = 'priority-list';
      byPriority.get(priority).forEach((wish) => {
        list.appendChild(createWishCard(wish));
      });

      section.appendChild(list);
      selectors.wishlistContainer.appendChild(section);
    });
  }

  function createWishCard(wish) {
    const card = document.createElement('article');
    card.className = 'wish-card';
    card.setAttribute('data-priority', String(wish.priority));
    card.setAttribute('role', 'listitem');

    const header = document.createElement('div');
    header.className = 'wish-card__header';

    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${wish.priority}`;
    badge.textContent = `P${wish.priority}`;
    badge.setAttribute('aria-label', `Priority ${wish.priority}`);
    header.appendChild(badge);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'wish-card__title';

    const title = document.createElement('h3');
    title.textContent = wish.name;
    titleWrap.appendChild(title);

    const meta = document.createElement('p');
    meta.className = 'wish-card__meta';
    meta.textContent = formatDate(wish.createdAt);
    titleWrap.appendChild(meta);

    header.appendChild(titleWrap);
    card.appendChild(header);

    if (wish.notes) {
      const notes = document.createElement('p');
      notes.className = 'wish-card__notes';
      notes.textContent = wish.notes;
      card.appendChild(notes);
    }

    const linkArea = document.createElement('div');
    linkArea.className = 'wish-card__links';

    if (wish.links.foundOnAlza && wish.links.alza) {
      const alzaLink = createLinkButton('View on Alza', wish.links.alza, '🛒');
      alzaLink.classList.add('primary-link');
      linkArea.appendChild(alzaLink);
    } else if (wish.links.alza) {
      const alzaSearch = createLinkButton('Search on Alza', wish.links.alza, '🔎');
      linkArea.appendChild(alzaSearch);
    }

    if (wish.links.official) {
      const official = createLinkButton(wish.links.officialLabel || 'Visit official store', wish.links.official, '✨');
      linkArea.appendChild(official);
    }

    card.appendChild(linkArea);

    const actions = document.createElement('div');
    actions.className = 'wish-card__actions';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn tiny danger';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => removeWish(wish.id));

    actions.appendChild(removeButton);
    card.appendChild(actions);

    return card;
  }

  function createLinkButton(label, href, icon) {
    const anchor = document.createElement('a');
    anchor.className = 'link-pill';
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`;
    return anchor;
  }

  function removeWish(id) {
    state.items = state.items.filter((item) => item.id !== id);
    persistItems();
    renderWishlist();
  }

  function showLookupPreview(query, lookup) {
    selectors.aiResults.hidden = false;
    selectors.aiResults.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'ai-results__title';
    title.innerHTML = `<strong>${escapeHtml(query)}</strong>`;
    selectors.aiResults.appendChild(title);

    const status = document.createElement('p');
    status.className = 'ai-results__status';
    status.textContent = lookup.foundOnAlza
      ? 'Found on Alza. The wishlist item will link straight to the product page.'
      : 'Not available on Alza right now. We surfaced the best official source instead.';
    selectors.aiResults.appendChild(status);

    const linkList = document.createElement('div');
    linkList.className = 'ai-results__links';

    if (lookup.alzaUrl) {
      const alzaLabel = lookup.foundOnAlza ? 'Open on Alza' : 'Search on Alza';
      const alzaLink = createLinkButton(alzaLabel, lookup.alzaUrl, lookup.foundOnAlza ? '🛍️' : '🔍');
      linkList.appendChild(alzaLink);
    }

    if (lookup.officialUrl) {
      const officialLink = createLinkButton(lookup.officialLabel || 'Visit official store', lookup.officialUrl, '✨');
      linkList.appendChild(officialLink);
    }

    selectors.aiResults.appendChild(linkList);
  }

  function sortItems(items, sortType) {
    switch (sortType) {
      case 'newest':
        return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'az':
        return items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      case 'priority':
      default:
        return items.sort((a, b) => b.priority - a.priority || new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  function formatDate(timestamp) {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return '';
    }
  }

  function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
  }

  function debounce(fn, delay = 300) {
    let timeout;
    return function debounced(...args) {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }
})();
