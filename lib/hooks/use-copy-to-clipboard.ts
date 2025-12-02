"use client"

import { useState } from "react"

interface UseCopyToClipboardReturn {
  copyToClipboard: (text: string) => Promise<void>
  isCopied: boolean
  error: Error | null
}

/**
 * Hook para copiar texto al portapapeles con feedback visual
 * @returns Objeto con función copyToClipboard, estado isCopied y error
 */
export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      setError(null)
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      // Resetear el estado después de 2 segundos
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error al copiar al portapapeles")
      setError(error)
      setIsCopied(false)
      console.error("[useCopyToClipboard] Error:", error)
    }
  }

  return {
    copyToClipboard,
    isCopied,
    error,
  }
}



