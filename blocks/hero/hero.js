import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function optimizePicture(picture, alt, eager, breakpoints) {
  const img = picture?.querySelector('img');
  if (!img || /\.svg($|\?)/i.test(img.src)) return;
  const optimized = createOptimizedPicture(img.src, alt || img.alt, eager, breakpoints);
  moveInstrumentation(img, optimized.querySelector('img'));
  picture.replaceWith(optimized);
}

/**
 * Decorates the hero block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  block.prepend(overlay);

  const content = document.createElement('div');
  content.className = 'hero-content';

  [...block.children].forEach((row) => {
    if (row === overlay) return;
    const picture = row.querySelector('picture');
    if (picture) {
      optimizePicture(
        picture,
        picture.querySelector('img')?.alt,
        true,
        [{ media: '(min-width: 900px)', width: '2000' }, { width: '750' }],
      );
      return;
    }
    moveInstrumentation(row, content);
    content.append(row);
  });

  if (content.children.length) {
    block.append(content);
  }

  block.querySelectorAll('a.button').forEach((btn) => {
    btn.classList.add('avg');
    // core Button component wraps in p.button-container; normalize to the
    // project's button-wrapper so hero spacing rules apply consistently
    btn.closest('p')?.classList.add('button-wrapper');
  });
}
