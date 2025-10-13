// 生产模式日志控制
const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  error: (...args: any[]) => {
    console.error(...args)
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args)
    }
  }
}

// 全局调试开关
let debugEnabled = isDev

export const setDebugEnabled = (enabled: boolean) => {
  debugEnabled = enabled
}

export const isDebugEnabled = () => debugEnabled

// 条件日志函数
export const debugLog = (...args: any[]) => {
  if (debugEnabled) {
    console.log('[DEBUG]', ...args)
  }
}
