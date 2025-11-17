declare module 'browser-tool' {
  interface BrowserInfo {
    userAgent: string
    browserName?: string
    browserVersion?: string
    osName?: string
    osVersion?: string
  }

  interface BrowserTool {
    browser: {
      getInfo: () => BrowserInfo
    }
  }

  const browserTool: BrowserTool
  export default browserTool
}
