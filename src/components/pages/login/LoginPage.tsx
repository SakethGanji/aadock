import { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Button } from "../../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Label } from "../../ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import { Settings, FileText, CreditCard } from "lucide-react"
import type { LoginConfig } from '../../../../types/auth'
import { useLoginConfig } from './useLoginConfig'
import { AuthenticationTab } from './AuthenticationTab'
import { ParametersTab } from './ParametersTab'
import { AccountsTab } from './AccountsTab'
import { PARENT_PROFILES, ENVIRONMENTS } from './login-constants'

interface LoginPageProps {
  onLogin: (config: LoginConfig) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [state, dispatch] = useLoginConfig()
  const { config, activeTab, saveCredentials, saveDefaultAccount, useIframe, useWebsocket } = state
  
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <Card className="shadow-lg border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-900">Configure your testing environment</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Parent Profile & Environment Selection - Top Level */}
            <div className="pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              {config.parentProfile && config.environment && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedProfile?.color || 'bg-gray-500'}`} />
                    {selectedProfile?.name} - {selectedEnvironment?.name}
                  </div>
                </div>
              )}
            </div>

            <Tabs 
              value={activeTab} 
              onValueChange={(value) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'activeTab', value } })} 
              className="space-y-6"
            >
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

              <TabsContent value="config">
                <AuthenticationTab state={state} dispatch={dispatch} />
              </TabsContent>
              
              <TabsContent value="parameters">
                <ParametersTab state={state} dispatch={dispatch} />
              </TabsContent>
              
              <TabsContent value="accounts">
                <AccountsTab state={state} dispatch={dispatch} />
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