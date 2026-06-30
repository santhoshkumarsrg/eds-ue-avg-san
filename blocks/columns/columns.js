import { decorateBlock, loadBlock } from '../../scripts/aem.js';

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

  // EDS only auto-loads top-level blocks. A "Button (Icons)" (icon-button)
  // authored inside a column is a nested block, so decorate and load it here.
  const nestedBlocks = [...block.querySelectorAll('.icon-button')]
    .filter((el) => !el.dataset.blockStatus);
  await Promise.all(nestedBlocks.map(async (nested) => {
    decorateBlock(nested);
    await loadBlock(nested);
  }));

  // brand buttons for the prose variation (AVG green CTA). Skip anchors that
  // belong to a nested icon-button block — it brings its own AVG styling.
  if (block.classList.contains('prose')) {
    block.querySelectorAll('a.button').forEach((btn) => {
      if (btn.closest('.icon-button')) return;
      btn.classList.add('avg');
      // core Button component wraps in p.button-container; normalize to the
      // project's button-wrapper so spacing rules apply consistently
      btn.closest('p')?.classList.add('button-wrapper');
    });
  }
}
