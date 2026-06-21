'use client'

import { useState, useCallback } from 'react'
import { Play, Copy, Check, Square, Trash2 } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { extractCodeLanguage, extractCodeContent } from '@/lib/markdown-utils'
import { usePyodide, ExecutionResult } from '@/contexts/PyodideContext'

// =====================================================
// JUPYTER-STYLE CODE CELL with REAL Pyodide execution
// =====================================================
interface JupyterCodeCellProps {
  content: string
  cellIndex: number
  isInteractive?: boolean
  onDelete?: () => void
}

export function JupyterCodeCell({ content, cellIndex, isInteractive = false, onDelete }: JupyterCodeCellProps) {
  const [copied, setCopied] = useState(false)
  const [editableCode, setEditableCode] = useState(() => extractCodeContent(content))
  const [localResult, setLocalResult] = useState<ExecutionResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const { isReady, isLoading: pyodideLoading, loadError, loadProgress, runCode } = usePyodide()

  const language = extractCodeLanguage(content)
  // For interactive blocks, show the edited code. For static blocks, show the prop content.
  const displayCode = isInteractive ? editableCode : extractCodeContent(content)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [displayCode])

  const handleRun = useCallback(async () => {
    // 首次点击会惰性下载 Pyodide（runCode 内部自动处理），无需等待 isReady
    if (isRunning) return

    setIsRunning(true)
    setLocalResult(null)

    try {
      // Use the code from the editor (or the block content if not interactive but somehow run)
      const codeToRun = isInteractive ? editableCode : extractCodeContent(content)
      const result = await runCode(codeToRun)
      setLocalResult(result)
    } catch (e: any) {
      setLocalResult({
        stdout: '',
        stderr: '',
        error: e.message || 'Execution failed',
        plotBase64: null,
        success: false
      })
    } finally {
      setIsRunning(false)
    }
  }, [isRunning, editableCode, content, isInteractive, runCode])

  return (
    <div className={`my-6 rounded-xl overflow-hidden border shadow-lg bg-gray-900 group ${
      isInteractive ? 'border-indigo-500' : 'border-gray-700'
    }`}>
      {/* Cell Header */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Cell Number Badge */}
          <span className={`text-xs font-mono px-2 py-1 rounded ${
            isInteractive ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}>
            {isInteractive ? '✨ New' : `In [${cellIndex + 1}]`}
          </span>
          <span className="text-xs text-gray-400">{language}</span>

          {/* Pyodide 状态：浏览器内运行时，首次点击 Run 才惰性加载 */}
          {pyodideLoading && (
            <span className="text-xs text-yellow-400 animate-pulse">{loadProgress || '加载中...'}</span>
          )}
          {loadError && !pyodideLoading && (
            <span className="text-xs text-red-400" title={loadError}>加载失败</span>
          )}
          {isReady && !pyodideLoading && (
            <span className="text-xs text-green-400">浏览器内核就绪</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={isRunning || pyodideLoading}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              !isRunning && !pyodideLoading
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isRunning ? (
              <>
                <Square size={12} className="animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <Play size={12} />
                Run
              </>
            )}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>

          {/* Delete Button (for interactive blocks) */}
          {isInteractive && onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              title="Delete block"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Code Content */}
      {isInteractive ? (
        <textarea
          value={editableCode}
          onChange={(e) => setEditableCode(e.target.value)}
          className="w-full h-48 p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 block"
          placeholder="# Enter Python code..."
          spellCheck={false}
        />
      ) : (
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem 1.25rem',
            fontSize: '0.875rem',
            lineHeight: '1.6',
            backgroundColor: '#1e1e1e',
          }}
          showLineNumbers={displayCode.split('\n').length > 3}
          wrapLines
        >
          {displayCode}
        </SyntaxHighlighter>
      )}

      {/* Output Area */}
      {localResult && (
        <div className="border-t border-gray-700 bg-gray-950">
          <div className="px-4 py-1.5 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
            <span className={`text-xs font-mono ${localResult.success ? 'text-gray-400' : 'text-red-400'}`}>
              Out [{cellIndex + 1}]
            </span>
            {!localResult.success && <span className="text-xs text-red-400">Error</span>}
          </div>

          {/* Stdout */}
          {localResult.stdout && (
            <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {localResult.stdout}
            </pre>
          )}

          {/* Stderr */}
          {localResult.stderr && (
            <pre className="p-4 text-sm font-mono text-yellow-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {localResult.stderr}
            </pre>
          )}

          {/* Error */}
          {localResult.error && (
            <pre className="p-4 text-sm font-mono text-red-400 whitespace-pre-wrap max-h-64 overflow-y-auto bg-red-900/20">
              {localResult.error}
            </pre>
          )}

          {/* Plot */}
          {localResult.plotBase64 && (
            <div className="p-4 bg-white dark:bg-gray-900">
              <img
                src={`data:image/png;base64,${localResult.plotBase64}`}
                alt="Matplotlib Plot"
                className="max-w-full mx-auto rounded shadow-md"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
