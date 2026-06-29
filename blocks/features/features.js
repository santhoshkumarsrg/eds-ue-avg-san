import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function optimizePicture(picture) {
  const img = picture?.querySelector('img');
  if (!img || /\.svg($|\?)/i.test(img.src)) return;
  const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '160' }]);
  moveInstrumentation(img, optimized.querySelector('img'));
  picture.replaceWith(optimized);
}

/**
 * Decorates the features block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    const cols = [...li.children];
    if (cols.length >= 2) {
      cols[0].classList.add('features-icon');
      cols[1].classList.add('features-body');

      const picture = cols[0].querySelector('picture');
      optimizePicture(picture);
    }

    ul.append(li);
  });
  block.replaceChildren(ul);
}
