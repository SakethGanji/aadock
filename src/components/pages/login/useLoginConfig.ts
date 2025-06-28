import { useReducer, useEffect } from 'react'
import { loginReducer, initialState } from './login-reducer'
import type { AccountTemplate } from '../../../../types/auth'

export function useLoginConfig() {
  const [state, dispatch] = useReducer(loginReducer, initialState)
  const { environment, parentProfile } = state.config

  // Effect to load credentials from localStorage
  useEffect(() => {
    if (environment) {
      const savedData = localStorage.getItem(`aa-credentials-${environment}`)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          dispatch({ type: 'SET_CREDENTIALS', payload: parsed })
          dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: true } })
        } catch (error) {
          console.error("Failed to parse saved credentials", error)
        }
      } else {
        // Clear credentials when switching to an environment with no saved data
        dispatch({ type: 'SET_CREDENTIALS', payload: { username: '', password: '' } })
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: false } })
      }
    }
  }, [environment])

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
      if (!state.customAccounts[key]) {
        dispatch({ 
          type: 'INIT_SAVED_STATE', 
          payload: { 
            customAccounts: { ...state.customAccounts, [key]: [] },
            hiddenDefaultAccounts: { ...state.hiddenDefaultAccounts, [key]: new Set() }
          } 
        })
      }
    }
  }, [parentProfile, environment, state.customAccounts, state.hiddenDefaultAccounts])

  return [state, dispatch] as const
}