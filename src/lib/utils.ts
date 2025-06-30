import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateJsonSyntax(value: string): string | null {
  try {
    JSON.parse(value)
    return null
  } catch (error) {
    if (error instanceof SyntaxError) {
      const match = error.message.match(/position (\d+)/)
      if (match) {
        const position = parseInt(match[1])
        const lines = value.substring(0, position).split('\n')
        const line = lines.length
        return `Invalid JSON syntax at line ${line}`
      }
      return 'Invalid JSON syntax - check for trailing commas, missing quotes, or duplicate keys'
    }
    return 'Error parsing JSON'
  }
}

