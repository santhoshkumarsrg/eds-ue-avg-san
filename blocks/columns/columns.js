import { decorateBlock, loadBlock } from '../../scripts/aem.js';
import { wireDownload } from '../cta-button/cta-button.js';

export default async function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  // EDS only auto-loads top-level blocks. A "Button" (cta-button) authored
  // inside a column is a nested block, so decorate and load it here.
  const nestedBlocks = [...block.querySelectorAll('.cta-button')]
    .filter((el) => !el.dataset.blockStatus);
  await Promise.all(nestedBlocks.map(async (nested) => {
    decorateBlock(nested);
    await loadBlock(nested);
  }));

  // brand buttons for the prose variation (AVG green CTA)
  if (block.classList.contains('prose')) {
    block.querySelectorAll('a.button').forEach((btn) => {
      btn.classList.add('avg');
      // core Button component wraps in p.button-container; normalize to the
      // project's button-wrapper so spacing rules apply consistently
      const wrapper = btn.closest('p');
      wrapper?.classList.add('button-wrapper');

      // Author renders the cta-button block, so the icon already sits inside
      // the anchor — nothing left to do when that's the case.
      if (btn.querySelector('img')) return;

      // On preview/live the delivery pipeline flattens that block into a plain
      // button, optionally followed by a standalone image paragraph and/or a
      // standalone Download Id text paragraph (authored field order: Link,
      // Button Image (Left), Button Image (Right), Download Id) — reconstruct
      // both so the CTA matches the authored experience.
      let next = wrapper?.nextElementSibling;
      if (next && next.tagName === 'P' && next.textContent.trim() === '') {
        const media = next.querySelector('picture, img');
        const img = next.querySelector('img');
        if (media && img) {
          img.classList.add('button-icon', 'button-icon-left');
          btn.prepend(media);
          const toRemove = next;
          next = next.nextElementSibling;
          toRemove.remove();
        }
      }

      if (next && next.tagName === 'P') {
        const downloadId = next.textContent.trim();
        if (downloadId && !next.querySelector('a, img, picture')) {
          next.remove();
          wireDownload(btn, downloadId);
        }
      }
    });
  }
}
