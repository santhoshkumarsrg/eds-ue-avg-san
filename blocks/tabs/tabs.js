/**
 * Decorates the tabs block. Each row is a tab: cell 1 is the tab label, cell 2
 * is the panel content. A panel's <ul> is turned into an accordion (each <li>
 * question toggles its answer). A segmented control switches between panels.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const nav = document.createElement('div');
  nav.className = 'tabs-nav';
  nav.setAttribute('role', 'tablist');
  const panels = document.createElement('div');
  panels.className = 'tabs-panels';

  rows.forEach((row, i) => {
    const [labelCell, panelCell] = row.children;
    const id = `tab-${i}`;

    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', id);
    button.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    button.textContent = labelCell ? labelCell.textContent.trim() : `Tab ${i + 1}`;
    nav.append(button);

    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = id;
    panel.setAttribute('role', 'tabpanel');
    if (i !== 0) panel.hidden = true;
    if (panelCell) panel.innerHTML = panelCell.innerHTML;

    // turn the panel's list into an accordion
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
}
