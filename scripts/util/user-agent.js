/**
 * User-agent detection: os / browser / platform.
 * Ports avast2 `theme/js/user-agent-detection.js`.
 *
 * The detection values are a reporting contract — `session.platform` in the SDL
 * is `os.get().name.toLowerCase()` — so the matcher tables and their ordering
 * are kept identical to avast2 rather than modernized. Two deliberate
 * differences from the original:
 *
 * - Version extraction uses optional chaining, so a user agent that names an OS
 *   without a parseable version yields `'unknown'` instead of throwing.
 * - `init()` and `getHash()` are not ported. They implement hash-based OS
 *   content switching against `window.osPlatforms`, which is a separate feature
 *   from detection and has no EDS equivalent.
 *
 * Also assigned to `window.userAgentDetection` because that global is the shape
 * avast2 established and third-party container code may read it.
 */

/** OS matchers, in avast2 order — first regex to match the UA string wins. */
const OS_CLIENT_STRINGS = [
  { s: 'Windows 10/11', r: /(Windows NT 10.0)/ },
  { s: 'Android', r: /Android/ },
  { s: 'iOS', r: /(iPhone|iPad|iPod)/ },
  { s: 'Mac OS X', r: /Mac OS X/ },
  { s: 'Mac OS', r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/ },
  { s: 'Windows 7', r: /(Windows 7|Windows NT 6.1)/ },
  { s: 'Windows 8.1', r: /(Windows 8.1|Windows NT 6.3)/ },
  { s: 'Windows 8', r: /(Windows 8|Windows NT 6.2)/ },
  { s: 'Windows other', r: /(Windows NT)/ },
  { s: 'Linux', r: /(Linux|X11)/ },
  { s: 'Open BSD', r: /OpenBSD/ },
  { s: 'Sun OS', r: /SunOS/ },
  { s: 'QNX', r: /QNX/ },
  { s: 'UNIX', r: /UNIX/ },
  { s: 'Search Bot', r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/ },
];

/**
 * Detects the operating system name and version.
 * @returns {{ name: string, versionString: string }}
 */
export function getOs() {
  const nVer = navigator.appVersion;
  const nAgt = navigator.userAgent;
  let osVersion = 'unknown';
  let os = OS_CLIENT_STRINGS.find(({ r }) => r.test(nAgt))?.s || 'unknown';

  if (/Windows/.test(os)) {
    osVersion = /Windows (.*)/.exec(os)?.[1] || 'unknown';
    os = 'Windows';
  }

  if (os === 'Mac OS X') {
    os = 'Mac';
    osVersion = /Mac OS X (10[._\d]+)/.exec(nAgt)?.[1] || 'unknown';
  } else if (os === 'Android') {
    osVersion = /Android ([._\d]+)/.exec(nAgt)?.[1] || 'unknown';
  } else if (os === 'iOS') {
    const match = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
    osVersion = match
      ? `${match[1]}.${match[2]}.${Number(match[3]) || 0}`
      : 'unknown';
  }

  return { name: os, versionString: osVersion };
}

/**
 * Detects the browser name and version.
 * The branch order matters: Opera masquerades as Chrome, Chrome on iOS
 * masquerades as Safari, and Edge announces both.
 * @returns {{ name: string, version: number, versionString: string }}
 */
export function getBrowser() {
  const nAgt = navigator.userAgent;
  let browser = navigator.appName;
  let version = `${parseFloat(navigator.appVersion)}`;

  const at = (token) => nAgt.indexOf(token);
  const opera = at('Opera');
  const opr = at('OPR');
  const edg = at('Edg');
  const msie = at('MSIE');
  const trident = at('Trident/');
  const chrome = at('Chrome');
  const crios = at('CriOS');
  const safari = at('Safari');
  const firefox = at('Firefox');
  const versionToken = at('Version');

  if (opera !== -1) {
    browser = 'Opera';
    version = versionToken !== -1
      ? nAgt.substring(versionToken + 8)
      : nAgt.substring(opera + 6);
  } else if (opr !== -1) {
    browser = 'Opera';
    version = nAgt.substring(opr + 4);
  } else if (edg !== -1) {
    browser = 'Edge';
    version = nAgt.substring(edg + 4);
  } else if (msie !== -1) {
    browser = 'Microsoft Internet Explorer';
    version = nAgt.substring(msie + 5);
  } else if (trident !== -1) {
    browser = 'Microsoft Internet Explorer';
    version = nAgt.substring(at('rv:') + 3);
  } else if (chrome !== -1) {
    browser = 'Chrome';
    version = nAgt.substring(chrome + 7);
  } else if (crios !== -1) {
    browser = 'Chrome';
    version = nAgt.substring(crios + 6);
  } else if (safari !== -1) {
    browser = 'Safari';
    version = versionToken !== -1
      ? nAgt.substring(versionToken + 8)
      : nAgt.substring(safari + 7);
  } else if (firefox !== -1) {
    browser = 'Firefox';
    version = nAgt.substring(firefox + 8);
  } else {
    const nameOffset = nAgt.lastIndexOf(' ') + 1;
    const slashOffset = nAgt.lastIndexOf('/');
    if (nameOffset < slashOffset) {
      browser = nAgt.substring(nameOffset, slashOffset);
      version = nAgt.substring(slashOffset + 1);
      // A name with no letters is a UA token, not a browser name.
      if (browser.toLowerCase() === browser.toUpperCase()) {
        browser = navigator.appName;
      }
    }
  }

  version = [';', ' ', ')'].reduce((value, char) => {
    const ix = value.indexOf(char);
    return ix === -1 ? value : value.substring(0, ix);
  }, version);

  let majorVersion = parseInt(version, 10);
  if (Number.isNaN(majorVersion)) {
    version = `${parseFloat(navigator.appVersion)}`;
    majorVersion = parseInt(navigator.appVersion, 10);
  }

  return { name: browser, version: majorVersion, versionString: version };
}

/** Maps between detected OS names and the platform tokens used in content. */
const alias = {
  ScreenLabelToPlatform: {
    windows: 'pc',
    mac: 'mac',
    android: 'android',
    ios: 'ios',
  },
  dataPlatformToScreenLabel: {
    pc: 'Windows',
    mac: 'Mac',
    android: 'Android',
    ios: 'iOS',
  },
};

const userAgentDetection = {
  alias,
  browser: {
    get: getBrowser,
    getWithFallback: () => {
      const browserName = getBrowser().name.toLowerCase();
      return /safari|firefox|chrome|edge|opera|microsoft internet explorer/.test(browserName)
        ? browserName
        : 'chrome';
    },
    getType: () => {
      if (navigator.userAgent.includes('Mobile')) return 'Mobile Browser';
      if (navigator.userAgent.includes('Bot')) return 'Bot';
      return 'Browser';
    },
  },
  os: {
    get: getOs,
    isMac: () => getOs().name === 'Mac',
    isWindows: () => getOs().name === 'Windows',
    isAndroid: () => getOs().name === 'Android',
    isIOS: () => getOs().name === 'iOS',
    isSame: (inputPlatformName) => {
      const devicePlatformName = getOs().name;
      const platform = (inputPlatformName || '').toLowerCase();
      const corrected = alias.dataPlatformToScreenLabel[platform] || platform;
      return corrected.toLowerCase() === devicePlatformName.toLowerCase();
    },
  },
  platform: {
    get: () => {
      const osName = getOs().name.toLowerCase();
      return alias.ScreenLabelToPlatform[osName] || osName;
    },
    getWithFallback: () => {
      const osName = getOs().name.toLowerCase();
      return /mac|windows|android|ios/.test(osName) ? osName : 'pc';
    },
  },
};

if (typeof window !== 'undefined') {
  window.userAgentDetection = userAgentDetection;
}

export default userAgentDetection;
