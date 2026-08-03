import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGE_GROUP,
  buildScreenName,
  getVanityPathFromUrl,
  normalizeVanityPath,
  remapCountry,
  resolveLocale,
  findVariantMapping,
  buildRelativeScreenPath,
  homepageToIndex,
  screenNameFromVanity,
  getContentSegments,
  resolveSiteSectionsFromPath,
} from './utils.js';

describe('getVanityPathFromUrl', () => {
  it('strips locale prefix and returns remaining path', () => {
    assert.equal(
      getVanityPathFromUrl('/en-us/products/privacy/antitrack'),
      'products/privacy/antitrack',
    );
  });

  it('returns empty string for locale-only path', () => {
    assert.equal(getVanityPathFromUrl('/en-ww'), '');
    assert.equal(getVanityPathFromUrl('/en-ww/'), '');
  });

  it('handles paths without locale prefix', () => {
    assert.equal(getVanityPathFromUrl('/products/foo'), 'products/foo');
  });
});

describe('normalizeVanityPath', () => {
  it('strips leading/trailing slashes and lowercases', () => {
    assert.equal(normalizeVanityPath('/Products/Foo/'), 'products/foo');
  });

  it('returns empty for blank input', () => {
    assert.equal(normalizeVanityPath(''), '');
    assert.equal(normalizeVanityPath(null), '');
  });
});

describe('buildScreenName', () => {
  it('uses vanity path with locale in URL', () => {
    assert.equal(
      buildScreenName('en', 'us', 'products/foo', 'products/foo'),
      'en-us | en-us/products/foo',
    );
  });

  it('maps homepage to index when no vanity', () => {
    assert.equal(
      buildScreenName('en', 'ww', 'homepage', ''),
      'en-ww | en-ww/index',
    );
  });

  it('builds from relative path when no vanity', () => {
    assert.equal(
      buildScreenName('en', 'us', 'products/privacy', ''),
      'en-us | en-us/products/privacy',
    );
  });

  it('returns empty when required parts are null', () => {
    assert.equal(buildScreenName(null, 'us', 'x', ''), '');
  });
});

describe('screenNameFromVanity', () => {
  it('does not double-prefix locale when vanity already includes it', () => {
    assert.equal(
      screenNameFromVanity('en-us', true, 'en-us/lp-offer'),
      'en-us | en-us/lp-offer',
    );
  });
});

describe('remapCountry / resolveLocale', () => {
  it('remaps uk+en to gb', () => {
    assert.deepEqual(remapCountry('en', 'uk'), { siteLanguage: 'en', siteCountry: 'gb' });
  });

  it('remaps lm+es to lam', () => {
    assert.deepEqual(remapCountry('es', 'lm'), { siteLanguage: 'es', siteCountry: 'lam' });
  });

  it('resolves locale from pathname when no lang hint', () => {
    assert.deepEqual(
      resolveLocale({ langHint: '', pathname: '/fr-fr/products' }),
      { siteLanguage: 'fr', siteCountry: 'fr' },
    );
  });

  it('prefers lang hint over pathname', () => {
    assert.deepEqual(
      resolveLocale({ langHint: 'en-ww', pathname: '/fr-fr/products' }),
      { siteLanguage: 'en', siteCountry: 'ww' },
    );
  });

  it('defaults to en-ww', () => {
    assert.deepEqual(
      resolveLocale({ langHint: '', pathname: '/' }),
      { siteLanguage: 'en', siteCountry: 'ww' },
    );
  });
});

describe('path helpers', () => {
  it('getContentSegments drops locale', () => {
    assert.deepEqual(
      getContentSegments('/en-us/products/privacy'),
      ['products', 'privacy'],
    );
  });

  it('resolveSiteSectionsFromPath matches depth rules', () => {
    assert.deepEqual(
      resolveSiteSectionsFromPath(['products', 'privacy', 'antitrack']),
      { siteSubSection: 'products', siteSubSubSection: 'privacy' },
    );
    assert.deepEqual(
      resolveSiteSectionsFromPath(['products', 'premium-security']),
      { siteSubSection: 'products', siteSubSubSection: 'missing' },
    );
    assert.deepEqual(
      resolveSiteSectionsFromPath(['products']),
      { siteSubSection: 'na', siteSubSubSection: 'missing' },
    );
  });

  it('buildRelativeScreenPath joins normalized segments', () => {
    assert.equal(
      buildRelativeScreenPath(['Products', 'Privacy'], 'fallback'),
      'products/privacy',
    );
  });

  it('homepageToIndex', () => {
    assert.equal(homepageToIndex('homepage'), 'index');
    assert.equal(homepageToIndex('products'), 'products');
  });
});

describe('findVariantMapping', () => {
  it('finds matching expIdParam', () => {
    const json = JSON.stringify([
      { expIdParam: 'v2', pageName: 'page-v2', contentTitle: 'Title V2' },
    ]);
    assert.deepEqual(findVariantMapping(json, 'v2'), {
      expIdParam: 'v2',
      pageName: 'page-v2',
      contentTitle: 'Title V2',
    });
  });

  it('returns null for invalid JSON or miss', () => {
    assert.equal(findVariantMapping('not-json', 'v2'), null);
    assert.equal(findVariantMapping('[]', 'v2'), null);
  });
});

describe('pageGroup', () => {
  it('is hardcoded to Homepage', () => {
    assert.equal(PAGE_GROUP, 'Homepage');
  });
});
