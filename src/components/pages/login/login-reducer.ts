import type { LoginConfig, AccountTemplate } from "../../../../types/auth"
import { CALL_TEMPLATES } from "../../../../data/call-templates"
import { applyAutoGeneration, AUTO_GEN_FLAGS, setNestedValue, getNestedValue } from "./auto-generation-config"

// AutoGenerationConfig is now dynamic based on AUTO_GEN_FLAGS
export type AutoGenerationConfig = {
  [K in keyof typeof AUTO_GEN_FLAGS]: boolean
}

export interface LoginState {
  config: LoginConfig
  activeTab: 'config' | 'parameters' | 'accounts'
  showPassword: boolean
  jsonText: string
  jsonError: string | null
  accountSearch: string
  showAllAccounts: boolean
  showFieldSelector: boolean
  selectedFields: string[]
  showAddAccount: boolean
  customAccounts: Record<string, AccountTemplate[]>
  hiddenDefaultAccounts: Record<string, Set<number>>
  useIframe: boolean
  useWebsocket: boolean
  saveCredentials: boolean
  saveDefaultAccount: boolean
  autoGenConfig: AutoGenerationConfig
}

export type LoginAction =
  | { type: 'SET_FIELD'; payload: { field: keyof LoginConfig; value: any } }
  | { type: 'SET_UI_STATE'; payload: { field: keyof Omit<LoginState, 'config'>; value: any } }
  | { type: 'SET_CREDENTIALS'; payload: { username?: string; password?: string } }
  | { type: 'SET_PARENT_PROFILE'; payload: string }
  | { type: 'SELECT_ACCOUNT'; payload: AccountTemplate | null }
  | { type: 'UPDATE_PARAMS'; payload: object }
  | { type: 'INIT_SAVED_STATE'; payload: Partial<LoginState> }
  | { type: 'ADD_CUSTOM_ACCOUNT'; payload: { key: string; account: AccountTemplate } }
  | { type: 'REMOVE_CUSTOM_ACCOUNT'; payload: { key: string; index: number } }
  | { type: 'HIDE_DEFAULT_ACCOUNT'; payload: { key: string; index: number } }
  | { type: 'RESET_ACCOUNTS'; payload: { key: string } }
  | { type: 'UPDATE_JSON_TEXT'; payload: string }
  | { type: 'TOGGLE_FIELD_SELECTION'; payload: string }
  | { type: 'SET_ALL_FIELDS'; payload: string[] }
  | { type: 'SET_AUTO_GEN_CONFIG'; payload: Partial<AutoGenerationConfig> }
  | { type: 'INIT_AUTO_GEN_CONFIG'; payload: AutoGenerationConfig }
  | { type: 'APPLY_AUTO_GENERATION'; payload?: void }

export const initialState: LoginState = {
  config: {
    username: "",
    password: "",
    parentProfile: "",
    environment: "",
    startCallParams: {},
    devMode: false,
    localhostIframeUrl: "http://localhost:3001",
    localhostWebsocketUrl: "ws://localhost:8080",
    selectedAccounts: [],
    autoStartCall: undefined, // Will use profile default if not set
  },
  activeTab: 'config',
  showPassword: false,
  jsonText: "",
  jsonError: null,
  accountSearch: "",
  showAllAccounts: false,
  showFieldSelector: false,
  selectedFields: [],
  showAddAccount: false,
  customAccounts: {},
  hiddenDefaultAccounts: {},
  useIframe: true,
  useWebsocket: false,
  saveCredentials: false,
  saveDefaultAccount: false,
  autoGenConfig: Object.keys(AUTO_GEN_FLAGS).reduce((acc, key) => {
    // Default values for each flag
    acc[key as keyof AutoGenerationConfig] = key === 'autoGenerateUcid' // UCID on by default
    return acc
  }, {} as AutoGenerationConfig)
}

export function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        config: { ...state.config, [action.payload.field]: action.payload.value },
      }
    
    case 'SET_UI_STATE':
      return { ...state, [action.payload.field]: action.payload.value }
    
    case 'SET_CREDENTIALS':
      return {
        ...state,
        config: {
          ...state.config,
          username: action.payload.username ?? state.config.username,
          password: action.payload.password ?? state.config.password,
        },
      }
    
    case 'SET_PARENT_PROFILE': {
      const newProfile = action.payload
      
      // Save the last selected profile
      localStorage.setItem('aa-last-parent-profile', newProfile)
      
      // Check for saved parameters in localStorage
      const savedParams = localStorage.getItem(`aa-start-call-params-${newProfile}`)
      let newParams
      
      if (savedParams) {
        try {
          const parsed = JSON.parse(savedParams)
          // Validate that saved params have required fields
          if (parsed && parsed.eventName === 'START_CALL') {
            newParams = parsed
          } else {
            // Invalid saved params, use template
            const template = CALL_TEMPLATES.find((t: any) => t.id === `start_call_${newProfile}`)
            newParams = template ? { ...template.params } : {}
          }
        } catch (error) {
          console.error("Failed to parse saved start call params", error)
          // Fall back to template if parsing fails
          const template = CALL_TEMPLATES.find((t: any) => t.id === `start_call_${newProfile}`)
          newParams = template ? { ...template.params } : {}
        }
      } else {
        // Use default template if no saved params
        const template = CALL_TEMPLATES.find((t: any) => t.id === `start_call_${newProfile}`)
        newParams = template ? { ...template.params } : {}
      }
      
      if (Object.keys(newParams).length > 0) {
        // Apply auto-generation using the generic system
        const context = {
          parentProfile: newProfile,
          environment: state.config.environment,
          timestamp: Date.now()
        }
        newParams = applyAutoGeneration(newParams, state.autoGenConfig, context)
        
        return {
          ...state,
          config: {
            ...state.config,
            parentProfile: newProfile,
            startCallParams: newParams,
            selectedAccounts: [], // Always clear accounts on profile change
          },
          jsonText: JSON.stringify(newParams, null, 2),
          jsonError: null,
          selectedFields: [], // Reset selected fields
          showFieldSelector: false,
        }
      }
      
      return {
        ...state,
        config: {
          ...state.config,
          parentProfile: newProfile,
        },
      }
    }

    case 'SELECT_ACCOUNT': {
      const account = action.payload
      if (!account) {
        return {
          ...state,
          config: { ...state.config, selectedAccounts: [] }
        }
      }
      
      const updatedParams = {
        ...state.config.startCallParams,
        customerDetailsAO: { ...account }
      }
      
      return {
        ...state,
        config: {
          ...state.config,
          selectedAccounts: [account],
          startCallParams: updatedParams
        },
        jsonText: JSON.stringify(updatedParams, null, 2),
        jsonError: null,
      }
    }
    
    case 'UPDATE_PARAMS': {
      let updatedParams = { ...action.payload }
      
      // Apply auto-generation for any active flags
      const context = {
        parentProfile: state.config.parentProfile,
        environment: state.config.environment,
        timestamp: Date.now()
      }
      
      // Check each active flag to see if it should regenerate
      Object.entries(state.autoGenConfig).forEach(([flagKey, isEnabled]) => {
        if (isEnabled) {
          const flag = AUTO_GEN_FLAGS[flagKey]
          if (flag) {
            const currentValue = getNestedValue(updatedParams, flag.paramPath)
            const shouldRegen = flag.shouldRegenerate?.(currentValue, context) ?? !currentValue
            
            if (shouldRegen) {
              const newValue = flag.generateValue(context)
              updatedParams = setNestedValue(updatedParams, flag.paramPath, newValue)
            }
          }
        }
      })
      
      // Save to localStorage if we have parentProfile
      if (state.config.parentProfile) {
        localStorage.setItem(
          `aa-start-call-params-${state.config.parentProfile}`,
          JSON.stringify(updatedParams)
        )
      }
      
      return {
        ...state,
        config: {
          ...state.config,
          startCallParams: updatedParams,
        },
        jsonText: JSON.stringify(updatedParams, null, 2),
        jsonError: null,
      }
    }
    
    case 'UPDATE_JSON_TEXT':
      return {
        ...state,
        jsonText: action.payload,
      }
    
    case 'ADD_CUSTOM_ACCOUNT': {
      const { key, account } = action.payload
      const currentAccounts = state.customAccounts[key] || []
      const updatedAccounts = [...currentAccounts, account]
      
      // Save to localStorage
      localStorage.setItem(`aa-custom-accounts-${key}`, JSON.stringify(updatedAccounts))
      
      return {
        ...state,
        customAccounts: {
          ...state.customAccounts,
          [key]: updatedAccounts,
        },
        showAddAccount: false,
      }
    }
    
    case 'REMOVE_CUSTOM_ACCOUNT': {
      const { key, index } = action.payload
      const accounts = state.customAccounts[key] || []
      const newAccounts = accounts.filter((_, i) => i !== index)
      
      // Save to localStorage
      localStorage.setItem(`aa-custom-accounts-${key}`, JSON.stringify(newAccounts))
      
      return {
        ...state,
        customAccounts: {
          ...state.customAccounts,
          [key]: newAccounts,
        },
      }
    }
    
    case 'HIDE_DEFAULT_ACCOUNT': {
      const { key, index } = action.payload
      const hiddenSet = new Set(state.hiddenDefaultAccounts[key] || [])
      hiddenSet.add(index)
      
      // Save to localStorage
      localStorage.setItem(`aa-hidden-accounts-${key}`, JSON.stringify(Array.from(hiddenSet)))
      
      return {
        ...state,
        hiddenDefaultAccounts: {
          ...state.hiddenDefaultAccounts,
          [key]: hiddenSet,
        },
      }
    }
    
    case 'RESET_ACCOUNTS': {
      const { key } = action.payload
      const hiddenSet = new Set(state.hiddenDefaultAccounts[key] || [])
      hiddenSet.clear()
      
      // Clear from localStorage
      localStorage.removeItem(`aa-custom-accounts-${key}`)
      localStorage.removeItem(`aa-hidden-accounts-${key}`)
      
      return {
        ...state,
        customAccounts: {
          ...state.customAccounts,
          [key]: [],
        },
        hiddenDefaultAccounts: {
          ...state.hiddenDefaultAccounts,
          [key]: hiddenSet,
        },
        config: {
          ...state.config,
          selectedAccounts: [],
        },
      }
    }
    
    case 'TOGGLE_FIELD_SELECTION': {
      const field = action.payload
      const currentFields = state.selectedFields
      
      if (currentFields.includes(field)) {
        return {
          ...state,
          selectedFields: currentFields.filter(f => f !== field),
        }
      } else {
        return {
          ...state,
          selectedFields: [...currentFields, field],
        }
      }
    }
    
    case 'SET_ALL_FIELDS':
      return {
        ...state,
        selectedFields: action.payload,
      }
    
    case 'INIT_SAVED_STATE':
      return {
        ...state,
        customAccounts: {
          ...state.customAccounts,
          ...action.payload.customAccounts
        },
        hiddenDefaultAccounts: {
          ...state.hiddenDefaultAccounts,
          ...action.payload.hiddenDefaultAccounts
        }
      }

    case 'SET_AUTO_GEN_CONFIG': {
      const newAutoGenConfig = {
        ...state.autoGenConfig,
        ...action.payload,
      }
      
      // Save to localStorage
      localStorage.setItem('aa-auto-gen-config', JSON.stringify(newAutoGenConfig))
      
      // Check if any flag was just enabled
      const enabledFlags = Object.entries(action.payload)
        .filter(([key, value]) => value === true)
        .map(([key]) => key)
      
      if (enabledFlags.length > 0 && state.config.startCallParams) {
        // Apply auto-generation for newly enabled flags
        const context = {
          parentProfile: state.config.parentProfile,
          environment: state.config.environment,
          timestamp: Date.now()
        }
        
        let updatedParams = { ...state.config.startCallParams }
        
        // Only apply the specific flags that were just enabled
        enabledFlags.forEach(flagKey => {
          const flag = AUTO_GEN_FLAGS[flagKey]
          if (flag) {
            const newValue = flag.generateValue(context)
            updatedParams = setNestedValue(updatedParams, flag.paramPath, newValue)
          }
        })
        
        // Save updated params to localStorage if we have parentProfile
        if (state.config.parentProfile) {
          localStorage.setItem(
            `aa-start-call-params-${state.config.parentProfile}`,
            JSON.stringify(updatedParams)
          )
        }
        
        return {
          ...state,
          autoGenConfig: newAutoGenConfig,
          config: {
            ...state.config,
            startCallParams: updatedParams
          },
          jsonText: JSON.stringify(updatedParams, null, 2),
          jsonError: null
        }
      }
      
      return {
        ...state,
        autoGenConfig: newAutoGenConfig,
      }
    }

    case 'INIT_AUTO_GEN_CONFIG':
      // Initialize auto-gen config from localStorage without triggering generation
      return {
        ...state,
        autoGenConfig: action.payload
      }

    case 'APPLY_AUTO_GENERATION': {
      if (!state.config.startCallParams) {
        return state
      }

      // Apply all auto-generation flags
      const context = {
        parentProfile: state.config.parentProfile,
        environment: state.config.environment,
        timestamp: Date.now()
      }
      
      const updatedParams = applyAutoGeneration(
        state.config.startCallParams,
        state.autoGenConfig,
        context
      )

      return {
        ...state,
        config: {
          ...state.config,
          startCallParams: updatedParams,
        },
        jsonText: JSON.stringify(updatedParams, null, 2),
        jsonError: null,
      }
    }

    default:
      return state
  }
}