import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Lock, Globe, Eye, EyeOff, Copy, RotateCcw, FileText, Settings, Zap } from "lucide-react"
import type { LoginConfig, ParentProfile, Environment } from "src/../types/auth"
import { CALL_TEMPLATES } from "@/../data/call-templates"

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
  const [selectedTemplate, setSelectedTemplate] = useState("basic")
  const [config, setConfig] = useState<LoginConfig>({
    username: "",
    password: "",
    parentProfile: "",
    environment: "",
    startCallParams: CALL_TEMPLATES[0].params,
  })

  const selectedProfile = PARENT_PROFILES.find((p) => p.id === config.parentProfile)
  const selectedEnvironment = ENVIRONMENTS.find((e) => e.id === config.environment)
  const currentTemplate = CALL_TEMPLATES.find((t) => t.id === selectedTemplate)

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = CALL_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setConfig({
        ...config,
        startCallParams: {
          ...template.params,
          callId: `call_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  const handleParamsChange = (value: string) => {
    try {
      const parsed = JSON.parse(value)
      setConfig({
        ...config,
        startCallParams: parsed,
      })
    } catch (error) {
      // Invalid JSON, don't update
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config.startCallParams, null, 2))
  }

  const resetParams = () => {
    if (currentTemplate) {
      setConfig({
        ...config,
        startCallParams: {
          ...currentTemplate.params,
          callId: `call_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  const handleLogin = () => {
    onLogin(config)
  }

  const isFormValid = () => {
    return config.username && config.password && config.parentProfile && config.environment && config.startCallParams
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Agent Assist Tester</CardTitle>
            <p className="text-gray-600">Configure your testing environment</p>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="config" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="parameters" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Call Parameters
                </TabsTrigger>
              </TabsList>

              {/* Configuration Tab */}
              <TabsContent value="config" className="space-y-6">
                {/* Authentication Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Authentication
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          className="pl-10"
                          value={config.username}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              username: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
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
                          className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Profile
                  </h3>
                  <div className="space-y-2">
                    <Label>Parent Profile</Label>
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
                              <div className={`w-3 h-3 rounded-full ${profile.color}`} />
                              {profile.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Environment Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Environment
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
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
                    </div>
                    {selectedEnvironment && (
                      <a
                        href={selectedEnvironment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {selectedEnvironment.url}
                      </a>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Parameters Tab */}
              <TabsContent value="parameters" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Call Parameter Template</Label>
                      <p className="text-sm text-gray-600">Choose a template or customize the JSON below</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetParams}>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </div>

                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{template.name}</span>
                            <span className="text-xs text-gray-500">{template.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentTemplate && (
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                      <strong>{currentTemplate.name}:</strong> {currentTemplate.description}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>START_CALL Parameters (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(config.startCallParams, null, 2)}
                      onChange={(e) => handleParamsChange(e.target.value)}
                      rows={15}
                      className="font-mono text-sm"
                      placeholder="Enter JSON parameters..."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Login Button */}
            <div className="flex justify-end pt-6 border-t">
              <Button onClick={handleLogin} disabled={!isFormValid()} className="flex items-center gap-2 px-8">
                <Zap className="w-4 h-4" />
                Start Testing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
