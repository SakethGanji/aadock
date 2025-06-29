import React from 'react'
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Switch } from "../../ui/switch"
import { Checkbox } from "../../ui/checkbox"
import { CreditCard, Eye, EyeOff, Trash2, Code } from "lucide-react"
import type { LoginState, LoginAction } from './login-reducer'

interface AuthenticationTabProps {
  state: LoginState
  dispatch: React.Dispatch<LoginAction>
}

export const AuthenticationTab = React.memo(function AuthenticationTab({ state, dispatch }: AuthenticationTabProps) {
  const { config, showPassword, useIframe, useWebsocket, saveCredentials } = state
  const selectedProfile = state.config.parentProfile
  const selectedEnvironment = state.config.environment

  const handleResetCredentials = () => {
    if (config.environment) {
      localStorage.removeItem(`aa-credentials-${config.environment}`)
      dispatch({ type: 'SET_CREDENTIALS', payload: { username: "", password: "" } })
      dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: false } })
    }
  }

  const handleIframeToggle = (checked: boolean) => {
    dispatch({ type: 'SET_UI_STATE', payload: { field: 'useIframe', value: checked } })
    if (!checked) {
      dispatch({ type: 'SET_FIELD', payload: { field: 'localhostIframeUrl', value: "" } })
    }
  }

  const handleWebsocketToggle = (checked: boolean) => {
    dispatch({ type: 'SET_UI_STATE', payload: { field: 'useWebsocket', value: checked } })
    if (!checked) {
      dispatch({ type: 'SET_FIELD', payload: { field: 'localhostWebsocketUrl', value: "" } })
    }
  }

  return (
    <div className="space-y-6">
      {/* Selected Account Display */}
      {config.selectedAccounts && config.selectedAccounts.length > 0 && selectedProfile && selectedEnvironment && (
        <div className="border border-primary/20 rounded-lg overflow-hidden">
          <div className="bg-primary/10 px-4 py-2 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-primary-foreground dark:text-primary">
                  Selected Account
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'activeTab', value: 'accounts' } })}
                className="text-primary hover:text-primary/80 text-xs"
              >
                Change Account
              </Button>
            </div>
          </div>
          <div className="bg-card p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(config.selectedAccounts[0]).slice(0, 6).map(([key, value]) => {
                const formattedKey = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim()
                
                return (
                  <div key={key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{formattedKey}</p>
                    <p className="text-sm font-medium text-foreground truncate" title={String(value)}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value) || '-'}
                    </p>
                  </div>
                )
              })}
            </div>
            {Object.keys(config.selectedAccounts[0]).length > 6 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                +{Object.keys(config.selectedAccounts[0]).length - 6} more fields
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Authentication Section */}
      <div className="border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                className="pr-10"
                value={config.password}
                onChange={(e) =>
                  dispatch({ type: 'SET_FIELD', payload: { field: 'password', value: e.target.value } })
                }
              />
              <button
                type="button"
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showPassword', value: !showPassword } })}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={saveCredentials}
                onCheckedChange={(checked: boolean) => 
                  dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveCredentials', value: checked } })
                }
              />
              <span className="text-sm text-foreground/80">Save credentials for this environment</span>
            </label>
            {saveCredentials && config.environment && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCredentials}
                className="text-destructive hover:text-destructive/80"
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
            <Code className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-base font-medium text-foreground">Developer Mode</h3>
          </div>
          <Switch
            checked={config.devMode}
            onCheckedChange={(checked) =>
              dispatch({ type: 'SET_FIELD', payload: { field: 'devMode', value: checked } })
            }
          />
        </div>
        
        {config.devMode && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Dev mode enables localhost connections for testing. Select one or both connection methods.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Connection Methods</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={useIframe}
                      onCheckedChange={handleIframeToggle}
                    />
                    <span className="text-sm">Enable Iframe Connection</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={useWebsocket}
                      onCheckedChange={handleWebsocketToggle}
                    />
                    <span className="text-sm">Enable WebSocket Connection</span>
                  </label>
                </div>
                {!useIframe && !useWebsocket && (
                  <p className="text-xs text-destructive">Please select at least one connection method</p>
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
                        dispatch({ type: 'SET_FIELD', payload: { field: 'localhostIframeUrl', value: e.target.value } })
                      }
                    />
                    <p className="text-xs text-muted-foreground">URL for iframe-based agent assist</p>
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
                        dispatch({ type: 'SET_FIELD', payload: { field: 'localhostWebsocketUrl', value: e.target.value } })
                      }
                    />
                    <p className="text-xs text-muted-foreground">WebSocket endpoint for direct communication</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})