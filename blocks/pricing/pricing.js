import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Rich-text field cells wrap their content in a single <p>. Return the inner
 * markup without that wrapper so we can re-home it under our own class.
 * @param {Element} cell
 * @returns {string}
 */
function unwrap(cell) {
  if (cell.childElementCount === 1 && cell.firstElementChild.tagName === 'P') {
    return cell.firstElementChild.innerHTML;
  }
  return cell.innerHTML;
}

/**
 * Builds a classed paragraph from a field cell, preserving UE instrumentation.
 * @param {string} className
 * @param {Element} cell source field cell
 * @param {string} [html] explicit inner HTML (defaults to the unwrapped cell)
 * @returns {HTMLParagraphElement}
 */
function para(className, cell, html) {
  const p = document.createElement('p');
  p.className = className;
  moveInstrumentation(cell, p);
  p.innerHTML = html !== undefined ? html : unwrap(cell);
  return p;
}

/**
 * Builds one plan card from a Pricing Plan item row. Fields render as cells in
 * model order: device, platform icon, save badge, was/intro price, works-out
 * label, price currency/amount/period, buy link, fine print, then the hidden
 * sku + campaign code (surfaced as data attributes for the pricing API lookup).
 * @param {Element} row
 * @returns {HTMLDivElement}
 */
function buildPlan(row) {
  const cells = [...row.children];
  const [
    device, platforms, save, priceWas, worksout, cur, amt, per, buy, note, sku, campaign,
  ] = cells;

  const plan = document.createElement('div');
  plan.className = 'pricing-plan';
  moveInstrumentation(row, plan);

  const skuValue = sku?.textContent.trim();
  if (skuValue) {
    plan.dataset.sku = skuValue;
    const campaignValue = campaign?.textContent.trim();
    if (campaignValue) plan.dataset.campaign = campaignValue;
  }

  if (device?.textContent.trim()) {
    plan.append(para('pricing-device', device, device.textContent.trim()));
  }

  const platformImg = platforms?.querySelector('picture, img');
  if (platformImg) {
    const p = document.createElement('p');
    p.className = 'pricing-platforms';
    moveInstrumentation(platforms, p);
    p.append(platformImg);
    plan.append(p);
  }

  if (save?.textContent.trim()) {
    plan.append(para('pricing-save', save, save.textContent.trim()));
  }

  if (priceWas?.textContent.trim()) {
    plan.append(para('pricing-was', priceWas));
  }

  if (worksout?.textContent.trim()) {
    plan.append(para('pricing-worksout', worksout, worksout.textContent.trim()));
  }

  const curText = cur?.textContent.trim() || '';
  const amtText = amt?.textContent.trim() || '';
  const perText = per?.textContent.trim() || '';
  if (curText || amtText || perText) {
    const price = document.createElement('p');
    price.className = 'pricing-price';
    [['cur', curText], ['amt', amtText], ['per', perText]].forEach(([cls, text]) => {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      price.append(span);
    });
    plan.append(price);
  }

  const buyLink = buy?.querySelector('a');
  if (buyLink) {
    buyLink.classList.add('button', 'pricing-buy');
    const wrapper = document.createElement('p');
    wrapper.className = 'pricing-buy-wrapper';
    moveInstrumentation(buy, wrapper);
    wrapper.append(buyLink);
    plan.append(wrapper);
  }

  if (note?.textContent.trim()) {
    plan.append(para('pricing-note', note));
  }

  return plan;
}

/**
 * Moves a single-cell block-level field into a classed wrapper, keeping the
 * child nodes (and instrumentation) intact.
 * @param {Element} cell
 * @param {string} className
 * @returns {HTMLDivElement}
 */
function buildBand(cell, className) {
  const band = document.createElement('div');
  band.className = className;
  moveInstrumentation(cell, band);
  while (cell.firstChild) band.append(cell.firstChild);
  return band;
}

/**
 * Decorates the pricing panel. The block is authored as block-level "features"
 * and "footer" rich-text fields plus one Pricing Plan item per device tier.
 * Plans arrive as multi-cell rows; the block-level fields arrive as single-cell
 * rows (features has the bullet list, footer does not).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  let features;
  let footer;
  const plans = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 5) {
      plans.push(buildPlan(row));
    } else if (cells.length === 1) {
      const cell = cells[0];
      if (cell.querySelector('ul')) features = buildBand(cell, 'pricing-features');
      else footer = buildBand(cell, 'pricing-footer');
    }
  });

  block.textContent = '';

  const topRow = document.createElement('div');
  topRow.className = 'pricing-row';
  if (features) topRow.append(features);
  plans.forEach((plan) => topRow.append(plan));
  block.append(topRow);

  if (footer) {
    const footerRow = document.createElement('div');
    footerRow.className = 'pricing-row';
    footerRow.append(footer);
    block.append(footerRow);
  }
}
