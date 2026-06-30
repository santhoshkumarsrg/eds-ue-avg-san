export default function decorate(block) {
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

  // brand buttons for the prose variation (AVG green CTA)
  if (block.classList.contains('prose')) {
    block.querySelectorAll('a.button').forEach((btn) => {
      btn.classList.add('avg');
      // core Button component wraps in p.button-container; normalize to the
      // project's button-wrapper so spacing rules apply consistently
      btn.closest('p')?.classList.add('button-wrapper');
    });
  }
}
