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

  // Collect the footer pieces independent of how content sections are wrapped.
  const avgLogo = fragment.querySelector('img[src*="avg-logo"]')?.closest('picture');
  const genLogo = fragment.querySelector('img[src*="gen-logo"]')?.closest('picture');
  const region = fragment.querySelector('.footer-region');
  const account = fragment.querySelector('.footer-account');
  const list = fragment.querySelector('ul');

  const paragraphs = [...fragment.querySelectorAll('p')]
    .filter((p) => !p.classList.contains('footer-region')
      && !p.classList.contains('footer-account'));
  const legal = paragraphs.find((p) => /copyright|trademark/i.test(p.textContent));
  const genCopy = paragraphs.find((p) => p !== legal);

  block.textContent = '';
  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  // Row 1: brand on the left, region + account on the right.
  const top = document.createElement('div');
  top.className = 'footer-top';

  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  if (avgLogo) brand.append(avgLogo);
  top.append(brand);

  const tools = document.createElement('div');
  tools.className = 'footer-tools';
  if (region) tools.append(region);
  if (account) tools.append(account);
  top.append(tools);
  inner.append(top);

  // Row 2: Gen logo + description on a single line.
  const gen = document.createElement('div');
  gen.className = 'footer-gen';
  if (genLogo) {
    const genLogoWrap = document.createElement('div');
    genLogoWrap.className = 'footer-gen-logo';
    genLogoWrap.append(genLogo);
    gen.append(genLogoWrap);
  }
  if (genCopy) {
    genCopy.classList.add('footer-gen-copy');
    gen.append(genCopy);
  }
  inner.append(gen);

  // Row 3: legal copyright.
  if (legal) {
    const legalWrap = document.createElement('div');
    legalWrap.className = 'footer-legal';
    legalWrap.append(legal);
    inner.append(legalWrap);
  }

  // Row 4: footer links.
  if (list) {
    const links = document.createElement('nav');
    links.className = 'footer-links';
    links.setAttribute('aria-label', 'Footer');
    links.append(list);
    inner.append(links);
  }

  block.append(inner);
}
