'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

// ============================================
// Execution Result Types
// ============================================
export interface ExecutionResult {
  stdout: string
  stderr: string
  error: string | null
  plotBase64: string | null
  success: boolean
}

// ============================================
// Context Types
// ============================================
interface PyodideContextType {
  isLoading: boolean
  isReady: boolean
  loadError: string | null
  loadProgress: string
  runCode: (code: string) => Promise<ExecutionResult>
}

const PyodideContext = createContext<PyodideContextType | null>(null)

// ============================================
// Pyodide CDN configuration
// 代码在用户浏览器内执行（WebAssembly 沙箱），不经过后端，
// 因此服务器零负担、零代码注入风险，算力来自用户自己的机器。
// 仅支持纯 Python 科学计算包：numpy / matplotlib / pandas。
// torch、d2l 等重型原生包无法在浏览器运行，不提供。
// ============================================
const PYODIDE_VERSION = '0.27.2'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
const PRELOAD_PACKAGES = ['numpy', 'matplotlib', 'pandas']

// pyodide 通过 <script> 注入到 window，没有官方类型，这里做最小声明
declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>
  }
}

interface PyodideInstance {
  loadPackage: (names: string[]) => Promise<void>
  runPythonAsync: (code: string) => Promise<unknown>
  globals: { get: (name: string) => unknown }
  setStdout: (cfg: { batched: (s: string) => void }) => void
  setStderr: (cfg: { batched: (s: string) => void }) => void
}

// 把 pyodide.js 脚本注入页面（只注入一次）
function injectPyodideScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve()
      return
    }
    const existing = document.getElementById('pyodide-cdn-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Pyodide 脚本加载失败')))
      return
    }
    const script = document.createElement('script')
    script.id = 'pyodide-cdn-script'
    script.src = `${PYODIDE_CDN}pyodide.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Pyodide 脚本加载失败'))
    document.head.appendChild(script)
  })
}

// ============================================
// PyodideProvider — 浏览器内 Python 运行时
// ============================================
export function PyodideProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadProgress, setLoadProgress] = useState('未加载')

  // pyodide 实例缓存，避免重复初始化
  const pyodideRef = useRef<PyodideInstance | null>(null)
  const loadPromiseRef = useRef<Promise<PyodideInstance> | null>(null)

  // 惰性加载：首次运行代码时才下载 pyodide + 科学计算包
  const ensurePyodide = useCallback(async (): Promise<PyodideInstance> => {
    if (pyodideRef.current) return pyodideRef.current
    if (loadPromiseRef.current) return loadPromiseRef.current

    const promise = (async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        setLoadProgress('正在下载 Pyodide 运行时...')
        await injectPyodideScript()
        if (!window.loadPyodide) throw new Error('window.loadPyodide 不可用')

        const pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN })

        setLoadProgress('正在加载 numpy / matplotlib / pandas...')
        await pyodide.loadPackage(PRELOAD_PACKAGES)

        // 把 matplotlib 切到非交互后端，便于把图导出成 PNG
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use("AGG")
`)

        pyodideRef.current = pyodide
        setIsReady(true)
        setLoadProgress('就绪')
        return pyodide
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setLoadError(msg)
        setLoadProgress('加载失败')
        loadPromiseRef.current = null // 允许重试
        throw e
      } finally {
        setIsLoading(false)
      }
    })()

    loadPromiseRef.current = promise
    return promise
  }, [])

  const runCode = useCallback(async (code: string): Promise<ExecutionResult> => {
    let stdout = ''
    let stderr = ''
    try {
      const pyodide = await ensurePyodide()

      pyodide.setStdout({ batched: (s: string) => { stdout += s + '\n' } })
      pyodide.setStderr({ batched: (s: string) => { stderr += s + '\n' } })

      // 每次执行前清空已有图像，避免跨单元残留
      await pyodide.runPythonAsync(`
import matplotlib.pyplot as _plt
_plt.close("all")
`)

      await pyodide.runPythonAsync(code)

      // 若用户代码画了图，导出为 base64 PNG
      let plotBase64: string | null = null
      const capture = await pyodide.runPythonAsync(`
import base64 as _b64, io as _io
import matplotlib.pyplot as _plt
_buf = None
if _plt.get_fignums():
    _bio = _io.BytesIO()
    _plt.savefig(_bio, format="png", bbox_inches="tight", dpi=100, facecolor="white")
    _bio.seek(0)
    _buf = _b64.b64encode(_bio.read()).decode("utf-8")
    _plt.close("all")
_buf
`)
      if (typeof capture === 'string') plotBase64 = capture

      return { stdout, stderr, error: null, plotBase64, success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { stdout, stderr, error: msg, plotBase64: null, success: false }
    }
  }, [ensurePyodide])

  const value: PyodideContextType = {
    isLoading,
    isReady,
    loadError,
    loadProgress,
    runCode,
  }

  return (
    <PyodideContext.Provider value={value}>
      {children}
    </PyodideContext.Provider>
  )
}

// ============================================
// Hook to use Pyodide
// ============================================
export function usePyodide() {
  const context = useContext(PyodideContext)
  if (!context) {
    throw new Error('usePyodide must be used within a PyodideProvider')
  }
  return context
}

// ============================================
// Hook for running code (convenience)
// ============================================
export function useCodeRunner() {
  const { isReady, runCode } = usePyodide()

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)

  const execute = useCallback(async (code: string) => {
    if (isRunning) return null

    setIsRunning(true)
    setResult(null)

    try {
      const execResult = await runCode(code)
      setResult(execResult)
      return execResult
    } finally {
      setIsRunning(false)
    }
  }, [isRunning, runCode])

  const clearResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    isReady,
    isRunning,
    result,
    execute,
    clearResult,
  }
}
