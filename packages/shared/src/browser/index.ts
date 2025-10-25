var browserTool = require("browser-tool");

export const info = browserTool.browser.getInfo();

import type { ValueOf } from '../type'

const Browsers = {
    chrome: 'chrome',
    firefox: 'firefox',
    safari: 'safari',
    edge: 'edge',
    ie: 'ie',
    other: 'other',
} as const
const OSes = {
    windows: 'windows',
    macos: 'macos',
    linux: 'linux',
    android: 'android',
    ios: 'ios',
    other: 'other',
}
type OS = ValueOf<typeof OSes>
type Browser = ValueOf<typeof Browsers>
export { Browsers, OSes, type Browser, type OS }
declare global {
  interface Navigator {
    userAgent: string;
  }
  var navigator: Navigator | undefined;
}

interface BrowserInfo {
  userAgent: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
}

function getBrowserInfo(): BrowserInfo {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browserInfo: BrowserInfo = { userAgent };

  // Simple parsing of the user agent string for common browsers and OS
  // Note: UA sniffing can be unreliable and should be used with caution.
  // Feature detection is generally preferred for conditional logic.

  if (userAgent.includes("Chrome") && !userAgent.includes("Edge")) {
    browserInfo.browserName = Browsers.chrome;
    const chromeVersionMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (chromeVersionMatch) browserInfo.browserVersion = chromeVersionMatch[1];
  } else if (userAgent.includes("Firefox")) {
    browserInfo.browserName = Browsers.firefox;
    const firefoxVersionMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (firefoxVersionMatch) browserInfo.browserVersion = firefoxVersionMatch[1];
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browserInfo.browserName = Browsers.safari;
    const safariVersionMatch = userAgent.match(/Version\/(\d+\.\d+)/);
    if (safariVersionMatch) browserInfo.browserVersion = safariVersionMatch[1];
  } else if (userAgent.includes("Edge")) {
    browserInfo.browserName = Browsers.edge;
    const edgeVersionMatch = userAgent.match(/Edge\/(\d+\.\d+\.\d+\.\d+)/);
    if (edgeVersionMatch) browserInfo.browserVersion = edgeVersionMatch[1];
  } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
    browserInfo.browserName = Browsers.ie;
    const ieVersionMatch = userAgent.match(/(?:MSIE |rv:)(\d+\.\d+)/);
    if (ieVersionMatch) browserInfo.browserVersion = ieVersionMatch[1];
  }

  if (userAgent.includes("Windows NT")) {
    browserInfo.osName = OSes.windows;
    const osVersionMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
    if (osVersionMatch) browserInfo.osVersion = osVersionMatch[1];
  } else if (userAgent.includes("Macintosh")) {
    browserInfo.osName = OSes.macos;
    const osVersionMatch = userAgent.match(/Mac OS X (\d+_\d+_\d+)/);
    if (osVersionMatch) browserInfo.osVersion = osVersionMatch[1].replace(/_/g, ".");
  } else if (userAgent.includes("Linux")) {
    browserInfo.osName = OSes.linux;
  } else if (userAgent.includes("Android")) {
    browserInfo.osName = OSes.android;
    const osVersionMatch = userAgent.match(/Android (\d+\.\d+)/);
    if (osVersionMatch) browserInfo.osVersion = osVersionMatch[1];
  } else if (userAgent.includes("iOS")) {
    browserInfo.osName = OSes.ios;
    const osVersionMatch = userAgent.match(/OS (\d+_\d+)/);
    if (osVersionMatch) browserInfo.osVersion = osVersionMatch[1].replace(/_/g, ".");
  }

  return browserInfo;
}

// Example usage:
const browserDetails = getBrowserInfo();
console.log(browserDetails);

// To use in a header:
// const headers = {
//   'X-User-Agent': browserDetails.userAgent,
//   'X-Browser-Name': browserDetails.browserName || 'Unknown',
//   'X-Browser-Version': browserDetails.browserVersion || 'Unknown',
//   'X-OS-Name': browserDetails.osName || 'Unknown',
//   'X-OS-Version': browserDetails.osVersion || 'Unknown',
// };