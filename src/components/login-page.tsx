import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { User, Lock, Globe, Eye, EyeOff, Copy, RotateCcw, FileText, Settings, Zap, Code, CreditCard, Check, Search, Plus, X, Edit2, Trash2 } from "lucide-react"
import type { LoginConfig, ParentProfile, Environment, AccountTemplate } from "src/../types/auth"
import { CALL_TEMPLATES } from "@/../data/call-templates"
import { getAccountTemplates } from "@/../data/account-templates"
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'

// Component for adding new accounts
interface AddAccountFormProps {
  existingFields: string[]
  onSave: (account: AccountTemplate) => void
  onCancel: () => void
}

function AddAccountForm({ existingFields, onSave, onCancel }: AddAccountFormProps) {
  const [newAccount, setNewAccount] = useState<AccountTemplate>({})
  const [fieldInputs, setFieldInputs] = useState<Record<string, boolean>>({})

  const handleFieldToggle = (field: string) => {
    if (fieldInputs[field]) {
      const updated = { ...newAccount }
      delete updated[field]
      setNewAccount(updated)
    }
    setFieldInputs({ ...fieldInputs, [field]: !fieldInputs[field] })
  }

  const updateField = (field: string, value: any) => {
    setNewAccount({ ...newAccount, [field]: value })
  }

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select fields to include:</Label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded">
          {existingFields.map(field => (
            <label key={field} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={fieldInputs[field] || false}
                onChange={() => handleFieldToggle(field)}
                className="rounded border-gray-300"
              />
              <span>{formatKey(field)}</span>
            </label>
          ))}
        </div>
      </div>

      {Object.keys(fieldInputs).filter(f => fieldInputs[f]).length > 0 && (
        <div className="space-y-3 border-t pt-3">
          {Object.keys(fieldInputs).filter(f => fieldInputs[f]).map(field => (
            <div key={field} className="space-y-2">
              <Label className="text-sm">{formatKey(field)}</Label>
              <Input
                value={newAccount[field] || ''}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder={`Enter ${formatKey(field).toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t">
        <Button
          size="sm"
          onClick={() => onSave(newAccount)}
          disabled={Object.keys(newAccount).length === 0}
        >
          Add Account
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

const PARENT_PROFILES: ParentProfile[] = [
  {
    id: "eclipse",
    name: "Eclipse",
    color: "bg-purple-500",
  },
  {
    id: "olympus",
    name: "Olympus",
    color: "bg-green-500",
  },
  {
    id: "sawgrass",
    name: "Sawgrass",
    color: "bg-blue-500",
  },
]

const ENVIRONMENTS: Environment[] = [
  {
    id: "development",
    name: "Development",
    url: "https://dev-agent-assist.example.com",
    description: "Development environment for testing",
  },
  {
    id: "staging",
    name: "Staging",
    url: "https://staging-agent-assist.example.com",
    description: "Pre-production environment",
  },
  {
    id: "production",
    name: "Production",
    url: "https://agent-assist.example.com",
    description: "Live production environment",
  },
  {
    id: "local",
    name: "Local",
    url: "http://localhost:3000",
    description: "Local development server",
  },
]

interface LoginPageProps {
  onLogin: (config: LoginConfig) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [accountSearch, setAccountSearch] = useState("")
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [customAccounts, setCustomAccounts] = useState<Record<string, AccountTemplate[]>>({})
  const [hiddenDefaultAccounts, setHiddenDefaultAccounts] = useState<Record<string, Set<number>>>({})
  const [useIframe, setUseIframe] = useState(true)
  const [useWebsocket, setUseWebsocket] = useState(false)
  const [saveCredentials, setSaveCredentials] = useState(false)
  const [saveDefaultAccount, setSaveDefaultAccount] = useState(false)
  const [activeTab, setActiveTab] = useState("config")
  const [config, setConfig] = useState<LoginConfig>({
    username: "",
    password: "",
    parentProfile: "",
    environment: "",
    startCallParams: {},
    devMode: false,
    localhostIframeUrl: "http://localhost:3001",
    localhostWebsocketUrl: "ws://localhost:8080",
    selectedAccounts: [],
  })

  const selectedProfile = PARENT_PROFILES.find((p) => p.id === config.parentProfile)
  const selectedEnvironment = ENVIRONMENTS.find((e) => e.id === config.environment)

  // Automatically update call parameters when parent profile changes
  useEffect(() => {
    if (config.parentProfile) {
      const template = CALL_TEMPLATES.find((t) => t.id === `start_call_${config.parentProfile}`)
      if (template) {
        // Create new params with dynamic fields
        const newParams = {
          ...template.params,
          callDetailsAO: {
            ...template.params.callDetailsAO,
            Ucid: `${Date.now()}00000000000`,
            convertedUcid: `${config.parentProfile.toUpperCase()}${Date.now()}`
          }
        }
        
        // Clear selected accounts when changing parent profile since they're profile-specific
        setConfig(prev => ({
          ...prev,
          startCallParams: newParams,
          selectedAccounts: [] // Clear accounts when changing profile
        }))
        setJsonText(JSON.stringify(newParams, null, 2))
      }
    }
    // Reset selected fields when changing LOB
    setSelectedFields([])
    setShowFieldSelector(false)
  }, [config.parentProfile])

  // Handle account template changes when parent profile or environment changes
  useEffect(() => {
    if (config.parentProfile && config.environment) {
      // Reset custom accounts when changing profile/environment combination
      const key = `${config.parentProfile}_${config.environment}`
      if (!customAccounts[key]) {
        setCustomAccounts(prev => ({ ...prev, [key]: [] }))
      }
      if (!hiddenDefaultAccounts[key]) {
        setHiddenDefaultAccounts(prev => ({ ...prev, [key]: new Set() }))
      }
    }
  }, [config.parentProfile, config.environment])

  // Load saved credentials when environment changes
  useEffect(() => {
    if (config.environment) {
      const savedData = localStorage.getItem(`aa-credentials-${config.environment}`)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          setConfig(prev => ({
            ...prev,
            username: parsed.username || "",
            password: parsed.password || ""
          }))
          setSaveCredentials(true)
        } catch (error) {
          console.error("Failed to parse saved credentials", error)
        }
      } else {
        // Clear credentials when switching to an environment with no saved data
        setConfig(prev => ({
          ...prev,
          username: "",
          password: ""
        }))
        setSaveCredentials(false)
      }
    }
  }, [config.environment])

  // Load default account when profile and environment change
  useEffect(() => {
    if (config.parentProfile && config.environment) {
      const savedDefaultAccount = localStorage.getItem(`aa-default-account-${config.parentProfile}-${config.environment}`)
      if (savedDefaultAccount) {
        try {
          const account = JSON.parse(savedDefaultAccount)
          
          setConfig(prev => {
            const updatedStartCallParams = { ...prev.startCallParams }
            
            // Ensure customerDetailsAO exists
            if (!updatedStartCallParams.customerDetailsAO) {
              updatedStartCallParams.customerDetailsAO = {}
            }
            
            // Replace entire customerDetailsAO with account object
            updatedStartCallParams.customerDetailsAO = { ...account }
            
            return {
              ...prev,
              selectedAccounts: [account],
              startCallParams: updatedStartCallParams
            }
          })
          setSaveDefaultAccount(true)
        } catch (error) {
          console.error("Failed to parse saved default account", error)
        }
      } else {
        setSaveDefaultAccount(false)
      }
    }
  }, [config.parentProfile, config.environment])


  const handleParamsChange = (value: string) => {
    try {
      const parsed = JSON.parse(value)
      
      // Validate required fields based on the new structure
      if (!parsed.eventName) {
        setJsonError('Missing required field: eventName')
        return
      }
      
      // Validate event type
      if (parsed.eventName !== 'START_CALL') {
        setJsonError('eventName must be "START_CALL"')
        return
      }
      
      // Validate required nested objects
      if (!parsed.callDetailsAO || typeof parsed.callDetailsAO !== 'object') {
        setJsonError('Missing or invalid callDetailsAO object')
        return
      }
      
      if (!parsed.agentDetailsA0 || typeof parsed.agentDetailsA0 !== 'object') {
        setJsonError('Missing or invalid agentDetailsA0 object')
        return
      }
      
      if (!parsed.customerDetailsAO || typeof parsed.customerDetailsAO !== 'object') {
        setJsonError('Missing or invalid customerDetailsAO object')
        return
      }
      
      setJsonError(null)
      setConfig(prev => ({
        ...prev,
        startCallParams: parsed,
      }))
      // Update jsonText to the properly formatted version
      setJsonText(JSON.stringify(parsed, null, 2))
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Try to provide more specific error message
        const match = error.message.match(/position (\d+)/)
        if (match) {
          const position = parseInt(match[1])
          const lines = value.substring(0, position).split('\n')
          const line = lines.length
          setJsonError(`Invalid JSON syntax at line ${line}`)
        } else {
          setJsonError('Invalid JSON syntax - check for trailing commas, missing quotes, or duplicate keys')
        }
      } else {
        setJsonError('Error parsing JSON')
      }
    }
  }

  // Check if customerDetailsAO has been manually edited
  const hasCustomerDetailsBeenEdited = () => {
    if (!config.selectedAccounts || config.selectedAccounts.length === 0) return false
    
    const selectedAccount = config.selectedAccounts[0]
    const customerDetails = config.startCallParams?.customerDetailsAO || {}
    
    // Check if customerDetailsAO differs from selected account
    // Compare all fields from the account
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config.startCallParams, null, 2))
  }

  const handleLogin = () => {
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
    if (saveDefaultAccount && config.parentProfile && config.environment && config.selectedAccounts.length > 0) {
      localStorage.setItem(
        `aa-default-account-${config.parentProfile}-${config.environment}`, 
        JSON.stringify(config.selectedAccounts[0])
      )
    } else if (!saveDefaultAccount && config.parentProfile && config.environment) {
      // Remove saved default account if checkbox is unchecked
      localStorage.removeItem(`aa-default-account-${config.parentProfile}-${config.environment}`)
    }
    
    onLogin(config)
  }

  const handleResetCredentials = () => {
    if (config.environment) {
      localStorage.removeItem(`aa-credentials-${config.environment}`)
      setConfig(prev => ({
        ...prev,
        username: "",
        password: ""
      }))
      setSaveCredentials(false)
    }
  }

  const isFormValid = () => {
    const baseValid = config.username && config.password && config.parentProfile && config.environment && config.startCallParams && config.selectedAccounts.length > 0
    
    // If dev mode is enabled, at least one connection method must be selected
    if (config.devMode) {
      return baseValid && (useIframe || useWebsocket)
    }
    
    return baseValid
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <Card className="shadow-lg border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-900">Agent Assist Tester</CardTitle>
            <p className="text-sm text-gray-600">Configure your testing environment</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Parent Profile & Environment Selection - Top Level */}
            <div className="pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Parent Profile</Label>
                  <Select
                    value={config.parentProfile}
                    onValueChange={(value) =>
                      setConfig({
                        ...config,
                        parentProfile: value,
                      })
                    }
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
                    onValueChange={(value) =>
                      setConfig({
                        ...config,
                        environment: value,
                      })
                    }
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
              
              {config.parentProfile && config.environment && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedProfile?.color || 'bg-gray-500'}`} />
                    {selectedProfile?.name} - {selectedEnvironment?.name}
                  </div>
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Authentication
                </TabsTrigger>
                <TabsTrigger value="parameters" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Call Parameters
                </TabsTrigger>
                <TabsTrigger value="accounts" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Accounts
                </TabsTrigger>
              </TabsList>

              {/* Configuration Tab */}
              <TabsContent value="config" className="space-y-6">
                {/* Selected Account Display */}
                {config.selectedAccounts && config.selectedAccounts.length > 0 && config.parentProfile && config.environment && (
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-medium text-blue-800">
                            Selected Account
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("accounts")}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          Change Account
                        </Button>
                      </div>
                    </div>
                    <div className="bg-white p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(config.selectedAccounts[0]).slice(0, 6).map(([key, value]) => {
                          const formattedKey = key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim()
                          
                          return (
                            <div key={key} className="space-y-1">
                              <p className="text-xs text-gray-500">{formattedKey}</p>
                              <p className="text-sm font-medium text-gray-900 truncate" title={String(value)}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value) || '-'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                      {Object.keys(config.selectedAccounts[0]).length > 6 && (
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          +{Object.keys(config.selectedAccounts[0]).length - 6} more fields
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Authentication Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter username"
                        value={config.username}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            username: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          className="pr-10"
                          value={config.password}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              password: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveCredentials}
                          onChange={(e) => setSaveCredentials(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Save credentials for this environment</span>
                      </label>
                      {saveCredentials && config.environment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetCredentials}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dev Mode Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-gray-600" />
                      <h3 className="text-base font-medium text-gray-900">Developer Mode</h3>
                    </div>
                    <Switch
                      checked={config.devMode}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          devMode: checked,
                        })
                      }
                    />
                  </div>
                  
                  {config.devMode && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          Dev mode enables localhost connections for testing. Select one or both connection methods.
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Connection Methods</Label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={useIframe}
                                onChange={(e) => {
                                  setUseIframe(e.target.checked)
                                  if (!e.target.checked) {
                                    setConfig({
                                      ...config,
                                      localhostIframeUrl: ""
                                    })
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">Enable Iframe Connection</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={useWebsocket}
                                onChange={(e) => {
                                  setUseWebsocket(e.target.checked)
                                  if (!e.target.checked) {
                                    setConfig({
                                      ...config,
                                      localhostWebsocketUrl: ""
                                    })
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">Enable WebSocket Connection</span>
                            </label>
                          </div>
                          {!useIframe && !useWebsocket && (
                            <p className="text-xs text-red-600">Please select at least one connection method</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {useIframe && (
                            <div className="space-y-2">
                              <Label htmlFor="iframeUrl" className="text-sm">Localhost Iframe URL</Label>
                              <Input
                                id="iframeUrl"
                                type="text"
                                placeholder="http://localhost:3001"
                                value={config.localhostIframeUrl || ""}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    localhostIframeUrl: e.target.value,
                                  })
                                }
                              />
                              <p className="text-xs text-gray-500">URL for iframe-based agent assist</p>
                            </div>
                          )}
                          
                          {useWebsocket && (
                            <div className="space-y-2">
                              <Label htmlFor="websocketUrl" className="text-sm">Localhost WebSocket URL</Label>
                              <Input
                                id="websocketUrl"
                                type="text"
                                placeholder="ws://localhost:8080"
                                value={config.localhostWebsocketUrl || ""}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    localhostWebsocketUrl: e.target.value,
                                  })
                                }
                              />
                              <p className="text-xs text-gray-500">WebSocket endpoint for direct communication</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Parameters Tab */}
              <TabsContent value="parameters" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">Call Parameters</h3>
                      <p className="text-sm text-gray-500 mt-1">START_CALL event configuration</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard} title="Copy JSON">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (config.parentProfile) {
                            const template = CALL_TEMPLATES.find((t) => t.id === `start_call_${config.parentProfile}`)
                            if (template) {
                              // Reset to template but preserve account fields if an account is selected
                              let resetParams = {
                                ...template.params,
                                callDetailsAO: {
                                  ...template.params.callDetailsAO,
                                  Ucid: `${Date.now()}00000000000`,
                                  convertedUcid: `${config.parentProfile.toUpperCase()}${Date.now()}`
                                }
                              }
                              
                              // If an account is selected, merge its fields into customerDetailsAO
                              if (config.selectedAccounts.length > 0) {
                                const account = config.selectedAccounts[0]
                                
                                // Replace entire customerDetailsAO with account object
                                resetParams.customerDetailsAO = { ...account }
                              }
                              
                              setConfig(prev => ({
                                ...prev,
                                startCallParams: resetParams,
                              }))
                              setJsonText(JSON.stringify(resetParams, null, 2))
                              setJsonError(null)
                            }
                          }
                        }}
                        title="Reset to default template"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {config.parentProfile ? (
                    <>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${selectedProfile?.color || 'bg-gray-500'}`} />
                        <span className="text-sm font-medium text-gray-700">
                          {selectedProfile?.name || config.parentProfile} START_CALL Template
                        </span>
                      </div>

                      {/* Show account fields info if account is selected */}
                      {config.selectedAccounts.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                              Selected account has been copied to customerDetailsAO section
                            </p>
                          </div>
                          {hasCustomerDetailsBeenEdited() && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-yellow-800 flex items-start gap-2">
                                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                                  <span>
                                    Warning: customerDetailsAO has been manually edited and no longer matches the selected account. 
                                    Changes to these fields will be preserved, but may cause inconsistencies.
                                  </span>
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs shrink-0"
                                  onClick={() => {
                                    if (config.selectedAccounts.length > 0) {
                                      const account = config.selectedAccounts[0]
                                      const updatedStartCallParams = { ...config.startCallParams }
                                      
                                      // Replace entire customerDetailsAO with account object
                                      updatedStartCallParams.customerDetailsAO = { ...account }
                                      
                                      setConfig(prev => ({
                                        ...prev,
                                        startCallParams: updatedStartCallParams
                                      }))
                                      setJsonText(JSON.stringify(updatedStartCallParams, null, 2))
                                    }
                                  }}
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
                            jsonError ? 'border-red-500' : 'border-gray-200'
                          }`}>
                            <CodeMirror
                              value={jsonText || JSON.stringify(config.startCallParams, null, 2)}
                              height="400px"
                              theme={undefined} // Use default light theme
                              extensions={[json()]}
                              onChange={(value) => {
                                setJsonText(value)
                                // Validate syntax in real-time
                                const syntaxError = validateJsonSyntax(value)
                                if (syntaxError) {
                                  setJsonError(syntaxError)
                                } else {
                                  setJsonError(null)
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
                            <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-xs text-red-600">
                              <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                              {jsonError}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3">
                            {(() => {
                              try {
                                const parsed = JSON.parse(jsonText || "{}")
                                const hasChanges = JSON.stringify(parsed, null, 2) !== JSON.stringify(config.startCallParams, null, 2)
                                if (!jsonError && jsonText && hasChanges) {
                                  return (
                                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                      Unsaved changes
                                    </div>
                                  )
                                } else if (!jsonError && jsonText && !hasChanges) {
                                  return (
                                    <div className="flex items-center gap-1 text-xs text-green-600">
                                      <Check className="w-3 h-3" />
                                      Saved
                                    </div>
                                  )
                                }
                              } catch {
                                return null
                              }
                            })()}
                            {hasCustomerDetailsBeenEdited() && (
                              <div className="flex items-center gap-1 text-xs text-amber-600">
                                <span>⚠️</span>
                                <span>Customer details modified</span>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              handleParamsChange(jsonText)
                            }}
                            disabled={(() => {
                              if (!!jsonError || !jsonText) return true
                              try {
                                const parsed = JSON.parse(jsonText || "{}")
                                return JSON.stringify(parsed, null, 2) === JSON.stringify(config.startCallParams, null, 2)
                              } catch {
                                return true
                              }
                            })()}
                          >
                            Save Changes
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Edit the JSON structure above. Required fields: eventName, callDetailsAO, agentDetailsA0, customerDetailsAO
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center border border-gray-200 rounded-lg bg-gray-50">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        Please select a Parent Profile first
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Accounts Tab */}
              <TabsContent value="accounts" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">Select Account</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose one account to use for this session
                      </p>
                    </div>
                    {config.parentProfile && config.environment && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddAccount(!showAddAccount)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Account
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Reset accounts for current profile+environment
                            const key = `${config.parentProfile}_${config.environment}`
                            setCustomAccounts({
                              ...customAccounts,
                              [key]: []
                            })
                            const hiddenSet = new Set(hiddenDefaultAccounts[key] || [])
                            hiddenSet.clear()
                            setHiddenDefaultAccounts({
                              ...hiddenDefaultAccounts,
                              [key]: hiddenSet
                            })
                            // Clear selection
                            setConfig({
                              ...config,
                              selectedAccounts: []
                            })
                          }}
                          title="Reset to default accounts"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {config.parentProfile && config.environment && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedProfile?.color || 'bg-gray-500'}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedProfile?.name || config.parentProfile} - {selectedEnvironment?.name || config.environment} Accounts
                      </span>
                    </div>
                  )}

                  {config.parentProfile && config.environment ? (
                    <div className="space-y-3">
                      {/* Search and settings bar */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            placeholder="Search accounts..."
                            value={accountSearch}
                            onChange={(e) => setAccountSearch(e.target.value)}
                            className="pl-8"
                          />
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowFieldSelector(!showFieldSelector)}
                          title="Select fields to display"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Add Account Form */}
                      {showAddAccount && (
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Account</h4>
                          <AddAccountForm
                            existingFields={(() => {
                              const key = `${config.parentProfile}_${config.environment}`
                              const defaultAccounts = getAccountTemplates(config.parentProfile, config.environment)
                              const userAccounts = customAccounts[key] || []
                              const allAccounts = [...defaultAccounts, ...userAccounts]
                              const allFields = new Set<string>()
                              allAccounts.forEach(account => {
                                Object.keys(account).forEach(key => allFields.add(key))
                              })
                              return Array.from(allFields).sort()
                            })()}
                            onSave={(newAccount) => {
                              const key = `${config.parentProfile}_${config.environment}`
                              const profileAccounts = customAccounts[key] || []
                              setCustomAccounts({
                                ...customAccounts,
                                [key]: [...profileAccounts, newAccount]
                              })
                              setShowAddAccount(false)
                            }}
                            onCancel={() => setShowAddAccount(false)}
                          />
                        </div>
                      )}

                      {(() => {
                        const key = `${config.parentProfile}_${config.environment}`
                        const defaultAccounts = getAccountTemplates(config.parentProfile, config.environment)
                        const hiddenIndices = hiddenDefaultAccounts[key] || new Set()
                        const visibleDefaultAccounts = defaultAccounts.filter((_, index) => !hiddenIndices.has(index))
                        const userAccounts = customAccounts[key] || []
                        const allAccounts = [...visibleDefaultAccounts, ...userAccounts]
                        
                        // Get all unique fields from all accounts
                        const allFields = new Set<string>()
                        allAccounts.forEach(account => {
                          Object.keys(account).forEach(key => allFields.add(key))
                        })
                        const availableFields = Array.from(allFields).sort()
                        
                        // Initialize selected fields if empty
                        if (selectedFields.length === 0 && availableFields.length > 0) {
                          setSelectedFields(availableFields.slice(0, 3))
                        }
                        
                        // Filter accounts based on search
                        const filteredAccounts = allAccounts.filter(account => {
                          if (!accountSearch) return true
                          const searchLower = accountSearch.toLowerCase()
                          return Object.entries(account).some(([key, value]) => {
                            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
                            return valueStr.toLowerCase().includes(searchLower) || key.toLowerCase().includes(searchLower)
                          })
                        })

                        // Limit display unless showing all
                        const INITIAL_DISPLAY_COUNT = 5
                        const displayAccounts = showAllAccounts 
                          ? filteredAccounts 
                          : filteredAccounts.slice(0, INITIAL_DISPLAY_COUNT)
                        
                        return (
                          <>
                            {/* Field selector panel */}
                            {showFieldSelector && (
                              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-gray-900">Select table columns</h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedFields(availableFields)}
                                  >
                                    Select all
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {availableFields.map((field) => {
                                    const formattedField = field
                                      .replace(/([A-Z])/g, ' $1')
                                      .replace(/^./, str => str.toUpperCase())
                                      .trim()
                                    
                                    return (
                                      <label
                                        key={field}
                                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedFields.includes(field)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedFields([...selectedFields, field])
                                            } else {
                                              setSelectedFields(selectedFields.filter(f => f !== field))
                                            }
                                          }}
                                          className="rounded border-gray-300"
                                        />
                                        <span>{formattedField}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                                {selectedFields.length === 0 && (
                                  <p className="text-xs text-gray-500 italic">Select at least one field to display</p>
                                )}
                              </div>
                            )}

                            {/* Table view */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                      <th className="w-10 px-3 py-2"></th>
                                      {(selectedFields.length > 0 ? selectedFields : availableFields.slice(0, 5)).map(field => {
                                        const formattedField = field
                                          .replace(/([A-Z])/g, ' $1')
                                          .replace(/^./, str => str.toUpperCase())
                                          .trim()
                                        return (
                                          <th key={field} className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                            {formattedField}
                                          </th>
                                        )
                                      })}
                                      <th className="w-10 px-3 py-2"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {displayAccounts.map((account, index) => {
                                      const isSelected = config.selectedAccounts?.some(
                                        (a) => JSON.stringify(a) === JSON.stringify(account)
                                      )
                                      const fieldsToShow = selectedFields.length > 0 ? selectedFields : availableFields.slice(0, 5)
                                      const isCustomAccount = index >= visibleDefaultAccounts.length
                                      
                                      return (
                                        <tr
                                          key={index}
                                          className={`group transition-colors ${
                                            isSelected
                                              ? "bg-blue-50 hover:bg-blue-100"
                                              : "hover:bg-gray-50"
                                          }`}
                                        >
                                          <td 
                                            className="px-3 py-2 cursor-pointer"
                                            onClick={() => {
                                              if (isSelected) {
                                                // Deselect account and remove account fields from startCallParams
                                                setConfig({
                                                  ...config,
                                                  selectedAccounts: [],
                                                })
                                              } else {
                                                // Select account and merge its fields into customerDetailsAO
                                                const updatedStartCallParams = { ...config.startCallParams }
                                                
                                                // Ensure customerDetailsAO exists
                                                if (!updatedStartCallParams.customerDetailsAO) {
                                                  updatedStartCallParams.customerDetailsAO = {}
                                                }
                                                
                                                // Replace entire customerDetailsAO with account object
                                                updatedStartCallParams.customerDetailsAO = { ...account }
                                                
                                                setConfig({
                                                  ...config,
                                                  selectedAccounts: [account],
                                                  startCallParams: updatedStartCallParams
                                                })
                                                
                                                // Update JSON view
                                                setJsonText(JSON.stringify(updatedStartCallParams, null, 2))
                                              }
                                            }}
                                          >
                                            {isSelected && (
                                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                              </div>
                                            )}
                                          </td>
                                          {fieldsToShow.map(field => (
                                            <td 
                                              key={field} 
                                              className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap cursor-pointer"
                                              onClick={() => {
                                                if (isSelected) {
                                                  // Deselect account and remove account fields from startCallParams
                                                  setConfig({
                                                    ...config,
                                                    selectedAccounts: [],
                                                  })
                                                } else {
                                                  // Select account and merge its fields into customerDetailsAO
                                                  const updatedStartCallParams = { ...config.startCallParams }
                                                  
                                                  // Ensure customerDetailsAO exists
                                                  if (!updatedStartCallParams.customerDetailsAO) {
                                                    updatedStartCallParams.customerDetailsAO = {}
                                                  }
                                                  
                                                  // Replace entire customerDetailsAO with account object
                                                  updatedStartCallParams.customerDetailsAO = { ...account }
                                                  
                                                  setConfig({
                                                    ...config,
                                                    selectedAccounts: [account],
                                                    startCallParams: updatedStartCallParams
                                                  })
                                                  
                                                  // Update JSON view
                                                  setJsonText(JSON.stringify(updatedStartCallParams, null, 2))
                                                }
                                              }}
                                            >
                                              {account[field] !== undefined ? (
                                                typeof account[field] === 'object' 
                                                  ? JSON.stringify(account[field]) 
                                                  : String(account[field])
                                              ) : (
                                                <span className="text-gray-400">-</span>
                                              )}
                                            </td>
                                          ))}
                                          <td className="px-3 py-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                
                                                if (isCustomAccount) {
                                                  // Remove custom account
                                                  const accountIndex = index - visibleDefaultAccounts.length
                                                  const profileAccounts = customAccounts[key] || []
                                                  const newAccounts = profileAccounts.filter((_, i) => i !== accountIndex)
                                                  setCustomAccounts({
                                                    ...customAccounts,
                                                    [key]: newAccounts
                                                  })
                                                } else {
                                                  // Hide default account
                                                  const defaultIndex = defaultAccounts.findIndex(
                                                    (acc) => JSON.stringify(acc) === JSON.stringify(account)
                                                  )
                                                  if (defaultIndex !== -1) {
                                                    const hiddenSet = new Set(hiddenDefaultAccounts[key] || [])
                                                    hiddenSet.add(defaultIndex)
                                                    setHiddenDefaultAccounts({
                                                      ...hiddenDefaultAccounts,
                                                      [key]: hiddenSet
                                                    })
                                                  }
                                                }
                                                
                                                // Also deselect if this account was selected
                                                if (isSelected) {
                                                  setConfig({
                                                    ...config,
                                                    selectedAccounts: []
                                                  })
                                                }
                                              }}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                                              title={isCustomAccount ? "Delete account" : "Remove account"}
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Show more/less button */}
                            {filteredAccounts.length > INITIAL_DISPLAY_COUNT && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllAccounts(!showAllAccounts)}
                                className="w-full"
                              >
                                {showAllAccounts 
                                  ? `Show less` 
                                  : `Show all ${filteredAccounts.length} accounts`}
                              </Button>
                            )}

                            {/* No results message */}
                            {filteredAccounts.length === 0 && (
                              <div className="text-center py-4 text-gray-500">
                                No accounts found matching "{accountSearch}"
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-gray-200 rounded-lg bg-gray-50">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        Please select both Parent Profile and Environment first
                      </p>
                    </div>
                  )}

                  {config.selectedAccounts && config.selectedAccounts.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Account selected
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveDefaultAccount}
                          onChange={(e) => setSaveDefaultAccount(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Set as default account for {selectedProfile?.name} - {selectedEnvironment?.name}</span>
                      </label>
                    </div>
                  )}
                  
                  {(!config.selectedAccounts || config.selectedAccounts.length === 0) && config.parentProfile && config.environment && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        Please select an account to continue
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Login Button */}
            <div className="flex justify-end pt-6 mt-6 border-t">
              <Button 
                onClick={handleLogin} 
                disabled={!isFormValid()} 
                className="px-6"
                title={!config.selectedAccounts || config.selectedAccounts.length === 0 ? "Please select an account" : ""}
              >
                Start Testing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
