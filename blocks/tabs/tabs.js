import { moveInstrumentation } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Reads a fragment path from a tab's reference cell. The aem-content field
 * renders as an anchor; fall back to trimmed text for authored plain paths.
 * @param {Element} [cell]
 * @returns {string}
 */
function fragmentPath(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a');
  return (link ? link.getAttribute('href') : cell.textContent.trim()) || '';
}

/**
 * Decorates the tabs block. Each child row is one Tab item (a `block/item`
 * resource): the first cell is the tab label, the second is a reference to a
 * fragment page whose content is loaded into the panel. A segmented control
 * switches between panels.
 *
 * EDS supports only a single level of nesting, so a Tab cannot itself hold
 * arbitrary blocks; instead each tab references a fragment that can contain any
 * blocks, and loadFragment renders it here. UE instrumentation is preserved so
 * each tab (label + fragment reference) stays selectable and editable.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const rows = [...block.children];

  const nav = document.createElement('div');
  nav.className = 'tabs-nav';
  nav.setAttribute('role', 'tablist');
  const panels = document.createElement('div');
  panels.className = 'tabs-panels';

  // Build the nav and panels synchronously so tab order is stable, then load
  // each fragment into its panel (fragments resolve at different times).
  const pending = rows.map((row, i) => {
    const [labelCell, refCell] = row.children;
    const id = `tab-${i}`;

    // The panel represents the Tab item, so it inherits the item instrumentation
    // (resource + model) and stays editable via the property panel in UE.
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

    // Mirror the tab label into the panel. Hidden on delivered pages (see
    // tabs.css); the editor reveals it so every stacked panel reads clearly.
    // Decorative only — the editable label field stays on the nav button.
    const panelLabel = document.createElement('p');
    panelLabel.className = 'tabs-panel-label';
    panelLabel.setAttribute('aria-hidden', 'true');
    panelLabel.textContent = button.textContent;
    panel.prepend(panelLabel);

    panels.append(panel);

    return { panel, refCell };
  });

  block.replaceChildren(nav, panels);

  // Load the referenced fragment into each panel. If it can't be resolved, keep
  // the reference cell so the field remains visible/editable in UE.
  await Promise.all(pending.map(async ({ panel, refCell }) => {
    const fragment = await loadFragment(fragmentPath(refCell));
    if (fragment) {
      panel.append(...fragment.childNodes);
    } else if (refCell) {
      refCell.classList.add('tabs-panel-content');
      panel.append(refCell);
    }
  }));

  nav.querySelectorAll('.tabs-tab').forEach((tab, i) => {
    tab.addEventListener('click', () => {
      nav.querySelectorAll('.tabs-tab').forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      panels.querySelectorAll('.tabs-panel').forEach((p, j) => { p.hidden = i !== j; });
    });
  });
}
