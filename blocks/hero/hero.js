import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Builds an element from a field cell, unwrapping a lone <p> wrapper that EDS
 * adds around plain-text fields so the markup stays semantic (and instrumentation
 * is preserved for the Universal Editor).
 */
function buildFromCell(tag, cell) {
  const el = document.createElement(tag);
  const inner = cell.querySelector(':scope > p');
  const source = inner && cell.children.length === 1 ? inner : cell;
  el.innerHTML = source.innerHTML;
  moveInstrumentation(source, el);
  return el;
}

/**
 * Decorates the hero block.
 * The block is authored as a simple model with discrete fields rendered as rows
 * in this order: Background Image, Heading, Subheading, Button (link + label).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  let imageCell;
  let headingCell;
  const paragraphCells = [];
  let linkCell;

  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    if (cell.querySelector('img')) {
      imageCell = cell;
    } else if (cell.querySelector('a')) {
      linkCell = cell;
    } else if (cell.textContent.trim()) {
      if (!headingCell) headingCell = cell;
      else paragraphCells.push(cell);
    }
  });

  const content = document.createElement('div');
  content.className = 'hero-content';

  if (headingCell) {
    content.append(buildFromCell('h1', headingCell));
  }

  paragraphCells.forEach((cell) => {
    content.append(buildFromCell('p', cell));
  });

  if (linkCell) {
    const link = linkCell.querySelector('a');
    link.classList.add('button', 'avg');
    const wrapper = document.createElement('p');
    wrapper.className = 'button-wrapper';
    moveInstrumentation(linkCell, link);
    wrapper.append(link);
    content.append(wrapper);
  }

  let picture;
  if (imageCell) {
    const img = imageCell.querySelector('img');
    if (/\.svg($|\?)/i.test(img.src)) {
      picture = img.closest('picture') || img;
    } else {
      picture = createOptimizedPicture(img.src, img.alt, true, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '750' },
      ]);
      moveInstrumentation(img, picture.querySelector('img'));
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';

  block.textContent = '';
  if (picture) block.append(picture);
  block.append(overlay);
  block.append(content);
}
