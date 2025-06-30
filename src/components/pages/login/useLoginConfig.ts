import { useReducer, useEffect } from 'react'
import { loginReducer, initialState } from './login-reducer'
import type { AccountTemplate } from '../../../../types/auth'

export function useLoginConfig() {
  const [state, dispatch] = useReducer(loginReducer, initialState)
  const { environment, parentProfile } = state.config

  // Initialize saved parameters on first load
  useEffect(() => {
    // Load saved parent profile if exists
    const savedProfile = localStorage.getItem('aa-last-parent-profile')
    if (savedProfile && !parentProfile) {
      dispatch({ type: 'SET_PARENT_PROFILE', payload: savedProfile })
    }
    
    // Load saved auto-generation config
    const savedAutoGenConfig = localStorage.getItem('aa-auto-gen-config')
    if (savedAutoGenConfig) {
      try {
        const autoGenConfig = JSON.parse(savedAutoGenConfig)
        // Load all config at once without triggering generation
        dispatch({ 
          type: 'INIT_AUTO_GEN_CONFIG', 
          payload: autoGenConfig
        })
      } catch (error) {
        console.error("Failed to parse saved auto-gen config", error)
      }
    }
  }, [])

  // Effect to load credentials from localStorage
  useEffect(() => {
    if (environment && parentProfile) {
      const savedData = localStorage.getItem(`aa-credentials-${parentProfile}-${environment}`)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          dispatch({ type: 'SET_CREDENTIALS', payload: parsed })
          dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: true } })
        } catch (error) {
          console.error("Failed to parse saved credentials", error)
        }
      } else {
        // Clear credentials when switching to a profile/environment with no saved data
        dispatch({ type: 'SET_CREDENTIALS', payload: { username: '', password: '' } })
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: false } })
      }
    }
  }, [environment, parentProfile])

  // Effect to load default account
  useEffect(() => {
    if (environment && parentProfile) {
      const savedDefault = localStorage.getItem(`aa-default-account-${parentProfile}-${environment}`)
      if (savedDefault) {
        try {
          const account: AccountTemplate = JSON.parse(savedDefault)
          dispatch({ type: 'SELECT_ACCOUNT', payload: account })
          dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveDefaultAccount', value: true } })
        } catch (error) {
          console.error("Failed to parse saved default account", error)
        }
      } else {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveDefaultAccount', value: false } })
      }
    }
  }, [environment, parentProfile])

  // Initialize custom accounts and hidden accounts for current profile/environment
  useEffect(() => {
    if (parentProfile && environment) {
      const key = `${parentProfile}_${environment}`
      
      // Load custom accounts from localStorage
      const savedCustomAccounts = localStorage.getItem(`aa-custom-accounts-${key}`)
      let customAccountsForKey: AccountTemplate[] = []
      if (savedCustomAccounts) {
        try {
          customAccountsForKey = JSON.parse(savedCustomAccounts)
        } catch (error) {
          console.error("Failed to parse saved custom accounts", error)
        }
      }
      
      // Load hidden accounts from localStorage
      const savedHiddenAccounts = localStorage.getItem(`aa-hidden-accounts-${key}`)
      let hiddenAccountsForKey = new Set<number>()
      if (savedHiddenAccounts) {
        try {
          const hiddenArray = JSON.parse(savedHiddenAccounts)
          hiddenAccountsForKey = new Set(hiddenArray)
        } catch (error) {
          console.error("Failed to parse saved hidden accounts", error)
        }
      }
      
      // Always load from localStorage for the current key
      dispatch({ 
        type: 'INIT_SAVED_STATE', 
        payload: { 
          customAccounts: { ...state.customAccounts, [key]: customAccountsForKey },
          hiddenDefaultAccounts: { ...state.hiddenDefaultAccounts, [key]: hiddenAccountsForKey }
        } 
      })
    }
  }, [parentProfile, environment])

  return [state, dispatch] as const
}