'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { PyodideProvider } from '@/contexts/PyodideContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PyodideProvider>
        {children}
      </PyodideProvider>
    </ThemeProvider>
  )
}
