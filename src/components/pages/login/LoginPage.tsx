import { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Button } from "../../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Label } from "../../ui/label"
import { Input } from "../../ui/input"
import { Checkbox } from "../../ui/checkbox"
import { Switch } from "../../ui/switch"
import { Settings, FileText, CreditCard, Eye, EyeOff, Trash2, Code, Search, Check, Plus, X, RotateCcw, Copy, Play, ChevronDown, ChevronRight } from "lucide-react"
import CodeMirror from '@uiw/react-codemirror'
import { defaultCodeMirrorSetup, getCodeMirrorTheme, jsonExtensions } from '../../../config/codemirror'
import { useDarkMode } from '../../../hooks/useDarkMode'
import { useClipboard } from '../../../hooks/useClipboard'
import { validateJsonSyntax } from '../../../lib/utils'
import type { LoginConfig, AccountTemplate } from '../../../../types/auth'
import { useLoginConfig } from './useLoginConfig'
import { PARENT_PROFILES, ENVIRONMENTS } from './login-constants'
import { getAccountTemplates } from '../../../../data/account-templates'
import { CALL_TEMPLATES } from '../../../../data/call-templates'
import { AddAccountForm } from './AddAccountForm'
import { ParametersTab } from './ParametersTab'
import { TokenService } from '../../../services/tokenService'
import { AUTO_GEN_FLAGS } from './auto-generation-config'

interface LoginPageProps {
  onLogin: (config: LoginConfig) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [state, dispatch] = useLoginConfig()
  const { config, saveCredentials, saveDefaultAccount, useIframe, useWebsocket } = state
  const isDarkMode = useDarkMode()
  const { copyToClipboard, isCopied } = useClipboard()
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    callBehavior: true,
    autoGeneration: false,
    developerMode: false
  })
  
  const selectedProfile = PARENT_PROFILES.find((p) => p.id === config.parentProfile)
  const selectedEnvironment = ENVIRONMENTS.find((e) => e.id === config.environment)

  const handleLogin = useCallback(async () => {
    setIsGeneratingToken(true)
    
    try {
      // Save credentials if checkbox is checked
      if (saveCredentials && config.parentProfile && config.environment) {
        const dataToSave = {
          username: config.username,
          password: config.password
        }
        localStorage.setItem(`aa-credentials-${config.parentProfile}-${config.environment}`, JSON.stringify(dataToSave))
      } else if (!saveCredentials && config.parentProfile && config.environment) {
        // Remove saved credentials if checkbox is unchecked
        localStorage.removeItem(`aa-credentials-${config.parentProfile}-${config.environment}`)
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
      
      // Generate token on login
      const tokenService = new TokenService()
      const tokenData = await tokenService.getToken(
        config.parentProfile, // eclipse, olympus, or sawgrass
        {
          username: config.username,
          password: config.password,
          environment: config.environment
        }
      )
      console.log('[Login] Token generated successfully')
      
      // Pass token along with config
      onLogin({
        ...config,
        token: tokenData.token
      })
    } catch (error) {
      console.error('Failed to generate token:', error)
      alert('Failed to generate authentication token. Please try again.')
    } finally {
      setIsGeneratingToken(false)
    }
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

  const handleCopyToClipboard = () => {
    copyToClipboard(JSON.stringify(config.startCallParams, null, 2))
  }

  const handleReset = () => {
    if (config.parentProfile) {
      const template = CALL_TEMPLATES.find((t) => t.id === `start_call_${config.parentProfile}`)
      if (template) {
        const resetParams: any = {
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
        <Card className="border-border shadow-none">
          <CardContent className="space-y-6">
            {/* Top Section with Profile, Environment, and Start Button */}
            <div className="bg-muted -mx-6 -mt-6 px-6 py-4 border-b rounded-t-lg">
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
                            {profile.name}
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
                      <p className="text-xs text-muted-foreground">{selectedEnvironment.url}</p>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleLogin} 
                  disabled={!isFormValid() || isGeneratingToken} 
                  className="px-6 mb-2"
                  title={!config.selectedAccounts || config.selectedAccounts.length === 0 ? "Please select an account" : ""}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isGeneratingToken ? 'Generating Token...' : 'Start'}
                </Button>
              </div>
              
            </div>

            {/* Main Content Layout - Dynamic 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Select Account + Authentication */}
              <div className="flex flex-col gap-6">
                {/* Select Account */}
                <Card className="border-border shadow-none flex-1">
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
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>

                        {/* Add Account Form */}
                        {state.showAddAccount && (
                          <div className="p-3 border border-dashed border-border rounded-lg">
                            <AddAccountForm
                              existingFields={Object.keys(accounts.allAccounts[0] || {})}
                              onSave={handleAddAccount}
                              onCancel={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAddAccount', value: false } })}
                            />
                          </div>
                        )}

                        {/* Compact account list */}
                        <div className="border border-border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                          {filteredAccounts.length > 0 ? (
                            <div className="divide-y divide-border">
                              {filteredAccounts.slice(0, state.showAllAccounts ? filteredAccounts.length : 6).map((account, index) => {
                                const isSelected = config.selectedAccounts?.some(
                                  (a: AccountTemplate) => JSON.stringify(a) === JSON.stringify(account)
                                )
                                const isCustomAccount = index >= accounts.visibleDefaultAccounts.length
                                
                                return (
                                  <div
                                    key={index}
                                    className={`group p-3 cursor-pointer transition-all duration-200 ${
                                      isSelected
                                        ? "bg-primary/10 hover:bg-primary/15 border-l-2 border-primary"
                                        : "hover:bg-muted/50"
                                    }`}
                                    onClick={() => handleAccountSelect(isSelected ? null : account)}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          {isSelected && (
                                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center shrink-0">
                                              <Check className="w-2.5 h-2.5 text-white" />
                                            </div>
                                          )}
                                          <span className="text-sm font-medium text-foreground truncate">
                                            {account.accountName || account.accountNumber || `Account ${index + 1}`}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                          {Object.entries(account).slice(0, 4).map(([key, value]) => (
                                            <div key={key} className="truncate">
                                              <span className="font-medium">{formatKey(key)}:</span> <span className="text-foreground">{String(value)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRemoveAccount(isCustomAccount, index, account)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-2 p-1 rounded hover:bg-destructive/10">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm">No accounts found</p>
                            </div>
                          )}
                        </div>

                        {filteredAccounts.length > 6 && !state.showAllAccounts && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAllAccounts', value: !state.showAllAccounts } })}
                            className="w-full text-xs h-8"
                          >
                            Show all {filteredAccounts.length} accounts
                          </Button>
                        )}

                        {config.selectedAccounts && config.selectedAccounts.length > 0 && (
                          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <Checkbox
                                checked={state.saveDefaultAccount}
                                onCheckedChange={(checked: boolean) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveDefaultAccount', value: checked } })}
                              />
                              <span className="text-primary font-medium">Set as default account</span>
                            </label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium">Select Parent Profile and Environment first</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Authentication */}
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter username"
                          value={config.username}
                          onChange={(e) =>
                            dispatch({ type: 'SET_FIELD', payload: { field: 'username', value: e.target.value } })
                          }
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={state.showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            className="pr-9 h-9"
                            value={config.password}
                            onChange={(e) =>
                              dispatch({ type: 'SET_FIELD', payload: { field: 'password', value: e.target.value } })
                            }
                          />
                          <button
                            type="button"
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
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
                        <span className="text-sm text-foreground">Save credentials</span>
                      </label>
                      
                      {state.saveCredentials && config.parentProfile && config.environment && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            localStorage.removeItem(`aa-credentials-${config.parentProfile}-${config.environment}`)
                            dispatch({ type: 'SET_CREDENTIALS', payload: { username: "", password: "" } })
                            dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: false } })
                          }}
                          className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Call Parameters */}
              <div className="flex flex-col">
                <ParametersTab
                  config={config}
                  jsonText={state.jsonText}
                  jsonError={state.jsonError}
                  autoGenConfig={state.autoGenConfig}
                  onParamsChange={handleParamsChange}
                  onUpdateJsonText={(value) => dispatch({ type: 'UPDATE_JSON_TEXT', payload: value })}
                  onReset={handleReset}
                  dispatch={dispatch}
                />
              </div>
            </div>

            {/* Advanced Settings Section */}
            <div>
                <Card className="border-border shadow-none">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Advanced Settings
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scrollable toggle container */}
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-3">Configuration Flags</h4>
                      <div className="max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Call Behavior Toggles */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={config.autoStartCall ?? selectedProfile?.defaultBehaviors.autoStartCall ?? false}
                              onCheckedChange={(checked) => 
                                dispatch({ type: 'SET_FIELD', payload: { field: 'autoStartCall', value: checked } })
                              }
                            />
                            <span className="text-sm">Auto Start Call</span>
                          </label>
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Switch
                              checked={config.skipFlag || false}
                              onCheckedChange={(checked) => 
                                dispatch({ type: 'SET_FIELD', payload: { field: 'skipFlag', value: checked } })
                              }
                            />
                            <span className="text-sm">Skip Flag</span>
                          </label>

                          {/* Auto Generation Toggles - Dynamically rendered from registry */}
                          {Object.entries(AUTO_GEN_FLAGS).map(([key, flag]) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={state.autoGenConfig[key as keyof typeof state.autoGenConfig] || false}
                                onCheckedChange={(checked) => 
                                  dispatch({ type: 'SET_AUTO_GEN_CONFIG', payload: { [key]: checked } })
                                }
                              />
                              <span className="text-sm">{flag.displayName}</span>
                            </label>
                          ))}
                          
                          {/* Add more toggles here - they will automatically be in the scrollable area */}
                        </div>
                      </div>
                    </div>

                    {/* Developer Mode Section */}
                    <div className="border rounded-lg">
                      <div className="w-full px-4 py-3 flex items-center justify-between">
                        <button
                          className="flex-1 flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                          onClick={() => setExpandedSections(prev => ({ ...prev, developerMode: !prev.developerMode }))}
                        >
                          {expandedSections.developerMode ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="text-sm font-medium">Developer Mode</span>
                        </button>
                        <Switch
                          checked={config.devMode}
                          onCheckedChange={(checked) => {
                            dispatch({ type: 'SET_FIELD', payload: { field: 'devMode', value: checked } })
                            if (checked) {
                              setExpandedSections(prev => ({ ...prev, developerMode: true }))
                            }
                          }}
                        />
                      </div>
                      {expandedSections.developerMode && config.devMode && (
                        <div className="px-4 pb-3 space-y-3">
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
                            <p className="text-xs text-muted-foreground">URL for iframe-based agent assist</p>
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
                            <p className="text-xs text-muted-foreground">WebSocket endpoint for direct communication</p>
                          </div>
                        )}
                        
                        {config.devMode && !state.useIframe && !state.useWebsocket && (
                          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md mt-3">
                            <p className="text-sm text-destructive-foreground">
                              Please select at least one connection method
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    </div>

                  </CardContent>
                </Card>
              </div>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}