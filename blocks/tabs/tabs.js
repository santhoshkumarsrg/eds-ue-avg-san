import { moveInstrumentation } from '../../scripts/scripts.js';
import { decorateBlock, loadBlock } from '../../scripts/aem.js';

/**
 * "Button (Icons)" (icon-button) is a nested block. EDS only auto-loads
 * top-level blocks, so decorate + load any authored inside a tab panel (author),
 * and rebuild the flattened button+icon markup on preview/live.
 * @param {Element} root the tabs block
 */
async function loadNestedIconButtons(root) {
  const nested = [...root.querySelectorAll('.icon-button')].filter((el) => !el.dataset.blockStatus);
  await Promise.all(nested.map(async (el) => {
    decorateBlock(el);
    await loadBlock(el);
  }));

  // On preview/live the delivery pipeline flattens the icon-button block into a
  // plain button followed by a standalone image paragraph; pull the icon back
  // into the anchor so the CTA matches the authored experience.
  root.querySelectorAll('a.button').forEach((btn) => {
    if (btn.querySelector('img')) return;
    const wrapper = btn.closest('p');
    const next = wrapper?.nextElementSibling;
    if (next && next.tagName === 'P' && next.textContent.trim() === '') {
      const media = next.querySelector('picture, img');
      const img = next.querySelector('img');
      if (media && img) {
        img.classList.add('button-icon', 'button-icon-left');
        btn.prepend(media);
        next.remove();
      }
    }
  });
}

/**
 * Turns a panel's <ul> into an FAQ-style accordion (each <li> question toggles
 * its answer). Only run outside the Universal Editor, so authored rich text
 * stays directly editable while authoring.
 * @param {Element} panel
 */
function buildAccordions(panel) {
  panel.querySelectorAll(':scope ul').forEach((ul) => {
    const acc = document.createElement('div');
    acc.className = 'tabs-accordion';
    [...ul.children].forEach((li) => {
      const item = document.createElement('div');
      item.className = 'tabs-faq';
      const q = document.createElement('button');
      q.className = 'tabs-faq-q';
      q.type = 'button';
      q.setAttribute('aria-expanded', 'false');
      const answer = li.querySelector('div, p');
      const label = document.createElement('span');
      if (answer) {
        const clone = li.cloneNode(true);
        clone.querySelectorAll('div, p').forEach((el) => el.remove());
        label.textContent = clone.textContent.trim();
      } else {
        label.textContent = li.textContent.trim();
      }
      q.append(label);
      const a = document.createElement('div');
      a.className = 'tabs-faq-a';
      a.hidden = true;
      if (answer) a.innerHTML = answer.innerHTML || answer.outerHTML;
      q.addEventListener('click', () => {
        const open = q.getAttribute('aria-expanded') === 'true';
        q.setAttribute('aria-expanded', open ? 'false' : 'true');
        a.hidden = open;
      });
      item.append(q, a);
      acc.append(item);
    });
    ul.replaceWith(acc);
  });
}

/**
 * Decorates the tabs block. Each child row is one Tab item (a `block/item`
 * resource): the first cell is the tab label, and every following cell is the
 * tab's composed panel content (Title / Text / Image / Button / Button (Icons)
 * default-content components added freely in UE). A segmented control switches
 * between panels.
 *
 * UE instrumentation is preserved via moveInstrumentation so each tab item stays
 * visible and editable in the Universal Editor content tree — the label field
 * moves onto its tab button and the composed content moves into its panel.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const rows = [...block.children];
  // In the Universal Editor each authored item row carries a resource id.
  const inEditor = rows.some((row) => row.hasAttribute('data-aue-resource'));

  const nav = document.createElement('div');
  nav.className = 'tabs-nav';
  nav.setAttribute('role', 'tablist');
  const panels = document.createElement('div');
  panels.className = 'tabs-panels';

  rows.forEach((row, i) => {
    const [labelCell, ...contentCells] = row.children;
    const id = `tab-${i}`;

    // The panel represents the Tab item, so it inherits the item instrumentation.
    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = id;
    panel.setAttribute('role', 'tabpanel');
    if (i !== 0) panel.hidden = true;
    moveInstrumentation(row, panel);

    // The tab button carries the label field so its text stays editable in UE.
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', id);
    button.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    if (labelCell) {
      moveInstrumentation(labelCell, button);
      button.append(...labelCell.childNodes);
    }
    if (!button.textContent.trim()) button.textContent = `Tab ${i + 1}`;
    nav.append(button);

    // Move the composed content cells into the panel, keeping instrumentation.
    contentCells.forEach((cell) => {
      cell.classList.add('tabs-panel-content');
      panel.append(cell);
    });
    if (!inEditor) buildAccordions(panel);
    panels.append(panel);
  });

  nav.querySelectorAll('.tabs-tab').forEach((tab, i) => {
    tab.addEventListener('click', () => {
      nav.querySelectorAll('.tabs-tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      panels.querySelectorAll('.tabs-panel').forEach((p, j) => { p.hidden = i !== j; });
    });
  });

  block.replaceChildren(nav, panels);

  await loadNestedIconButtons(block);
}
