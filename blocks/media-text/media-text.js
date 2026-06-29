import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function optimizePicture(picture, breakpoints) {
  const img = picture?.querySelector('img');
  if (!img || /\.svg($|\?)/i.test(img.src)) return;
  const optimized = createOptimizedPicture(
    img.src,
    img.alt,
    false,
    breakpoints,
  );
  moveInstrumentation(img, optimized.querySelector('img'));
  picture.replaceWith(optimized);
}

/**
 * Decorates the media-text block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const row = block.children[0];
  if (!row) return;

  const cols = [...row.children];
  if (cols.length < 2) return;

  const imageCol = cols.find((col) => col.querySelector('picture'));
  const textCol = cols.find((col) => col !== imageCol);

  if (imageCol) {
    imageCol.classList.add('media-text-image');
    const picture = imageCol.querySelector('picture');
    optimizePicture(picture, [{ media: '(min-width: 900px)', width: '1100' }, { width: '750' }]);
  }

  if (textCol) {
    textCol.classList.add('media-text-body');
    textCol.querySelectorAll('a.button').forEach((btn) => {
      btn.classList.add('avg');
    });
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'media-text-inner';
  if (imageCol) wrapper.append(imageCol);
  if (textCol) wrapper.append(textCol);
  row.replaceChildren(wrapper);
}
