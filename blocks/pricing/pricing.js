/**
 * Decorates the pricing panel. Authored as two rows:
 *  - row 1: a features cell followed by one cell per plan (device tier)
 *  - row 2: a single footer cell (e.g. "Try it free" line)
 * The block classifies the cells and turns the plan "Buy now" links into the
 * blue AVG buttons.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  rows.forEach((row) => {
    row.classList.add('pricing-row');
    const cells = [...row.children];
    if (cells.length > 1) {
      cells[0].classList.add('pricing-features');
      cells.slice(1).forEach((cell) => cell.classList.add('pricing-plan'));
    } else if (cells.length === 1) {
      cells[0].classList.add('pricing-footer');
    }
  });

  block.querySelectorAll('.pricing-plan a').forEach((link) => {
    link.classList.add('button', 'pricing-buy');
    const wrapper = link.closest('p');
    if (wrapper) wrapper.classList.add('pricing-buy-wrapper');
  });
}
