import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Decorates the product hero block. Authored as one cell per row in this order:
 * eyebrow (icon + label), heading (H1), subtitle, rating (logo + stars + reviews),
 * and a CTA link. The block centers the content and turns the link into the green
 * AVG download button.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const content = document.createElement('div');
  content.className = 'product-hero-content';

  let eyebrowSeen = false;

  [...block.children].forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell || (!cell.textContent.trim() && !cell.querySelector('img'))) return;

    if (cell.querySelector('h1')) {
      const h1 = cell.querySelector('h1');
      moveInstrumentation(cell, h1);
      content.append(h1);
    } else if (cell.querySelector('a')) {
      const link = cell.querySelector('a');
      link.classList.add('button', 'avg');
      moveInstrumentation(cell, link);
      const wrapper = document.createElement('p');
      wrapper.className = 'button-wrapper';
      wrapper.append(link);
      content.append(wrapper);
    } else if (cell.querySelector('img') && !eyebrowSeen) {
      const p = document.createElement('p');
      p.className = 'product-hero-eyebrow';
      p.innerHTML = cell.innerHTML;
      moveInstrumentation(cell, p);
      content.append(p);
      eyebrowSeen = true;
    } else if (cell.querySelector('img')) {
      const p = document.createElement('p');
      p.className = 'product-hero-rating';
      p.innerHTML = cell.innerHTML;
      moveInstrumentation(cell, p);
      content.append(p);
    } else {
      const p = document.createElement('p');
      p.className = 'product-hero-subtitle';
      p.innerHTML = cell.innerHTML;
      moveInstrumentation(cell, p);
      content.append(p);
    }
  });

  block.replaceChildren(content);
}
