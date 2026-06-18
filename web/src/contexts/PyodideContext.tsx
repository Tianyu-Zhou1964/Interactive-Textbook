'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

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
// API URL Configuration
// ============================================
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ============================================
// PyodideProvider Component (Now uses Server Kernel)
// ============================================
export function PyodideProvider({ children }: { children: React.ReactNode }) {
  // Directly set as ready, skip Pyodide loading
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadProgress, setLoadProgress] = useState('Connected to Server Kernel')

  // Run Python code by calling backend API
  const runCode = useCallback(async (code: string): Promise<ExecutionResult> => {
    try {
      const response = await fetch(`${API_URL}/run_code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        error: data.error || null,
        plotBase64: data.plotBase64 || null,
        success: data.success
      }
    } catch (e: any) {
      return {
        stdout: '',
        stderr: '',
        error: `Kernel Error: ${e.message}`,
        plotBase64: null,
        success: false
      }
    }
  }, [])

  const value: PyodideContextType = {
    isLoading,
    isReady,
    loadError,
    loadProgress,
    runCode
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
    if (!isReady || isRunning) return null
    
    setIsRunning(true)
    setResult(null)
    
    try {
      const execResult = await runCode(code)
      setResult(execResult)
      return execResult
    } finally {
      setIsRunning(false)
    }
  }, [isReady, isRunning, runCode])

  const clearResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    isReady,
    isRunning,
    result,
    execute,
    clearResult
  }
}
