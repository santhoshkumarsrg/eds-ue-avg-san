/**
 * Decorates the awards block: a row of award badges (logo + year + name)
 * flanked by decorative laurels. Each authored row is one award.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    const li = document.createElement('li');
    li.className = 'awards-badge';
    li.innerHTML = cell.innerHTML;
    list.append(li);
  });
  block.replaceChildren(list);
}
