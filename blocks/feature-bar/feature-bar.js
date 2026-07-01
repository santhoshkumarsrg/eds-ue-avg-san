/**
 * Decorates the feature bar. Authored as one cell per row: an optional intro
 * "tab" row (text only) followed by feature rows (icon + label). Renders a white
 * card with the tab pill on top and the features in a row.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const tab = document.createElement('div');
  tab.className = 'feature-bar-tab';
  const list = document.createElement('ul');
  let hasTab = false;

  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    if (cell.querySelector('img')) {
      const li = document.createElement('li');
      li.innerHTML = cell.innerHTML;
      list.append(li);
    } else if (cell.textContent.trim()) {
      tab.innerHTML = cell.innerHTML;
      hasTab = true;
    }
  });

  block.textContent = '';
  if (hasTab) block.append(tab);
  block.append(list);
}
