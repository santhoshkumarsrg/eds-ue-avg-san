import { moveInstrumentation } from '../../scripts/scripts.js';

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
 * Decorates the icon-button block: a Franklin-button-style CTA (link + text +
 * title + type) extended with authorable left/right icon images rendered inside
 * the anchor. Authored fields render as rows in this order: Link (collapses to
 * the anchor), Button Image (Left), Button Image (Right).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  let linkCell;
  const iconCells = [];

  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    if (cell.querySelector('a')) linkCell = cell;
    else if (cell.querySelector('img')) iconCells.push(cell);
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

  const wrapper = document.createElement('p');
  wrapper.className = 'button-wrapper';
  wrapper.append(link);

  block.textContent = '';
  block.append(wrapper);
}
