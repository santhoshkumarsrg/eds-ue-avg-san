/**
 * Decorates the steps block. Each row is one step (icon + heading + text).
 * Steps render in a row with a chevron separator between them on desktop.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    const li = document.createElement('li');
    li.className = 'steps-step';
    li.innerHTML = cell.innerHTML;
    list.append(li);
  });
  block.replaceChildren(list);
}
