// Configuration for auto-generation flags
// Each flag can define where it writes to in the params and how to generate its value

export interface AutoGenFlag {
  // The key in autoGenConfig (e.g., 'autoGenerateUcid')
  flagKey: string
  
  // Display name for the UI
  displayName: string
  
  // Path in startCallParams where this value should be set (using dot notation)
  // e.g., 'callDetailsAO.Ucid' or 'agentDetailsA0.agentId'
  paramPath: string
  
  // Function to generate the value
  generateValue: (context: GenerationContext) => any
  
  // Optional: Check if the current value should be regenerated
  shouldRegenerate?: (currentValue: any, context: GenerationContext) => boolean
  
  // Optional: Validate the generated value
  validate?: (value: any) => boolean
}

export interface GenerationContext {
  parentProfile: string
  environment: string
  timestamp: number
  // Add more context as needed
}

// Registry of all auto-generation flags
export const AUTO_GEN_FLAGS: Record<string, AutoGenFlag> = {
  autoGenerateUcid: {
    flagKey: 'autoGenerateUcid',
    displayName: 'Auto Generate UCID',
    paramPath: 'callDetailsAO.Ucid',
    generateValue: (context) => {
      return `${context.timestamp}${Math.random().toString(36).substring(2, 7)}`
    },
    shouldRegenerate: (currentValue) => {
      // Regenerate if value doesn't match our format (13 digits + 5 alphanumeric)
      return !currentValue || !String(currentValue).match(/^\d{13}[a-z0-9]{5}$/)
    }
  },
  
  autoGenerateTimestamp: {
    flagKey: 'autoGenerateTimestamp',
    displayName: 'Auto Timestamp',
    paramPath: 'callDetailsAO.timestamp',
    generateValue: (context) => {
      return new Date(context.timestamp).toISOString()
    }
  },
  
  // Example: Add more flags here
  // autoGenerateSessionId: {
  //   flagKey: 'autoGenerateSessionId',
  //   displayName: 'Auto Session ID',
  //   paramPath: 'agentDetailsA0.sessionId',
  //   generateValue: (context) => {
  //     return `${context.parentProfile}-${context.timestamp}-${Math.random().toString(36).substring(2, 9)}`
  //   }
  // }
}

// Helper function to get value from nested object using dot notation
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// Helper function to set value in nested object using dot notation
export function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.')
  const result = { ...obj }
  let current = result
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!current[key]) {
      current[key] = {}
    } else {
      current[key] = { ...current[key] }
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
  return result
}

// Apply all active auto-generation flags to params
export function applyAutoGeneration(
  params: any,
  autoGenConfig: Record<string, boolean>,
  context: GenerationContext
): any {
  let updatedParams = { ...params }
  
  Object.entries(AUTO_GEN_FLAGS).forEach(([key, flag]) => {
    if (autoGenConfig[key]) {
      const currentValue = getNestedValue(updatedParams, flag.paramPath)
      
      // Check if we should regenerate
      const shouldGenerate = flag.shouldRegenerate 
        ? flag.shouldRegenerate(currentValue, context)
        : true
        
      if (shouldGenerate) {
        const newValue = flag.generateValue(context)
        
        // Validate if validator exists
        if (!flag.validate || flag.validate(newValue)) {
          updatedParams = setNestedValue(updatedParams, flag.paramPath, newValue)
        }
      }
    }
  })
  
  return updatedParams
}