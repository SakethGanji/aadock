import { useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import { Button } from "../../ui/button"
import { Switch } from "../../ui/switch"
import { Label } from "../../ui/label"
import { Input } from "../../ui/input"
import { Settings, RotateCcw, Copy, FileText } from "lucide-react"
import CodeMirror from '@uiw/react-codemirror'
import { defaultCodeMirrorSetup, getCodeMirrorTheme, jsonExtensions } from '../../../config/codemirror'
import { useDarkMode } from '../../../hooks/useDarkMode'
import { useClipboard } from '../../../hooks/useClipboard'
import { validateJsonSyntax } from '../../../lib/utils'
import type { LoginConfig } from '../../../../types/auth'
import type { AutoGenerationConfig, LoginAction } from './login-reducer'
import { CALL_TEMPLATES } from '../../../../data/call-templates'

interface ParametersTabProps {
  config: LoginConfig
  jsonText: string
  jsonError: string | null
  autoGenConfig: AutoGenerationConfig
  onParamsChange: (value: string) => void
  onUpdateJsonText: (value: string) => void
  onReset: () => void
  dispatch: React.Dispatch<LoginAction>
}

export function ParametersTab({
  config,
  jsonText,
  jsonError,
  autoGenConfig,
  onParamsChange,
  onUpdateJsonText,
  onReset,
  dispatch
}: ParametersTabProps) {
  const isDarkMode = useDarkMode()
  const { copyToClipboard, isCopied } = useClipboard()

  const handleCopyToClipboard = () => {
    copyToClipboard(JSON.stringify(config.startCallParams, null, 2))
  }

  const generateUcid = useCallback(() => {
    if (autoGenConfig.customUcidLength > 0) {
      const timestamp = Date.now().toString()
      const paddingLength = Math.max(0, autoGenConfig.customUcidLength - timestamp.length)
      return timestamp + '0'.repeat(paddingLength)
    }
    return `${Date.now()}00000000000`
  }, [autoGenConfig.customUcidLength])

  const generateConvertedUcid = useCallback(() => {
    const prefix = autoGenConfig.customPrefix || config.parentProfile?.toUpperCase() || 'DEFAULT'
    return `${prefix}${Date.now()}`
  }, [autoGenConfig.customPrefix, config.parentProfile])

  const handleAutoGenerate = useCallback(() => {
    dispatch({ type: 'APPLY_AUTO_GENERATION' })
  }, [dispatch])

  const handleEnhancedReset = useCallback(() => {
    onReset() // The reset function in LoginPage already handles auto-generation via the reducer
  }, [onReset])

  return (
    <Card className="border-border shadow-none h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Call Parameters
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard} title="Copy JSON">
              <Copy className="w-4 h-4" />
              {isCopied && <span className="ml-1 text-xs">Copied!</span>}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEnhancedReset}
              title="Reset to default template"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {config.parentProfile ? (
          <div className="space-y-4">
            {/* Profile Template Info */}
            <div className="p-2 bg-muted border border-border rounded text-sm text-foreground">
              {config.parentProfile?.charAt(0).toUpperCase() + config.parentProfile?.slice(1)} START_CALL Template
            </div>

            {/* Account Selection Feedback */}
            {config.selectedAccounts && config.selectedAccounts.length > 0 && (
              <div className="p-2 bg-primary/10 border border-primary/30 rounded text-sm text-primary">
                Account fields copied to customerDetailsAO
              </div>
            )}
            
            {/* JSON Editor */}
            <div className="space-y-2">
              <Label className="text-sm">START_CALL Parameters (JSON)</Label>
              <div>
                <div className={`border rounded-md overflow-hidden ${
                  jsonError ? 'border-destructive' : 'border-border'
                }`}>
                  <CodeMirror
                    value={jsonText || JSON.stringify(config.startCallParams, null, 2)}
                    height="280px"
                    theme={getCodeMirrorTheme(isDarkMode)}
                    extensions={jsonExtensions}
                    onChange={(value) => {
                      onUpdateJsonText(value)
                      const syntaxError = validateJsonSyntax(value)
                      // Note: Error handling is managed by parent component
                    }}
                    placeholder="Enter JSON parameters..."
                    basicSetup={defaultCodeMirrorSetup}
                  />
                </div>
                {jsonError && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                    <span className="inline-block w-2 h-2 bg-destructive rounded-full"></span>
                    {jsonError}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onParamsChange(jsonText)}
                  disabled={(() => {
                    if (!!jsonError || !jsonText) return true
                    try {
                      const parsed = JSON.parse(jsonText)
                      return JSON.stringify(parsed) === JSON.stringify(config.startCallParams)
                    } catch {
                      return true
                    }
                  })()}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm">Select a Parent Profile first</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}