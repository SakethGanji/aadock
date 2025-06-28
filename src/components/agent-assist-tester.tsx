"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Send,
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  Play,
  Square,
  Phone,
  User,
  Globe,
  Copy,
  RotateCcw,
  Terminal,
  Zap,
  MessageSquare,
  FileText,
} from "lucide-react"
import type { LoginConfig, ParentProfile } from "../../types/auth"

interface LogEntry {
  timestamp: string
  type: "sent" | "received"
  event: string
  payload: any
}

interface MessageFlowState {
  userMessage: string
  agentMessage: string
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

export default function AgentAssistTester({ config, profile, onLogout: _onLogout }: AgentAssistTesterProps) {
  const [iframeSize, setIframeSize] = useState({ width: 400, height: 650 })
  const [isResizing, setIsResizing] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string>("START_CALL")
  const [eventPayload, setEventPayload] = useState<string>(JSON.stringify(config.startCallParams, null, 2))
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [callActive, setCallActive] = useState(false)
  const [messageFlow, setMessageFlow] = useState<MessageFlowState>({
    userMessage: "",
    agentMessage: ""
  })
  const [activeTab, setActiveTab] = useState("actions")

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
    <div className="h-screen flex flex-col">
      {/* Compact Status Bar */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline">{config.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${profile.color}`} />
              <span className="hidden sm:inline">{profile.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline capitalize">{config.environment}</span>
            </div>
          </div>
          <Badge variant={callActive ? "default" : "secondary"} className="text-xs p-1 sm:px-2 sm:py-1">
            {callActive ? (
              <Phone className="w-3 h-3 sm:mr-1" />
            ) : (
              <Square className="w-3 h-3 sm:mr-1" />
            )}
            <span className="hidden sm:inline">{callActive ? "Call Active" : "Call Inactive"}</span>
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col sm:flex-row gap-4 p-4 overflow-auto sm:overflow-hidden">
        {/* Left Panel - Controls (minimal width) */}
        <div className="w-full sm:w-[370px] flex-shrink-0 flex flex-col min-h-[400px] sm:min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 gap-1">
              <TabsTrigger value="actions" className="text-xs flex items-center justify-center gap-1 px-2">
                <Zap className="w-3 h-3" />
                <span className="hidden sm:inline">Actions</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="text-xs flex items-center justify-center gap-1 px-2">
                <MessageSquare className="w-3 h-3" />
                <span className="hidden sm:inline">Messages</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs flex items-center justify-center gap-1 px-2">
                <Terminal className="w-3 h-3" />
                <span className="hidden sm:inline">Events</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs flex items-center justify-center gap-1 px-2">
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">Logs ({logs.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="flex-1 mt-4">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
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
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleEventChange("SEND_TOKEN")
                      setTimeout(handleSendEvent, 100)
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Token
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleEventChange("END_CALL")
                      setTimeout(handleSendEvent, 100)
                    }}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    End Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={reloadIframe}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Iframe
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="flex-1 mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Message Flow</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex-1 flex flex-col">
                      <label className="text-xs font-medium mb-2">Customer Message</label>
                      <Textarea
                        value={messageFlow.userMessage}
                        onChange={(e) => setMessageFlow({ ...messageFlow, userMessage: e.target.value })}
                        placeholder="Type customer message..."
                        className="h-32 text-sm resize-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => {
                          if (messageFlow.userMessage) {
                            sendMessage("CUSTOMER_MESSAGE", { message: messageFlow.userMessage })
                            setMessageFlow({ ...messageFlow, userMessage: "" })
                          }
                        }}
                      >
                        <Send className="w-3 h-3 mr-2" />
                        Send as Customer
                      </Button>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <label className="text-xs font-medium mb-2">Agent Message</label>
                      <Textarea
                        value={messageFlow.agentMessage}
                        onChange={(e) => setMessageFlow({ ...messageFlow, agentMessage: e.target.value })}
                        placeholder="Type agent message..."
                        className="h-32 text-sm resize-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => {
                          if (messageFlow.agentMessage) {
                            sendMessage("AGENT_MESSAGE", { message: messageFlow.agentMessage })
                            setMessageFlow({ ...messageFlow, agentMessage: "" })
                          }
                        }}
                      >
                        <Send className="w-3 h-3 mr-2" />
                        Send as Agent
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="flex-1 mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Event Controls</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <Select value={selectedEvent} onValueChange={handleEventChange}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="START_CALL">START_CALL</SelectItem>
                      <SelectItem value="SEND_TOKEN">SEND_TOKEN</SelectItem>
                      <SelectItem value="END_CALL">END_CALL</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium">Payload (JSON)</label>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copyPayload}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={resetPayload}>
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={eventPayload}
                      onChange={(e) => setEventPayload(e.target.value)}
                      className="flex-1 font-mono text-xs resize-none"
                      placeholder="Enter JSON payload..."
                    />
                  </div>

                  <Button onClick={handleSendEvent} size="sm" className="w-full">
                    <Send className="w-3 h-3 mr-2" />
                    Send Event
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="flex-1 mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-sm">WebSocket Log</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setLogs([])}
                  >
                    Clear
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto px-4 pb-4">
                    {logs.length === 0 ? (
                      <p className="text-gray-500 text-center py-8 text-sm">No messages logged yet</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={log.type === "sent" ? "default" : "secondary"} className="text-xs h-5">
                                {log.type}
                              </Badge>
                              <span className="font-medium">{log.event}</span>
                              <span className="text-gray-500 ml-auto">{log.timestamp}</span>
                            </div>
                            <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-x-auto">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Agent Assist Preview (fills remaining space) */}
        <div className="w-full sm:flex-1 flex flex-col min-h-[500px] sm:min-h-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">Agent Assist</CardTitle>
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
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_SIZES.map((preset) => (
                      <SelectItem key={preset.name} value={`${preset.width}x${preset.height}`}>
                        <div className="flex items-center gap-2">
                          {preset.name === "Mobile" && <Smartphone className="w-3 h-3" />}
                          {preset.name === "Tablet" && <Tablet className="w-3 h-3" />}
                          {(preset.name === "Default" || preset.name === "Large") && (
                            <Monitor className="w-3 h-3" />
                          )}
                          <span className="text-xs">{preset.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={reloadIframe}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-4">
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
                <div
                  ref={resizeRef}
                  className="absolute bottom-0 right-0 w-4 h-4 bg-gray-400 cursor-se-resize hover:bg-gray-500 transition-colors"
                  onMouseDown={handleMouseDown}
                >
                  <Maximize2 className="w-3 h-3 text-white m-0.5" />
                </div>
              </div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                {iframeSize.width} × {iframeSize.height}px
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
