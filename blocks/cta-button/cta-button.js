import { moveInstrumentation } from '../../scripts/scripts.js';

const DOWNLOAD_SHEET = '/download.json';
const ID_COLUMN = 'Download ID';
const LINK_COLUMN = 'Download Link';

/** Cache of the in-flight/resolved /download.json request, shared by every button on the page. */
let sheetRequest;

/**
 * Fetches and caches the `data` rows of the site-root download sheet.
 * @returns {Promise<object[]>} row objects, or an empty array on any failure
 */
async function loadDownloadSheet() {
  if (!sheetRequest) {
    sheetRequest = (async () => {
      try {
        const resp = await fetch(DOWNLOAD_SHEET);
        if (!resp.ok) return [];
        const json = await resp.json();
        return Array.isArray(json.data) ? json.data : [];
      } catch (e) {
        // network/CORS failure: the authored link stays as the fallback
        return [];
      }
    })();
  }
  return sheetRequest;
}

/**
 * Looks up the Download Link for a given Download Id in the download sheet.
 * @param {string} id
 * @returns {Promise<string>} the resolved link, or '' when there is no match
 */
async function resolveDownloadLink(id) {
  const rows = await loadDownloadSheet();
  const match = rows.find((row) => (row[ID_COLUMN] || '').trim() === id);
  return match ? String(match[LINK_COLUMN] || '').trim() : '';
}

/**
 * Wires a button anchor to the download sheet: resolves the Download Link for
 * `downloadId` and, once resolved, swaps it into the anchor's href. Navigation
 * itself always happens on click via `window.location`, after the lookup
 * settles, so analytics rewrites of the href (inid, campaign params) are
 * always picked up.
 * @param {HTMLAnchorElement} link
 * @param {string} downloadId
 */
export function wireDownload(link, downloadId) {
  const resolved = resolveDownloadLink(downloadId);
  resolved.then((url) => {
    if (url) link.href = url;
  });

  link.addEventListener('click', async (e) => {
    // let modified clicks / middle-click open in a new tab as usual
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    await resolved;
    window.location = link.href;
  });
}

/**
 * Adds a button icon image from a field cell into the anchor on the given side.
 * @param {HTMLAnchorElement} link The button anchor
 * @param {Element} cell The field cell containing the icon image
 * @param {'left'|'right'} side Which side of the label to place the icon
 */
function addButtonIcon(link, cell, side) {
  const img = cell?.querySelector('img');
  if (!img) return;
  img.classList.add('button-icon', `button-icon-${side}`);
  if (side === 'left') link.prepend(img);
  else link.append(img);
}

/**
 * Decorates the cta-button block: a Franklin-button-style CTA (link + text +
 * title + type) extended with authorable left/right icon images rendered inside
 * the anchor, plus an optional Download Id. Authored fields render as rows in
 * this order: Link (collapses to the anchor), Button Image (Left), Button
 * Image (Right), Download Id. When Download Id is set, the button looks up its
 * Download Link in `/download.json` and navigates there instead of the
 * authored link.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  let linkCell;
  const iconCells = [];
  let downloadId = '';

  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    if (cell.querySelector('a')) {
      linkCell = cell;
    } else if (cell.querySelector('img')) {
      iconCells.push(cell);
    } else {
      const text = cell.textContent.trim();
      if (text) downloadId = text;
    }
  });

  if (!linkCell) {
    block.textContent = '';
    return;
  }

  const link = linkCell.querySelector('a');
  link.classList.add('button', 'avg');
  // default to primary styling when the author didn't pick a type
  if (!['primary', 'secondary', 'accent'].some((t) => link.classList.contains(t))) {
    link.classList.add('primary');
  }
  moveInstrumentation(linkCell, link);

  const [leftIconCell, rightIconCell] = iconCells;
  addButtonIcon(link, leftIconCell, 'left');
  addButtonIcon(link, rightIconCell, 'right');

  if (downloadId) wireDownload(link, downloadId);

  const wrapper = document.createElement('p');
  wrapper.className = 'button-wrapper';
  wrapper.append(link);

  block.textContent = '';
  block.append(wrapper);
}
