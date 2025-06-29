import { useCallback, useState } from 'react'

export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }, [])

  return { copyToClipboard, isCopied }
}