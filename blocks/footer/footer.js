import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  block.textContent = '';
  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  const rows = [...fragment.children];

  if (rows[0]) {
    const top = document.createElement('div');
    top.className = 'footer-top';
    const [brandCol, toolsCol] = [...rows[0].children];
    if (brandCol) {
      brandCol.className = 'footer-brand';
      top.append(brandCol);
    }
    if (toolsCol) {
      toolsCol.className = 'footer-tools';
      top.append(toolsCol);
    }
    inner.append(top);
  }

  if (rows[1]) {
    const gen = document.createElement('div');
    gen.className = 'footer-gen';
    [...rows[1].children].forEach((col, index) => {
      col.classList.add(index === 0 ? 'footer-gen-logo' : 'footer-gen-copy');
      gen.append(col);
    });
    inner.append(gen);
  }

  if (rows[2]) {
    const legal = document.createElement('div');
    legal.className = 'footer-legal';
    [...rows[2].children].forEach((col) => legal.append(col));
    inner.append(legal);
  }

  if (rows[3]) {
    const links = document.createElement('nav');
    links.className = 'footer-links';
    links.setAttribute('aria-label', 'Footer');
    const list = rows[3].querySelector('ul');
    if (list) links.append(list);
    inner.append(links);
  }

  block.append(inner);
}
