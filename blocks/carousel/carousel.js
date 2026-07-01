import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Decorates the carousel block. An optional text-only row becomes the header
 * (heading + "see all" link); every row containing an image becomes a slide
 * (image + title + text + link). Adds prev/next controls and dot indicators.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const header = document.createElement('div');
  header.className = 'carousel-header';
  const track = document.createElement('ul');
  track.className = 'carousel-track';

  rows.forEach((row) => {
    const cell = row.firstElementChild;
    if (!cell) return;
    if (cell.querySelector('picture, img')) {
      const li = document.createElement('li');
      li.className = 'carousel-slide';
      moveInstrumentation(row, li);
      li.innerHTML = cell.innerHTML;
      track.append(li);
    } else if (cell.textContent.trim()) {
      header.innerHTML = cell.innerHTML;
    }
  });

  track.querySelectorAll('picture > img').forEach((img) => {
    if (/\.svg($|\?)/i.test(img.src)) return;
    const pic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, pic.querySelector('img'));
    img.closest('picture').replaceWith(pic);
  });

  const viewport = document.createElement('div');
  viewport.className = 'carousel-viewport';
  viewport.append(track);

  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-arrow carousel-prev';
  prev.setAttribute('aria-label', 'Previous');
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-arrow carousel-next';
  next.setAttribute('aria-label', 'Next');
  controls.append(prev, next);

  const dots = document.createElement('div');
  dots.className = 'carousel-dots';
  const slides = [...track.children];
  slides.forEach((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => slide.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }));
    dots.append(dot);
  });

  const scrollByStep = (dir) => {
    const step = slides[0] ? slides[0].getBoundingClientRect().width + 24 : 300;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(1));

  const updateDots = () => {
    const { scrollLeft } = track;
    const step = slides[0] ? slides[0].getBoundingClientRect().width + 24 : 300;
    const active = Math.round(scrollLeft / step);
    [...dots.children].forEach((d, i) => d.classList.toggle('active', i === active));
  };
  track.addEventListener('scroll', updateDots, { passive: true });
  updateDots();

  if (header.querySelector('h1, h2, h3, p, a')) header.append(controls);
  block.replaceChildren(header, viewport, dots);
}
