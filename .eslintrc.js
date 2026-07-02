module.exports = {
  root: true,
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    // raise the default 4-cell limit for two blocks: the hero (background image,
    // heading, subheading, CTA link, left/right button icons) and the pricing
    // plan card (device, platform icon, save badge, was/intro price, works-out
    // label, price currency/amount/period, buy link + label, note, plus the
    // hidden sku + campaign code used for live pricing lookups)
    'xwalk/max-cells': ['error', { hero: 6, 'pricing-plan': 13 }],
  },
};
