import { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Button } from "../../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Label } from "../../ui/label"
import { Input } from "../../ui/input"
import { Checkbox } from "../../ui/checkbox"
import { Switch } from "../../ui/switch"
import { Settings, FileText, CreditCard, Eye, EyeOff, Trash2, Code, Search, Check, Plus, X, RotateCcw, Copy } from "lucide-react"
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import type { LoginConfig, AccountTemplate } from '../../../../types/auth'
import { useLoginConfig } from './useLoginConfig'
import { PARENT_PROFILES, ENVIRONMENTS } from './login-constants'
import { getAccountTemplates } from '../../../../data/account-templates'
import { CALL_TEMPLATES } from '../../../../data/call-templates'
import { AddAccountForm } from './AddAccountForm'

interface LoginPageProps {
  onLogin: (config: LoginConfig) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [state, dispatch] = useLoginConfig()
  const { config, saveCredentials, saveDefaultAccount, useIframe, useWebsocket } = state
  
  const selectedProfile = PARENT_PROFILES.find((p) => p.id === config.parentProfile)
  const selectedEnvironment = ENVIRONMENTS.find((e) => e.id === config.environment)

  const handleLogin = useCallback(() => {
    // Save credentials if checkbox is checked
    if (saveCredentials && config.environment) {
      const dataToSave = {
        username: config.username,
        password: config.password
      }
      localStorage.setItem(`aa-credentials-${config.environment}`, JSON.stringify(dataToSave))
    } else if (!saveCredentials && config.environment) {
      // Remove saved credentials if checkbox is unchecked
      localStorage.removeItem(`aa-credentials-${config.environment}`)
    }
    
    // Save default account if checkbox is checked
    if (saveDefaultAccount && config.parentProfile && config.environment && config.selectedAccounts && config.selectedAccounts.length > 0) {
      localStorage.setItem(
        `aa-default-account-${config.parentProfile}-${config.environment}`, 
        JSON.stringify(config.selectedAccounts[0])
      )
    } else if (!saveDefaultAccount && config.parentProfile && config.environment) {
      // Remove saved default account if checkbox is unchecked
      localStorage.removeItem(`aa-default-account-${config.parentProfile}-${config.environment}`)
    }
    
    onLogin(config)
  }, [config, saveCredentials, saveDefaultAccount, onLogin])

  const isFormValid = useCallback(() => {
    const baseValid = config.username && 
      config.password && 
      config.parentProfile && 
      config.environment && 
      config.startCallParams && 
      config.selectedAccounts && 
      config.selectedAccounts.length > 0
    
    // If dev mode is enabled, at least one connection method must be selected
    if (config.devMode) {
      return baseValid && (useIframe || useWebsocket)
    }
    
    return baseValid
  }, [config, useIframe, useWebsocket])

  const key = config.parentProfile && config.environment ? `${config.parentProfile}_${config.environment}` : null
  const accounts = (() => {
    if (!key) return { allAccounts: [], visibleDefaultAccounts: [] }
    
    const defaultAccounts = getAccountTemplates(config.parentProfile, config.environment)
    const hiddenIndices = state.hiddenDefaultAccounts[key] || new Set()
    const visibleDefaultAccounts = defaultAccounts.filter((_: AccountTemplate, index: number) => !hiddenIndices.has(index))
    const userAccounts = state.customAccounts[key] || []
    const allAccounts = [...visibleDefaultAccounts, ...userAccounts]
    
    return { allAccounts, visibleDefaultAccounts }
  })()

  const filteredAccounts = (() => {
    if (!state.accountSearch) return accounts.allAccounts
    
    const searchLower = state.accountSearch.toLowerCase()
    return accounts.allAccounts.filter(account => {
      return Object.entries(account).some(([key, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
        return valueStr.toLowerCase().includes(searchLower) || key.toLowerCase().includes(searchLower)
      })
    })
  })()

  const handleAccountSelect = (account: AccountTemplate | null) => {
    dispatch({ type: 'SELECT_ACCOUNT', payload: account })
  }

  const handleRemoveAccount = (isCustomAccount: boolean, index: number, account: AccountTemplate) => {
    if (!key) return
    
    if (isCustomAccount) {
      const accountIndex = index - accounts.visibleDefaultAccounts.length
      dispatch({ type: 'REMOVE_CUSTOM_ACCOUNT', payload: { key, index: accountIndex } })
    } else {
      const defaultAccounts = getAccountTemplates(config.parentProfile, config.environment)
      const defaultIndex = defaultAccounts.findIndex(
        (acc: AccountTemplate) => JSON.stringify(acc) === JSON.stringify(account)
      )
      if (defaultIndex !== -1) {
        dispatch({ type: 'HIDE_DEFAULT_ACCOUNT', payload: { key, index: defaultIndex } })
      }
    }
    
    if (config.selectedAccounts?.some((a: AccountTemplate) => JSON.stringify(a) === JSON.stringify(account))) {
      handleAccountSelect(null)
    }
  }

  const handleAddAccount = (newAccount: AccountTemplate) => {
    if (key) {
      dispatch({ type: 'ADD_CUSTOM_ACCOUNT', payload: { key, account: newAccount } })
    }
  }

  const validateJsonSyntax = (value: string) => {
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

  const handleParamsChange = (value: string) => {
    try {
      const parsed = JSON.parse(value)
      
      if (!parsed.eventName) {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'Missing required field: eventName' } })
        return
      }
      
      if (parsed.eventName !== 'START_CALL') {
        dispatch({ type: 'SET_UI_STATE', payload: { field: 'jsonError', value: 'eventName must be "START_CALL"' } })
        return
      }
      
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
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config.startCallParams, null, 2))
  }

  const handleReset = () => {
    if (config.parentProfile) {
      const template = CALL_TEMPLATES.find((t) => t.id === `start_call_${config.parentProfile}`)
      if (template) {
        const resetParams = {
          ...template.params,
          callDetailsAO: {
            ...template.params.callDetailsAO,
            Ucid: `${Date.now()}00000000000`,
            convertedUcid: `${config.parentProfile.toUpperCase()}${Date.now()}`
          }
        }
        
        if (config.selectedAccounts && config.selectedAccounts.length > 0) {
          const account = config.selectedAccounts[0]
          resetParams.customerDetailsAO = { ...account }
        }
        
        dispatch({ type: 'UPDATE_PARAMS', payload: resetParams })
      }
    }
  }

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <Card className="border-gray-200 shadow-none">
          <CardContent className="space-y-6">
            {/* Top Section with Profile, Environment, and Start Button */}
            <div className="bg-gray-50 -mx-6 -mt-6 px-6 py-4 border-b rounded-t-lg">
              <div className="flex items-end gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Parent Profile</Label>
                    <Select
                      value={config.parentProfile}
                      onValueChange={(value) => dispatch({ type: 'SET_PARENT_PROFILE', payload: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARENT_PROFILES.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${profile.color}`} />
                              {profile.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Environment</Label>
                    <Select
                      value={config.environment}
                      onValueChange={(value) => dispatch({ type: 'SET_FIELD', payload: { field: 'environment', value } })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENVIRONMENTS.map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedEnvironment && (
                      <p className="text-xs text-gray-500">{selectedEnvironment.url}</p>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleLogin} 
                  disabled={!isFormValid()} 
                  className="px-6 mb-2"
                  title={!config.selectedAccounts || config.selectedAccounts.length === 0 ? "Please select an account" : ""}
                >
                  Start Testing
                </Button>
              </div>
              
            </div>

            {/* Main content area with all sections visible */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Account Selection + Authentication */}
              <div className="space-y-6">
                {/* Account Selection Section */}
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Select Account
                      </CardTitle>
                      {config.parentProfile && config.environment && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAddAccount', value: !state.showAddAccount } })}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.parentProfile && config.environment ? (
                      <div className="space-y-3">
                        {/* Search bar */}
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Search accounts..."
                            value={state.accountSearch}
                            onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'accountSearch', value: e.target.value } })}
                            className="pl-8 h-9"
                          />
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        </div>

                        {/* Add Account Form */}
                        {state.showAddAccount && (
                          <div className="p-3 border border-dashed border-gray-300 rounded-lg">
                            <AddAccountForm
                              existingFields={Object.keys(accounts.allAccounts[0] || {})}
                              onSave={handleAddAccount}
                              onCancel={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAddAccount', value: false } })}
                            />
                          </div>
                        )}

                        {/* Compact account list */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                          {filteredAccounts.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                              {filteredAccounts.slice(0, 5).map((account, index) => {
                                const isSelected = config.selectedAccounts?.some(
                                  (a: AccountTemplate) => JSON.stringify(a) === JSON.stringify(account)
                                )
                                const isCustomAccount = index >= accounts.visibleDefaultAccounts.length
                                
                                return (
                                  <div
                                    key={index}
                                    className={`group p-3 cursor-pointer transition-colors ${
                                      isSelected
                                        ? "bg-primary/10 hover:bg-primary/20"
                                        : "hover:bg-muted"
                                    }`}
                                    onClick={() => handleAccountSelect(isSelected ? null : account)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          {isSelected && (
                                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center shrink-0">
                                              <Check className="w-2.5 h-2.5 text-white" />
                                            </div>
                                          )}
                                          <span className="text-sm font-medium text-gray-900 truncate">
                                            {account.accountName || account.accountNumber || `Account ${index + 1}`}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                                          {Object.entries(account).slice(0, 4).map(([key, value]) => (
                                            <div key={key} className="truncate">
                                              <span className="text-gray-500">{formatKey(key)}:</span> {String(value)}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRemoveAccount(isCustomAccount, index, account)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 ml-2"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No accounts found
                            </div>
                          )}
                        </div>

                        {filteredAccounts.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAllAccounts', value: !state.showAllAccounts } })}
                            className="w-full text-xs"
                          >
                            Show all {filteredAccounts.length} accounts
                          </Button>
                        )}

                        {config.selectedAccounts && config.selectedAccounts.length > 0 && (
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={state.saveDefaultAccount}
                              onCheckedChange={(checked: boolean) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveDefaultAccount', value: checked } })}
                            />
                            <span className="text-gray-700">Set as default account</span>
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm">Select Parent Profile and Environment first</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Authentication Section */}
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter username"
                          value={config.username}
                          onChange={(e) =>
                            dispatch({ type: 'SET_FIELD', payload: { field: 'username', value: e.target.value } })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={state.showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            className="pr-10"
                            value={config.password}
                            onChange={(e) =>
                              dispatch({ type: 'SET_FIELD', payload: { field: 'password', value: e.target.value } })
                            }
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showPassword', value: !state.showPassword } })}
                          >
                            {state.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={state.saveCredentials}
                          onCheckedChange={(checked: boolean) => 
                            dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: checked } })
                          }
                        />
                        <span className="text-sm text-gray-700">Save credentials</span>
                      </label>
                      {state.saveCredentials && config.environment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            localStorage.removeItem(`aa-credentials-${config.environment}`)
                            dispatch({ type: 'SET_CREDENTIALS', payload: { username: "", password: "" } })
                            dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: false } })
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>

                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Call Parameters */}
              <Card className="border-gray-200 shadow-none">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Call Parameters
                    </CardTitle>
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
                </CardHeader>
                <CardContent>
                  {config.parentProfile ? (
                    <div className="space-y-3">
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                        {selectedProfile?.name || config.parentProfile} START_CALL Template
                      </div>

                      {config.selectedAccounts && config.selectedAccounts.length > 0 && (
                        <div className="p-2 bg-primary/10 border border-primary/30 rounded text-sm text-primary">
                          Account fields copied to customerDetailsAO
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label className="text-sm">START_CALL Parameters (JSON)</Label>
                        <div className="relative">
                          <div className={`border rounded-md overflow-hidden ${
                            state.jsonError ? 'border-red-500' : 'border-gray-200'
                          }`}>
                            <CodeMirror
                              value={state.jsonText || JSON.stringify(config.startCallParams, null, 2)}
                              height="450px"
                              theme={undefined}
                              extensions={[json()]}
                              onChange={(value) => {
                                dispatch({ type: 'UPDATE_JSON_TEXT', payload: value })
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
                          {state.jsonError && (
                            <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-600">
                              <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                              {state.jsonError}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleParamsChange(state.jsonText)}
                            disabled={!!state.jsonError || !state.jsonText}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm">Select a Parent Profile first</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Developer Mode Section */}
            <div className="mt-6">
                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        Developer Settings
                      </CardTitle>
                      <Switch
                        checked={config.devMode}
                        onCheckedChange={(checked) =>
                          dispatch({ type: 'SET_FIELD', payload: { field: 'devMode', value: checked } })
                        }
                      />
                    </div>
                  </CardHeader>
                  {config.devMode && (
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-accent/10 border border-accent/30 rounded-md">
                        <p className="text-sm text-accent-foreground">
                          Enable localhost connections for development and testing
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={state.useIframe}
                            onCheckedChange={(checked) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'useIframe', value: checked } })}
                          />
                          <span className="text-sm font-medium">Enable Iframe Connection</span>
                        </label>
                        
                        {state.useIframe && (
                          <div className="ml-6 space-y-2">
                            <Label htmlFor="iframeUrl" className="text-sm">Iframe URL</Label>
                            <Input
                              id="iframeUrl"
                              type="text"
                              placeholder="http://localhost:3001"
                              value={config.localhostIframeUrl || ""}
                              onChange={(e) =>
                                dispatch({ type: 'SET_FIELD', payload: { field: 'localhostIframeUrl', value: e.target.value } })
                              }
                            />
                            <p className="text-xs text-gray-500">URL for iframe-based agent assist</p>
                          </div>
                        )}
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={state.useWebsocket}
                            onCheckedChange={(checked) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'useWebsocket', value: checked } })}
                          />
                          <span className="text-sm font-medium">Enable WebSocket Connection</span>
                        </label>
                        
                        {state.useWebsocket && (
                          <div className="ml-6 space-y-2">
                            <Label htmlFor="websocketUrl" className="text-sm">WebSocket URL</Label>
                            <Input
                              id="websocketUrl"
                              type="text"
                              placeholder="ws://localhost:8080"
                              value={config.localhostWebsocketUrl || ""}
                              onChange={(e) =>
                                dispatch({ type: 'SET_FIELD', payload: { field: 'localhostWebsocketUrl', value: e.target.value } })
                              }
                            />
                            <p className="text-xs text-gray-500">WebSocket endpoint for direct communication</p>
                          </div>
                        )}
                      </div>
                      
                      {config.devMode && !state.useIframe && !state.useWebsocket && (
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                          <p className="text-sm text-destructive-foreground">
                            Please select at least one connection method
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}