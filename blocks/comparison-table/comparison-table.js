import { toClassName } from '../../scripts/aem.js';
import loadComparisonData, { parseCell } from '../../scripts/comparison-data.js';
import userAgentDetection from '../../scripts/util/user-agent.js';

const DESCRIPTION_MODES = ['short-desc', 'long-desc', 'headline-short', 'headline-long', 'headline'];
const KNOWN_PLATFORMS = ['pc', 'mac', 'android', 'ios'];
const KEY_ALIASES = {
  title: 'heading', source: 'data', ctas: 'cta', buttons: 'cta', notes: 'note', highlights: 'highlight',
};
/** Inline tags allowed in sheet rich text; everything else is unwrapped or dropped. */
const ALLOWED_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'U', 'A', 'BR', 'SUP', 'SUB']);
const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT']);
/** Accessibility labels; overridable per locale through the workbook `strings` sheet. */
const DEFAULT_STRINGS = {
  included: 'Included',
  'not-included': 'Not included',
  partial: 'Partially included',
  'more-info': 'More information about',
  'features-header': 'Features',
};

let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

function isAuthorHost() {
  const { hostname } = window.location;
  return hostname === 'localhost'
    || /\.(aem|hlx)\.page$/.test(hostname)
    || hostname.endsWith('adobeaemcloud.com');
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

/**
 * Turns sheet rich text into a safe fragment (allow-listed inline tags only).
 * @param {string} value
 * @returns {DocumentFragment}
 */
function sanitize(value) {
  const tpl = document.createElement('template');
  tpl.innerHTML = value || '';
  const clean = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE || DROPPED_TAGS.has(child.tagName)) {
        child.remove();
        return;
      }
      clean(child);
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        return;
      }
      const href = child.tagName === 'A' ? (child.getAttribute('href') || '').trim() : '';
      [...child.attributes].forEach(({ name }) => child.removeAttribute(name));
      if (href && /^(https?:|mailto:|\/|#)/i.test(href)) child.setAttribute('href', href);
    });
  };
  clean(tpl.content);
  return tpl.content;
}

/** Text of an element with `<br>` kept as line breaks. */
function textOf(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  return clone.textContent;
}

/** Splits on commas and line breaks, ignoring commas inside parentheses. */
function splitList(text) {
  return text.split(/\n|,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);
}

/** List items of a config cell: list items, paragraphs, or the cell text. */
function cellItems(cell) {
  const blocks = [...cell.querySelectorAll('li, p')].filter((n) => !n.querySelector('li, p'));
  return (blocks.length ? blocks : [cell]).flatMap((n) => splitList(textOf(n)));
}

/**
 * Parses one feature selector: `category: <id>`, `<prefix>*`, or
 * `<id>` with optional `(Badge text, icon)` options.
 */
function parseFeatureSelector(item) {
  const category = item.match(/^category\s*:\s*(.+)$/i);
  if (category) return { category: category[1].trim().toLowerCase() };
  const options = item.match(/^(.+?)\s*\((.*)\)$/);
  const id = (options ? options[1] : item).trim().toLowerCase();
  const selector = id.endsWith('*') ? { prefix: id.slice(0, -1) } : { id };
  if (options) {
    const opts = options[2].split(',').map((o) => o.trim()).filter(Boolean);
    selector.showIcon = opts.some((o) => o.toLowerCase() === 'icon');
    selector.badge = opts.filter((o) => o.toLowerCase() !== 'icon').join(', ');
  }
  return selector;
}

/**
 * Reads the authored key/value rows. Works for da.live tables and for the
 * Universal Editor key-value model (both render `<div>key</div><div>value</div>`).
 * A single-cell row holding a heading is treated as the table heading.
 * @param {Element} block
 */
function parseConfig(block) {
  const config = {
    data: '',
    heading: null,
    products: [],
    highlight: new Set(),
    labels: new Map(),
    features: [],
    ctas: [],
    note: null,
  };
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length === 1) {
      const heading = cells[0].querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) config.heading = heading;
      return;
    }
    if (cells.length < 2) return;
    const rawKey = toClassName(cells[0].textContent);
    const key = KEY_ALIASES[rawKey] || rawKey;
    const cell = cells[1];
    switch (key) {
      case 'data':
        config.data = cell.textContent.trim();
        break;
      case 'heading': {
        const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) config.heading = heading;
        else if (cell.textContent.trim()) {
          config.heading = el('h2');
          config.heading.textContent = cell.textContent.trim();
        }
        break;
      }
      case 'products':
        config.products = cellItems(cell).map((id) => id.toLowerCase());
        cell.querySelectorAll('strong, b').forEach((bold) => {
          splitList(textOf(bold)).forEach((id) => config.highlight.add(id.toLowerCase()));
        });
        break;
      case 'highlight':
        cellItems(cell).forEach((id) => config.highlight.add(id.toLowerCase()));
        break;
      case 'labels':
        cellItems(cell).forEach((item) => {
          const at = item.indexOf(':');
          if (at < 1) return;
          config.labels.set(item.slice(0, at).trim().toLowerCase(), item.slice(at + 1).trim());
        });
        break;
      case 'features':
        config.features = cellItems(cell).map(parseFeatureSelector);
        break;
      case 'cta':
        config.ctas = [...cell.querySelectorAll('a[href]')];
        break;
      case 'note':
        if (cell.textContent.trim()) config.note = cell;
        break;
      default:
        break;
    }
  });
  return config;
}

/** Resolves the authored feature selectors into an ordered, de-duplicated list. */
function expandFeatures(selectors, data, warn) {
  const entries = new Map();
  const add = (feature, selector = {}) => {
    if (!entries.has(feature.id)) {
      entries.set(feature.id, { feature, badge: selector.badge, showIcon: selector.showIcon });
    }
  };
  const all = [...data.features.values()];
  selectors.forEach((selector) => {
    if (selector.category) {
      const matches = all.filter((f) => f.category === selector.category);
      if (!matches.length) warn(`No features found in category "${selector.category}".`);
      matches.forEach((f) => add(f));
    } else if (selector.prefix !== undefined) {
      const matches = all.filter((f) => f.id.startsWith(selector.prefix));
      if (!matches.length) warn(`No features match "${selector.prefix}*".`);
      matches.forEach((f) => add(f, selector));
    } else if (data.features.has(selector.id)) {
      add(data.features.get(selector.id), selector);
    } else {
      warn(`Unknown feature id "${selector.id}".`);
    }
  });
  return [...entries.values()];
}

/** Platform of the visitor (`?platform=` overrides for testing); '' when unknown. */
function currentPlatform() {
  const param = new URLSearchParams(window.location.search).get('platform');
  const platform = (param || userAgentDetection.platform.get() || '').toLowerCase();
  return KNOWN_PLATFORMS.includes(platform) ? platform : '';
}

function buildProductHeader(product, { label, highlighted, simple }) {
  const th = el('th', 'comparison-product', { scope: 'col', role: 'columnheader' });
  th.dataset.product = product.id;
  if (product.platformList.length) th.dataset.platforms = product.platformList.join(' ');
  if (highlighted) th.classList.add('is-highlighted');
  if (label) {
    const pill = el('span', 'comparison-label');
    pill.textContent = label;
    th.append(pill);
  }
  if (!simple && product.icon) {
    th.append(el('img', 'comparison-product-icon', {
      src: product.icon, alt: '', loading: 'lazy', width: '48', height: '48',
    }));
  }
  const name = el(product.url ? 'a' : 'span', 'comparison-product-name');
  if (product.url) name.href = product.url;
  name.append(sanitize(product.name || product.id));
  th.append(name);
  if (!simple && product.subtitle) {
    const subtitle = el('span', 'comparison-product-subtitle');
    subtitle.append(sanitize(product.subtitle));
    th.append(subtitle);
  }
  return th;
}

function buildFeatureHeader(entry, mode, strings) {
  const { feature, badge, showIcon } = entry;
  const th = el('th', 'comparison-feature', { scope: 'row', role: 'rowheader' });
  const short = feature['short-description'];
  const long = feature['long-description'];
  const headline = feature.headline || feature.id;

  const title = el('span', 'comparison-feature-title');
  if (showIcon && feature.icon) {
    title.append(el('img', 'comparison-feature-icon', {
      src: feature.icon, alt: '', loading: 'lazy', width: '24', height: '24',
    }));
  }
  const primary = { 'short-desc': short || headline, 'long-desc': long || short || headline }[mode] || headline;
  const text = el('span', 'comparison-feature-text');
  text.append(sanitize(primary));
  title.append(text);
  if (badge) {
    const pill = el('span', 'comparison-badge');
    pill.textContent = badge;
    title.append(pill);
  }
  th.append(title);

  const secondary = { 'headline-short': short, 'headline-long': long }[mode];
  if (secondary) {
    const desc = el('span', 'comparison-feature-desc');
    desc.append(sanitize(secondary));
    th.append(desc);
  }

  // Long copy that is not already shown inline goes into a toggletip.
  const inlineLong = ['long-desc', 'headline-long'].includes(mode);
  const tip = inlineLong ? '' : (long || (mode === 'headline' ? short : ''));
  if (tip) {
    const tipId = nextId('comparison-tip');
    const button = el('button', 'comparison-info', {
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': tipId,
      'aria-label': `${strings['more-info']} ${text.textContent}`.trim(),
    });
    const bubble = el('span', 'comparison-tip', { id: tipId, role: 'note' });
    bubble.hidden = true;
    bubble.append(sanitize(tip));
    title.append(button);
    th.append(bubble);
  }
  return th;
}

function buildCell(state, strings) {
  const td = el('td', `comparison-cell is-${state.type}`, { role: 'cell' });
  const icon = {
    check: 'check', 'check-text': 'check', none: 'cross', partial: 'partial',
  }[state.type];
  if (icon) {
    td.append(el('span', `comparison-icon comparison-icon-${icon}`, { 'aria-hidden': 'true' }));
    const sr = el('span', 'comparison-sr');
    sr.textContent = {
      check: strings.included, cross: strings['not-included'], partial: strings.partial,
    }[icon];
    td.append(sr);
  }
  if (state.text) {
    const text = el('span', 'comparison-value');
    text.append(sanitize(state.text));
    td.append(text);
  }
  return td;
}

function closeTips(block, except) {
  block.querySelectorAll('.comparison-info[aria-expanded="true"]').forEach((button) => {
    if (button === except) return;
    button.setAttribute('aria-expanded', 'false');
    block.querySelector(`#${button.getAttribute('aria-controls')}`).hidden = true;
  });
}

function bindTooltips(block) {
  block.addEventListener('click', (e) => {
    const button = e.target.closest('.comparison-info');
    if (!button) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    closeTips(block, button);
    button.setAttribute('aria-expanded', String(open));
    block.querySelector(`#${button.getAttribute('aria-controls')}`).hidden = !open;
  });
  block.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = block.querySelector('.comparison-info[aria-expanded="true"]');
    if (!open) return;
    closeTips(block);
    open.focus();
  });
  document.addEventListener('click', (e) => {
    if (!block.contains(e.target)) closeTips(block);
  });
}

/** Logs data/config problems and shows them inline on preview and author hosts. */
function renderWarnings(block, warnings) {
  if (!warnings.length) return;
  // eslint-disable-next-line no-console
  warnings.forEach((w) => console.warn(`comparison-table: ${w}`));
  if (!isAuthorHost()) return;
  const box = el('div', 'comparison-warnings', { role: 'status' });
  const title = el('p');
  title.textContent = `Comparison table: ${warnings.length} authoring issue(s) (shown on preview only)`;
  const list = el('ul');
  warnings.forEach((w) => {
    const li = el('li');
    li.textContent = w;
    list.append(li);
  });
  box.append(title, list);
  block.prepend(box);
}

/**
 * Builds the CTA row. Authored links map to products by position; a product
 * without one falls back to its sheet `url` using the first authored label.
 */
function buildCtaRow(products, ctas, highlight) {
  const tr = el('tr', 'comparison-cta-row', { role: 'row' });
  tr.append(el('td', 'comparison-corner', { role: 'cell' }));
  const fallbackLabel = ctas[0]?.textContent.trim();
  products.forEach((product, i) => {
    const td = el('td', 'comparison-cta', { role: 'cell' });
    let link = ctas[i];
    if (!link && product.url && product.type === 'product' && fallbackLabel) {
      link = el('a');
      link.href = product.url;
      link.textContent = fallbackLabel;
    }
    if (link) {
      link.className = `button ${highlight.has(product.id) ? 'primary' : 'secondary'}`;
      td.append(link);
    }
    if (highlight.has(product.id)) td.classList.add('is-highlighted');
    tr.append(td);
  });
  return tr;
}

async function render(block, config) {
  const warnings = [];
  const warn = (message) => warnings.push(message);
  const data = await loadComparisonData({ path: config.data || undefined });
  warnings.push(...data.warnings);
  const strings = { ...DEFAULT_STRINGS, ...data.strings };

  const products = config.products.filter((id) => {
    if (data.products.has(id)) return true;
    warn(`Unknown product id "${id}".`);
    return false;
  }).map((id) => data.products.get(id));
  config.highlight.forEach((id) => {
    if (!config.products.includes(id)) warn(`Highlighted product "${id}" is not in the Products row.`);
  });
  if (!products.length) {
    warn('No valid products: add product ids to the Products row.');
    block.classList.remove('is-loading');
    renderWarnings(block, warnings);
    return;
  }

  const entries = expandFeatures(config.features, data, warn);
  const mode = DESCRIPTION_MODES.find((m) => block.classList.contains(m)) || 'headline';
  const simple = block.classList.contains('simple');
  const grouped = block.classList.contains('categories');
  const platform = currentPlatform();

  const table = el('table', 'comparison-grid', { role: 'table' });
  table.style.setProperty('--comparison-columns', products.length);
  if (config.heading) {
    config.heading.id = config.heading.id || nextId('comparison-heading');
    table.setAttribute('aria-labelledby', config.heading.id);
  }

  const thead = el('thead', '', { role: 'rowgroup' });
  const headRow = el('tr', '', { role: 'row' });
  const corner = el('td', 'comparison-corner', { role: 'cell' });
  const cornerText = el('span', 'comparison-sr');
  cornerText.textContent = strings['features-header'];
  corner.append(cornerText);
  headRow.append(corner);
  products.forEach((product) => headRow.append(buildProductHeader(product, {
    label: config.labels.get(product.id),
    highlighted: config.highlight.has(product.id),
    simple,
  })));
  thead.append(headRow);
  table.append(thead);

  const groups = new Map();
  entries.forEach((entry) => {
    const key = grouped ? entry.feature.category || '' : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  groups.forEach((groupEntries, category) => {
    const tbody = el('tbody', '', { role: 'rowgroup' });
    if (grouped && category) {
      const tr = el('tr', 'comparison-category', { role: 'row' });
      const th = el('th', '', { scope: 'rowgroup', colspan: products.length + 1, role: 'rowheader' });
      th.textContent = data.categories.get(category) || category;
      tr.append(th);
      tbody.append(tr);
    }
    groupEntries.forEach((entry) => {
      const { feature } = entry;
      const tr = el('tr', 'comparison-row', { role: 'row' });
      if (feature.platformList.length) {
        tr.dataset.platforms = feature.platformList.join(' ');
        if (platform && !feature.platformList.includes(platform)) tr.hidden = true;
      }
      tr.append(buildFeatureHeader(entry, mode, strings));
      const values = data.matrix.get(feature.id);
      if (!values) warn(`Feature "${feature.id}" has no row in the matrix sheet.`);
      products.forEach((product) => {
        const state = parseCell(values?.[product.id]);
        if (state.invalid) {
          warn(`Invalid matrix value "${values[product.id]}" for ${feature.id} / ${product.id}.`);
        }
        const td = buildCell(state, strings);
        if (config.highlight.has(product.id)) td.classList.add('is-highlighted');
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(tbody);
  });

  if (config.ctas.length) {
    const tfoot = el('tfoot', '', { role: 'rowgroup' });
    tfoot.append(buildCtaRow(products, config.ctas, config.highlight));
    table.append(tfoot);
  }

  const content = [];
  if (config.heading) {
    const header = el('div', 'comparison-heading');
    header.append(config.heading);
    content.push(header);
  }
  content.push(table);
  if (config.note) {
    const note = el('div', 'comparison-note');
    note.append(...config.note.childNodes);
    content.push(note);
  }
  block.replaceChildren(...content);
  block.classList.remove('is-loading');
  bindTooltips(block);
  renderWarnings(block, warnings);
}

/**
 * Comparison table: products × features, driven by the shared comparison
 * workbook. The block only holds configuration (which products and features to
 * show); the data is fetched and rendered once the block nears the viewport.
 * @param {Element} block
 */
export default function decorate(block) {
  const config = parseConfig(block);
  block.replaceChildren();
  block.classList.add('is-loading');

  const start = () => render(block, config).catch((error) => {
    block.classList.remove('is-loading');
    renderWarnings(block, [error.message]);
  });

  if (!('IntersectionObserver' in window)) {
    start();
    return;
  }
  const observer = new IntersectionObserver((items) => {
    if (!items.some((item) => item.isIntersecting)) return;
    observer.disconnect();
    start();
  }, { rootMargin: '600px 0px' });
  observer.observe(block);
}
