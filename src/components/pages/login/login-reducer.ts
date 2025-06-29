import type { LoginConfig, AccountTemplate } from "../../../../types/auth"
import { CALL_TEMPLATES } from "../../../../data/call-templates"

export interface AutoGenerationConfig {
  autoGenerateUcid: boolean
  autoGenerateConvertedUcid: boolean
  autoGenerateTimestamp: boolean
  customUcidLength: number
  customPrefix: string
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
  autoGenConfig: {
    autoGenerateUcid: true,
    autoGenerateConvertedUcid: true,
    autoGenerateTimestamp: false,
    customUcidLength: 10,
    customPrefix: ''
  }
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
      const template = CALL_TEMPLATES.find((t: any) => t.id === `start_call_${newProfile}`)
      
      if (template) {
        let newParams = { ...template.params }

        // Apply auto-generation settings
        if (state.autoGenConfig.autoGenerateUcid) {
          const timestamp = Date.now().toString()
          const paddingLength = Math.max(0, state.autoGenConfig.customUcidLength - timestamp.length)
          const ucid = timestamp + '0'.repeat(paddingLength)
          
          newParams = {
            ...newParams,
            callDetailsAO: {
              ...newParams.callDetailsAO,
              Ucid: ucid
            }
          }
        }

        if (state.autoGenConfig.autoGenerateConvertedUcid) {
          const prefix = state.autoGenConfig.customPrefix || newProfile.toUpperCase()
          newParams = {
            ...newParams,
            callDetailsAO: {
              ...newParams.callDetailsAO,
              convertedUcid: `${prefix}${Date.now()}`
            }
          }
        }

        if (state.autoGenConfig.autoGenerateTimestamp) {
          const timestamp = new Date().toISOString()
          newParams = {
            ...newParams,
            callDetailsAO: {
              ...newParams.callDetailsAO,
              timestamp: timestamp
            }
          }
        }
        
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
    
    case 'UPDATE_PARAMS':
      return {
        ...state,
        config: {
          ...state.config,
          startCallParams: action.payload,
        },
        jsonText: JSON.stringify(action.payload, null, 2),
        jsonError: null,
      }
    
    case 'UPDATE_JSON_TEXT':
      return {
        ...state,
        jsonText: action.payload,
      }
    
    case 'ADD_CUSTOM_ACCOUNT': {
      const { key, account } = action.payload
      const currentAccounts = state.customAccounts[key] || []
      
      return {
        ...state,
        customAccounts: {
          ...state.customAccounts,
          [key]: [...currentAccounts, account],
        },
        showAddAccount: false,
      }
    }
    
    case 'REMOVE_CUSTOM_ACCOUNT': {
      const { key, index } = action.payload
      const accounts = state.customAccounts[key] || []
      const newAccounts = accounts.filter((_, i) => i !== index)
      
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
        ...action.payload,
      }

    case 'SET_AUTO_GEN_CONFIG':
      return {
        ...state,
        autoGenConfig: {
          ...state.autoGenConfig,
          ...action.payload,
        },
      }

    case 'APPLY_AUTO_GENERATION': {
      if (!state.config.startCallParams || !state.config.parentProfile) {
        return state
      }

      let updatedParams = { ...state.config.startCallParams }

      // Helper functions for generation
      const generateUcid = () => {
        if (state.autoGenConfig.customUcidLength > 0) {
          const timestamp = Date.now().toString()
          const paddingLength = Math.max(0, state.autoGenConfig.customUcidLength - timestamp.length)
          return timestamp + '0'.repeat(paddingLength)
        }
        return `${Date.now()}00000000000`
      }

      const generateConvertedUcid = () => {
        const prefix = state.autoGenConfig.customPrefix || state.config.parentProfile.toUpperCase()
        return `${prefix}${Date.now()}`
      }

      // Auto-generate UCID if enabled
      if (state.autoGenConfig.autoGenerateUcid && updatedParams.callDetailsAO) {
        updatedParams = {
          ...updatedParams,
          callDetailsAO: {
            ...updatedParams.callDetailsAO,
            Ucid: generateUcid()
          }
        }
      }

      // Auto-generate convertedUcid if enabled
      if (state.autoGenConfig.autoGenerateConvertedUcid && updatedParams.callDetailsAO) {
        updatedParams = {
          ...updatedParams,
          callDetailsAO: {
            ...updatedParams.callDetailsAO,
            convertedUcid: generateConvertedUcid()
          }
        }
      }

      // Update timestamp fields if enabled
      if (state.autoGenConfig.autoGenerateTimestamp) {
        const timestamp = new Date().toISOString()
        if (updatedParams.callDetailsAO) {
          updatedParams = {
            ...updatedParams,
            callDetailsAO: {
              ...updatedParams.callDetailsAO,
              timestamp: timestamp
            }
          }
        }
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

    default:
      return state
  }
}