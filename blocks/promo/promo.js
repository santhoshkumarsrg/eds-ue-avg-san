import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Decorates the cross-promo block: a row of product cards (icon, title, platform
 * icons, text, "learn more" link). Each authored row is one card.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    const li = document.createElement('li');
    li.className = 'promo-card';
    moveInstrumentation(row, li);
    li.innerHTML = cell.innerHTML;
    const link = li.querySelector('a');
    if (link) link.classList.add('promo-link');
    list.append(li);
  });
  block.replaceChildren(list);
}
