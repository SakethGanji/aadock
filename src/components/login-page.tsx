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
import { User, Lock, Globe, Eye, EyeOff, Copy, RotateCcw, FileText, Settings, Zap, Code, CreditCard, Check, Search, ChevronDown, ChevronRight, Plus, X, Edit2 } from "lucide-react"
import type { LoginConfig, ParentProfile, Environment, AccountTemplate } from "src/../types/auth"
import { CALL_TEMPLATES } from "@/../data/call-templates"
import { ACCOUNT_TEMPLATES } from "@/../data/account-templates"

// Dynamic form component that can render any nested JSON structure
interface DynamicFormProps {
  data: any
  onChange: (newData: any) => void
  path: string[]
  level?: number
}

function DynamicForm({ data, onChange, path, level = 0 }: DynamicFormProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const updateValue = (key: string, value: any) => {
    const newData = { ...data }
    newData[key] = value
    onChange(newData)
  }

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const toggleSection = (key: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key)
    } else {
      newCollapsed.add(key)
    }
    setCollapsedSections(newCollapsed)
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null
  }

  // Group fields by type
  const primitiveFields: [string, any][] = []
  const objectFields: [string, any][] = []
  const arrayFields: [string, any][] = []

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      arrayFields.push([key, value])
    } else if (typeof value === 'object' && value !== null) {
      objectFields.push([key, value])
    } else {
      primitiveFields.push([key, value])
    }
  })

  return (
    <div className={`space-y-${level === 0 ? '6' : '4'}`}>
      {/* Render primitive fields - one per row */}
      {primitiveFields.length > 0 && (
        <div className="space-y-3">
          {level === 0 && <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>}
          {primitiveFields.map(([key, value]) => {
            const isProtected = key === 'callId' || key === 'timestamp' || key === 'event' || key === 'lob'
            
            return (
              <div key={key} className="flex items-center gap-4">
                <Label htmlFor={`${path.join('.')}.${key}`} className="text-sm font-medium text-gray-700 w-40">
                  {formatKey(key)}
                </Label>
                <div className="flex-1">
                  {typeof value === 'boolean' ? (
                    <Switch
                      id={`${path.join('.')}.${key}`}
                      checked={value}
                      onCheckedChange={(checked) => updateValue(key, checked)}
                      disabled={isProtected}
                    />
                  ) : (
                    <Input
                      id={`${path.join('.')}.${key}`}
                      type={typeof value === 'number' ? 'number' : 'text'}
                      value={value || ''}
                      onChange={(e) => updateValue(key, 
                        typeof value === 'number' ? Number(e.target.value) : e.target.value
                      )}
                      disabled={isProtected}
                      className={isProtected ? 'bg-gray-50' : ''}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Render nested objects */}
      {objectFields.map(([key, value]) => {
        const isCollapsed = collapsedSections.has(key)
        
        return (
          <div key={key} className={`${level > 0 ? 'ml-4' : ''}`}>
            <div className="flex items-center mb-3">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => toggleSection(key)}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <h4 className="text-sm font-medium text-gray-900">{formatKey(key)}</h4>
              </div>
            </div>
            {!isCollapsed && (
              <div className="pl-6 border-l-2 border-gray-100">
                <DynamicForm
                  data={value}
                  onChange={(newValue) => updateValue(key, newValue)}
                  path={[...path, key]}
                  level={level + 1}
                />
              </div>
            )}
          </div>
        )
      })}

      {/* Render arrays */}
      {arrayFields.map(([key, value]) => (
        <div key={key}>
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            {formatKey(key)}
          </Label>
          <div className="p-3 bg-gray-50 rounded-md">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Arrays can be edited in JSON view
          </p>
        </div>
      ))}
    </div>
  )
}

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
  const [selectedTemplate, setSelectedTemplate] = useState("start_call_eclipse")
  const [accountSearch, setAccountSearch] = useState("")
  const [showAllAccounts, setShowAllAccounts] = useState(false)
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [isJsonView, setIsJsonView] = useState(false)
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [customAccounts, setCustomAccounts] = useState<Record<string, AccountTemplate[]>>({})
  const [hiddenDefaultAccounts, setHiddenDefaultAccounts] = useState<Record<string, Set<number>>>({})
  const [useIframe, setUseIframe] = useState(true)
  const [useWebsocket, setUseWebsocket] = useState(false)
  const [config, setConfig] = useState<LoginConfig>({
    username: "",
    password: "",
    parentProfile: "",
    environment: "",
    startCallParams: CALL_TEMPLATES[0].params,
    devMode: false,
    localhostIframeUrl: "http://localhost:3001",
    localhostWebsocketUrl: "ws://localhost:8080",
    selectedAccounts: [],
  })

  const selectedProfile = PARENT_PROFILES.find((p) => p.id === config.parentProfile)
  const selectedEnvironment = ENVIRONMENTS.find((e) => e.id === config.environment)
  const currentTemplate = CALL_TEMPLATES.find((t) => t.id === selectedTemplate)

  // Automatically update call parameters when parent profile changes
  useEffect(() => {
    if (config.parentProfile) {
      const template = CALL_TEMPLATES.find((t) => t.id === `start_call_${config.parentProfile}`)
      if (template) {
        setSelectedTemplate(template.id)
        setConfig(prev => ({
          ...prev,
          startCallParams: {
            ...template.params,
            callId: `call_${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        }))
      }
    }
    // Reset selected fields when changing LOB
    setSelectedFields([])
    setShowFieldSelector(false)
  }, [config.parentProfile])


  const handleParamsChange = (value: string) => {
    try {
      const parsed = JSON.parse(value)
      
      // Validate required fields based on the template
      const requiredFields = ['event', 'callId', 'lob', 'agentId']
      const missingFields = requiredFields.filter(field => !parsed[field])
      
      if (missingFields.length > 0) {
        setJsonError(`Missing required fields: ${missingFields.join(', ')}`)
        return
      }
      
      // Validate event type
      if (parsed.event !== 'START_CALL') {
        setJsonError('Event must be "START_CALL"')
        return
      }
      
      // Validate LOB matches selected profile
      if (config.parentProfile && parsed.lob !== config.parentProfile) {
        setJsonError(`LOB must match selected profile: ${config.parentProfile}`)
        return
      }
      
      setJsonError(null)
      setConfig(prev => ({
        ...prev,
        startCallParams: parsed,
      }))
    } catch (error) {
      if (error instanceof SyntaxError) {
        setJsonError('Invalid JSON syntax')
      } else {
        setJsonError('Error parsing JSON')
      }
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config.startCallParams, null, 2))
  }

  const handleLogin = () => {
    onLogin(config)
  }

  const isFormValid = () => {
    const baseValid = config.username && config.password && config.parentProfile && config.environment && config.startCallParams
    
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

          <CardContent>
            <Tabs defaultValue="config" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configuration
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
                </div>

                {/* Profile & Environment Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-2">
                      <Label className="text-sm">Parent Profile</Label>
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
                  </div>

                  <div>
                    <div className="space-y-2">
                      <Label className="text-sm">Select Environment</Label>
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
                        <p className="text-xs text-gray-500 mt-1">{selectedEnvironment.url}</p>
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
                      <div className="flex items-center gap-2 mr-2">
                        <Button
                          variant={!isJsonView ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setIsJsonView(false)
                            setJsonError(null)
                          }}
                        >
                          Simple
                        </Button>
                        <Button
                          variant={isJsonView ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setIsJsonView(true)
                            setJsonText(JSON.stringify(config.startCallParams, null, 2))
                            setJsonError(null)
                          }}
                        >
                          JSON
                        </Button>
                      </div>
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
                              setConfig(prev => ({
                                ...prev,
                                startCallParams: {
                                  ...template.params,
                                  callId: `call_${Date.now()}`,
                                  timestamp: new Date().toISOString(),
                                },
                              }))
                              setJsonText(JSON.stringify({
                                ...template.params,
                                callId: `call_${Date.now()}`,
                                timestamp: new Date().toISOString(),
                              }, null, 2))
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

                      {isJsonView ? (
                        <div className="space-y-2">
                          <Label className="text-sm">START_CALL Parameters (JSON)</Label>
                          <div className="relative">
                            <Textarea
                              value={jsonText || JSON.stringify(config.startCallParams, null, 2)}
                              onChange={(e) => {
                                setJsonText(e.target.value)
                                handleParamsChange(e.target.value)
                              }}
                              onBlur={() => {
                                // Reset jsonText when losing focus to sync with actual state
                                if (!jsonError) {
                                  setJsonText(JSON.stringify(config.startCallParams, null, 2))
                                }
                              }}
                              rows={12}
                              className={`font-mono text-sm border-gray-200 ${
                                jsonError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'bg-gray-50'
                              }`}
                              placeholder="Enter JSON parameters..."
                            />
                            {jsonError && (
                              <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-xs text-red-600">
                                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                                {jsonError}
                              </div>
                            )}
                          </div>
                          {!jsonError && jsonText && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <Check className="w-3 h-3" />
                              Valid JSON
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 border border-gray-200 rounded-lg">
                            <DynamicForm
                              data={config.startCallParams}
                              onChange={(newData) => setConfig({
                                ...config,
                                startCallParams: newData
                              })}
                              path={[]}
                            />
                          </div>

                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs text-blue-800">
                              Edit field values in the form above. Use JSON view for advanced editing (arrays, adding/removing fields).
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center border border-gray-200 rounded-lg bg-gray-50">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">
                        Please select a LOB in the Configuration tab first
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
                    {config.parentProfile && (
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
                            // Reset accounts for current profile
                            setCustomAccounts({
                              ...customAccounts,
                              [config.parentProfile]: []
                            })
                            const hiddenSet = new Set(hiddenDefaultAccounts[config.parentProfile] || [])
                            hiddenSet.clear()
                            setHiddenDefaultAccounts({
                              ...hiddenDefaultAccounts,
                              [config.parentProfile]: hiddenSet
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

                  {config.parentProfile && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedProfile?.color || 'bg-gray-500'}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedProfile?.name || config.parentProfile} Accounts
                      </span>
                    </div>
                  )}

                  {config.parentProfile ? (
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
                              const defaultAccounts = ACCOUNT_TEMPLATES[config.parentProfile] || []
                              const userAccounts = customAccounts[config.parentProfile] || []
                              const allAccounts = [...defaultAccounts, ...userAccounts]
                              const allFields = new Set<string>()
                              allAccounts.forEach(account => {
                                Object.keys(account).forEach(key => allFields.add(key))
                              })
                              return Array.from(allFields).sort()
                            })()}
                            onSave={(newAccount) => {
                              const profileAccounts = customAccounts[config.parentProfile] || []
                              setCustomAccounts({
                                ...customAccounts,
                                [config.parentProfile]: [...profileAccounts, newAccount]
                              })
                              setShowAddAccount(false)
                            }}
                            onCancel={() => setShowAddAccount(false)}
                          />
                        </div>
                      )}

                      {(() => {
                        const defaultAccounts = ACCOUNT_TEMPLATES[config.parentProfile] || []
                        const hiddenIndices = hiddenDefaultAccounts[config.parentProfile] || new Set()
                        const visibleDefaultAccounts = defaultAccounts.filter((_, index) => !hiddenIndices.has(index))
                        const userAccounts = customAccounts[config.parentProfile] || []
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
                                              const newSelectedAccounts = isSelected
                                                ? []
                                                : [account]
                                              
                                              setConfig({
                                                ...config,
                                                selectedAccounts: newSelectedAccounts,
                                              })
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
                                                const newSelectedAccounts = isSelected
                                                  ? []
                                                  : [account]
                                                
                                                setConfig({
                                                  ...config,
                                                  selectedAccounts: newSelectedAccounts,
                                                })
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
                                                  const profileAccounts = customAccounts[config.parentProfile] || []
                                                  const newAccounts = profileAccounts.filter((_, i) => i !== accountIndex)
                                                  setCustomAccounts({
                                                    ...customAccounts,
                                                    [config.parentProfile]: newAccounts
                                                  })
                                                } else {
                                                  // Hide default account
                                                  const defaultIndex = defaultAccounts.findIndex(
                                                    (acc) => JSON.stringify(acc) === JSON.stringify(account)
                                                  )
                                                  if (defaultIndex !== -1) {
                                                    const hiddenSet = new Set(hiddenDefaultAccounts[config.parentProfile] || [])
                                                    hiddenSet.add(defaultIndex)
                                                    setHiddenDefaultAccounts({
                                                      ...hiddenDefaultAccounts,
                                                      [config.parentProfile]: hiddenSet
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
                        Please select a LOB in the Configuration tab first
                      </p>
                    </div>
                  )}

                  {config.selectedAccounts && config.selectedAccounts.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Account selected
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
