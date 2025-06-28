"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  Play,
  Square,
  Phone,
  LogOut,
  User,
  Globe,
  Copy,
  RotateCcw,
} from "lucide-react"
import type { LoginConfig, ParentProfile } from "../types/auth"

interface LogEntry {
  timestamp: string
  type: "sent" | "received"
  event: string
  payload: any
}

const PRESET_SIZES = [
  { name: "Mobile", width: 320, height: 568 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Default", width: 400, height: 650 },
  { name: "Large", width: 600, height: 800 },
]

const DEFAULT_PAYLOADS = {
  SEND_TOKEN: {
    token: "your_auth_token_here",
    expiresIn: 3600,
    refreshToken: "refresh_token_here",
  },
  END_CALL: {
    callId: "call_123456",
    duration: 300,
    reason: "user_ended",
  },
}

interface AgentAssistTesterProps {
  config: LoginConfig
  profile: ParentProfile
  onLogout: () => void
}

export default function AgentAssistTester({ config, profile, onLogout }: AgentAssistTesterProps) {
  const [iframeSize, setIframeSize] = useState({ width: 400, height: 650 })
  const [isResizing, setIsResizing] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string>("START_CALL")
  const [eventPayload, setEventPayload] = useState<string>(JSON.stringify(config.startCallParams, null, 2))
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLogExpanded, setIsLogExpanded] = useState(false)
  const [callActive, setCallActive] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  const addLog = useCallback((type: "sent" | "received", event: string, payload: any) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      event,
      payload,
    }
    setLogs((prev) => [...prev, logEntry])
  }, [])

  const sendMessage = useCallback(
    (event: string, payload: any) => {
      if (iframeRef.current?.contentWindow) {
        const message = { type: event, ...payload }
        iframeRef.current.contentWindow.postMessage(message, "*")
        addLog("sent", event, payload)
      }
    },
    [addLog],
  )

  const handleSendEvent = () => {
    try {
      const payload = JSON.parse(eventPayload)
      sendMessage(selectedEvent, payload)

      // Update call state based on event
      if (selectedEvent === "START_CALL") {
        setCallActive(true)
      } else if (selectedEvent === "END_CALL") {
        setCallActive(false)
      }
    } catch (error) {
      alert("Invalid JSON payload")
    }
  }

  const handleEventChange = (event: string) => {
    setSelectedEvent(event)
    if (event === "START_CALL") {
      setEventPayload(JSON.stringify(config.startCallParams, null, 2))
    } else if (event === "SEND_TOKEN") {
      setEventPayload(
        JSON.stringify(
          {
            ...DEFAULT_PAYLOADS.SEND_TOKEN,
            token: profile.defaultBehaviors.defaultToken,
          },
          null,
          2,
        ),
      )
    } else {
      setEventPayload(
        JSON.stringify(
          {
            ...DEFAULT_PAYLOADS[event as keyof typeof DEFAULT_PAYLOADS],
            callId: config.startCallParams.callId,
          },
          null,
          2,
        ),
      )
    }
  }

  const copyPayload = () => {
    navigator.clipboard.writeText(eventPayload)
  }

  const resetPayload = () => {
    handleEventChange(selectedEvent)
  }

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
      setCallActive(false)
      addLog("sent", "IFRAME_RELOAD", {})
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: iframeSize.width,
      height: iframeSize.height,
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const deltaX = e.clientX - startPosRef.current.x
      const deltaY = e.clientY - startPosRef.current.y

      setIframeSize({
        width: Math.max(200, startPosRef.current.width + deltaX),
        height: Math.max(300, startPosRef.current.height + deltaY),
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only log messages from the iframe
      if (event.source === iframeRef.current?.contentWindow) {
        addLog("received", event.data.type || "MESSAGE", event.data)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [addLog])

  // Auto-start call if profile setting is enabled
  useEffect(() => {
    if (profile.defaultBehaviors.autoStartCall) {
      setTimeout(() => {
        handleEventChange("START_CALL")
        setTimeout(handleSendEvent, 500)
      }, 1000)
    }
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600">{config.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${profile.color}`} />
              <span className="text-gray-600">{profile.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600 capitalize">{config.environment}</span>
            </div>
          </div>
          <Badge variant={callActive ? "default" : "secondary"} className="flex items-center gap-1">
            {callActive ? <Phone className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            {callActive ? "Call Active" : "Call Inactive"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${profile.color}`} />
                  {profile.name} Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Auto Start:</span>
                  <span>{profile.defaultBehaviors.autoStartCall ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token Refresh:</span>
                  <span>{profile.defaultBehaviors.tokenRefreshInterval / 1000}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="truncate ml-2">{config.startCallParams.customerName || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Event Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Event Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedEvent} onValueChange={handleEventChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="START_CALL">START_CALL</SelectItem>
                    <SelectItem value="SEND_TOKEN">SEND_TOKEN</SelectItem>
                    <SelectItem value="END_CALL">END_CALL</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Payload (JSON)</label>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={copyPayload}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={resetPayload}>
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={eventPayload}
                    onChange={(e) => setEventPayload(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Enter JSON payload..."
                  />
                </div>

                <Button onClick={handleSendEvent} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Event
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => {
                    handleEventChange("START_CALL")
                    setTimeout(handleSendEvent, 100)
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Call
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => {
                    handleEventChange("END_CALL")
                    setTimeout(handleSendEvent, 100)
                  }}
                >
                  <Square className="w-4 h-4 mr-2" />
                  End Call
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Iframe Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Agent Assist Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select
                      value={`${iframeSize.width}x${iframeSize.height}`}
                      onValueChange={(value) => {
                        const preset = PRESET_SIZES.find((p) => `${p.width}x${p.height}` === value)
                        if (preset) {
                          setIframeSize({ width: preset.width, height: preset.height })
                        }
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_SIZES.map((preset) => (
                          <SelectItem key={preset.name} value={`${preset.width}x${preset.height}`}>
                            <div className="flex items-center gap-2">
                              {preset.name === "Mobile" && <Smartphone className="w-4 h-4" />}
                              {preset.name === "Tablet" && <Tablet className="w-4 h-4" />}
                              {(preset.name === "Default" || preset.name === "Large") && (
                                <Monitor className="w-4 h-4" />
                              )}
                              {preset.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={reloadIframe}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div
                    className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg"
                    style={{ width: iframeSize.width, height: iframeSize.height }}
                  >
                    <iframe
                      ref={iframeRef}
                      src="/placeholder.svg?height=650&width=400&text=Agent+Assist+App"
                      className="w-full h-full border-0"
                      title="Agent Assist"
                    />

                    {/* Resize Handle */}
                    <div
                      ref={resizeRef}
                      className="absolute bottom-0 right-0 w-4 h-4 bg-gray-400 cursor-se-resize hover:bg-gray-500 transition-colors"
                      onMouseDown={handleMouseDown}
                    >
                      <Maximize2 className="w-3 h-3 text-white m-0.5" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center text-sm text-gray-600">
                  Size: {iframeSize.width} × {iframeSize.height}px
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Log Console */}
        <Card>
          <CardHeader>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsLogExpanded(!isLogExpanded)}
            >
              <CardTitle className="flex items-center gap-2">
                Message Log ({logs.length})
                {isLogExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setLogs([])
                }}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          {isLogExpanded && (
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No messages logged yet</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Badge variant={log.type === "sent" ? "default" : "secondary"}>{log.type}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{log.event}</span>
                          <span className="text-xs text-gray-500">{log.timestamp}</span>
                        </div>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
