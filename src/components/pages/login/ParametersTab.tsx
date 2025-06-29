import React, { useCallback, useState, useEffect } from 'react'
import { Button } from "../../ui/button"
import { Label } from "../../ui/label"
import { FileText, Copy, RotateCcw, Check } from "lucide-react"
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import type { LoginState, LoginAction } from './login-reducer'
import { PARENT_PROFILES } from './login-constants'
import { CALL_TEMPLATES } from '../../../../data/call-templates'

interface ParametersTabProps {
  state: LoginState
  dispatch: React.Dispatch<LoginAction>
}

export const ParametersTab = React.memo(function ParametersTab({ state, dispatch }: ParametersTabProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // Observer for class changes on html element
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])
  const { config, jsonText, jsonError } = state
  const selectedProfile = PARENT_PROFILES.find((p) => p.id === config.parentProfile)

  const validateJsonSyntax = useCallback((value: string) => {
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
  }, [])

  const handleParamsChange = useCallback((value: string) => {
    try {
      const parsed = JSON.parse(value)
      
      // Validate required fields based on the new structure
      if (!parsed.eventName) {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'Missing required field: eventName' } })
        return
      }
      
      // Validate event type
      if (parsed.eventName !== 'START_CALL') {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'eventName must be "START_CALL"' } })
        return
      }
      
      // Validate required nested objects
      if (!parsed.callDetailsAO || typeof parsed.callDetailsAO !== 'object') {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'Missing or invalid callDetailsAO object' } })
        return
      }
      
      if (!parsed.agentDetailsA0 || typeof parsed.agentDetailsA0 !== 'object') {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'Missing or invalid agentDetailsA0 object' } })
        return
      }
      
      if (!parsed.customerDetailsAO || typeof parsed.customerDetailsAO !== 'object') {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'Missing or invalid customerDetailsAO object' } })
        return
      }
      
      dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: null } })
      dispatch({ type: 'UPDATE_PARAMS', payload: parsed })
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Try to provide more specific error message
        const match = error.message.match(/position (\d+)/)
        if (match) {
          const position = parseInt(match[1])
          const lines = value.substring(0, position).split('\n')
          const line = lines.length
          dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: `Invalid JSON syntax at line ${line}` } })
        } else {
          dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'Invalid JSON syntax - check for trailing commas, missing quotes, or duplicate keys' } })
        }
      } else {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'Error parsing JSON' } })
      }
    }
  }, [dispatch])

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(config.startCallParams, null, 2))
  }, [config.startCallParams])

  const handleReset = useCallback(() => {
    if (config.parentProfile) {
      const template = CALL_TEMPLATES.find((t: any) => t.id === `start_call_${config.parentProfile}`)
      if (template) {
        // Reset to template but preserve account fields if an account is selected
        let resetParams: any = {
          ...template.params,
          callDetailsAO: {
            ...template.params.callDetailsAO,
            Ucid: `${Date.now()}00000000000`,
            convertedUcid: `${config.parentProfile.toUpperCase()}${Date.now()}`
          }
        }
        
        // If an account is selected, merge its fields into customerDetailsAO
        if (config.selectedAccounts && config.selectedAccounts.length > 0) {
          const account = config.selectedAccounts[0]
          resetParams.customerDetailsAO = { ...account }
        }
        
        dispatch({ type: 'UPDATE_PARAMS', payload: resetParams })
      }
    }
  }, [config.parentProfile, config.selectedAccounts, dispatch])

  // Check if customerDetailsAO has been manually edited
  const hasCustomerDetailsBeenEdited = useCallback(() => {
    if (!config.selectedAccounts || config.selectedAccounts.length === 0) return false
    
    const selectedAccount = config.selectedAccounts[0]
    const customerDetails = config.startCallParams?.customerDetailsAO || {}
    
    // Check if customerDetailsAO differs from selected account
    const accountKeys = Object.keys(selectedAccount)
    const customerKeys = Object.keys(customerDetails)
    
    // Different number of keys means it's been edited
    if (accountKeys.length !== customerKeys.length) {
      return true
    }
    
    // Check each field value
    for (const key of accountKeys) {
      if (customerDetails[key] !== selectedAccount[key]) {
        return true
      }
    }
    
    return false
  }, [config.selectedAccounts, config.startCallParams])

  const handleResyncWithAccount = useCallback(() => {
    if (config.selectedAccounts && config.selectedAccounts.length > 0) {
      const account = config.selectedAccounts[0]
      const updatedStartCallParams = { ...config.startCallParams }
      updatedStartCallParams.customerDetailsAO = { ...account }
      dispatch({ type: 'UPDATE_PARAMS', payload: updatedStartCallParams })
    }
  }, [config.selectedAccounts, config.startCallParams, dispatch])

  const hasChanges = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText || "{}")
      return JSON.stringify(parsed, null, 2) !== JSON.stringify(config.startCallParams, null, 2)
    } catch {
      return false
    }
  }, [jsonText, config.startCallParams])

  const isSaveDisabled = useCallback(() => {
    if (!!jsonError || !jsonText) return true
    return !hasChanges()
  }, [jsonError, jsonText, hasChanges])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-foreground">Call Parameters</h3>
          <p className="text-sm text-muted-foreground mt-1">START_CALL event configuration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard} title="Copy JSON">
            <Copy className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            title="Reset to default template"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {config.parentProfile ? (
        <>
          <div className="p-3 bg-muted border border-border rounded-md flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${selectedProfile?.color || 'bg-muted-foreground'}`} />
            <span className="text-sm font-medium text-foreground/80">
              {selectedProfile?.name || config.parentProfile} START_CALL Template
            </span>
          </div>

          {/* Show account fields info if account is selected */}
          {config.selectedAccounts && config.selectedAccounts.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-sm text-primary-foreground dark:text-primary">
                  Selected account has been copied to customerDetailsAO section
                </p>
              </div>
              {hasCustomerDetailsBeenEdited() && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-500/20 rounded-md">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</span>
                      <span>
                        Warning: customerDetailsAO has been manually edited and no longer matches the selected account. 
                        Changes to these fields will be preserved, but may cause inconsistencies.
                      </span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs shrink-0"
                      onClick={handleResyncWithAccount}
                    >
                      Resync with Account
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label className="text-sm">START_CALL Parameters (JSON)</Label>
            <div className="relative">
              <div className={`border rounded-md overflow-hidden ${
                jsonError ? 'border-destructive' : 'border-border'
              }`}>
                <CodeMirror
                  value={jsonText || JSON.stringify(config.startCallParams, null, 2)}
                  height="400px"
                  theme={isDarkMode ? oneDark : undefined}
                  extensions={[json()]}
                  onChange={(value) => {
                    dispatch({ type: 'UPDATE_JSON_TEXT', payload: value })
                    // Validate syntax in real-time
                    const syntaxError = validateJsonSyntax(value)
                    if (syntaxError) {
                      dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: syntaxError } })
                    } else {
                      dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: null } })
                    }
                  }}
                  placeholder="Enter JSON parameters..."
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    rectangularSelection: true,
                    highlightSelectionMatches: true,
                    searchKeymap: true,
                  }}
                />
              </div>
              {jsonError && (
                <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-xs text-destructive">
                  <span className="inline-block w-2 h-2 bg-destructive rounded-full"></span>
                  {jsonError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                {!jsonError && jsonText && hasChanges() && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <span className="inline-block w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full"></span>
                    Unsaved changes
                  </div>
                )}
                {!jsonError && jsonText && !hasChanges() && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                )}
                {hasCustomerDetailsBeenEdited() && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <span>⚠️</span>
                    <span>Customer details modified</span>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleParamsChange(jsonText)}
                disabled={isSaveDisabled()}
              >
                Save Changes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Edit the JSON structure above. Required fields: eventName, callDetailsAO, agentDetailsA0, customerDetailsAO
            </p>
          </div>
        </>
      ) : (
        <div className="p-8 text-center border border-border rounded-lg bg-muted">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Please select a Parent Profile first
          </p>
        </div>
      )}
    </div>
  )
})