"use client"


import { useState, useRef, useCallback, useEffect } from "react"
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Send,
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
  Edit3,
  List,
  PlayCircle,
  Pause,
  RotateCcw as Reset,
  Users,
  RefreshCw,
} from "lucide-react"
import type { LoginConfig, ParentProfile } from "../../types/auth"
import { 
  CONVERSATIONS, 
  getUtterancesByIntent, 
  getMainIntents,
  type Utterance,
} from "@/data/message-templates"
import { getAccountTemplates } from "../../data/account-templates"
import type { AccountTemplate } from "../../types/auth"

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
  { name: "320 × 568", width: 320, height: 568 },
  { name: "768 × 1024", width: 768, height: 1024 },
  { name: "1366 × 768", width: 1366, height: 768 },
]

const DEFAULT_PAYLOADS = {
  SWITCH_ACCOUNT: {
    accountId: "ACC123456",
    accountNumber: "ACC123456",
    accountName: "John Doe",
    accountType: "Premium",
    previousAccountId: "ACC123455",
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
  const [iframeSize, setIframeSize] = useState({ width: 1366, height: 768 })
  const [selectedEvent, setSelectedEvent] = useState<string>("START_CALL")
  const [eventPayload, setEventPayload] = useState<string>(JSON.stringify(config.startCallParams, null, 2))
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [callActive, setCallActive] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [messageFlow, setMessageFlow] = useState<MessageFlowState>({
    userMessage: "",
    agentMessage: ""
  })
  const [activeTab, setActiveTab] = useState("actions")
  const [messageMode, setMessageMode] = useState<"freeform" | "utterances" | "conversations">("freeform")
  const [selectedMainIntent, setSelectedMainIntent] = useState<string>("all")
  const [selectedConversation, setSelectedConversation] = useState<string>("")
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string>("")
  const [availableAccounts, setAvailableAccounts] = useState<AccountTemplate[]>([])
  const [conversationState, setConversationState] = useState<{
    isPlaying: boolean
    currentIndex: number
    delay: number
  }>({
    isPlaying: false,
    currentIndex: 0,
    delay: 2000
  })

  const iframeRef = useRef<HTMLIFrameElement>(null)

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
    } else if (event === "SWITCH_ACCOUNT") {
      setEventPayload(
        JSON.stringify(
          {
            ...DEFAULT_PAYLOADS.SWITCH_ACCOUNT,
            // Use actual account data if available
            ...(config.selectedAccounts && config.selectedAccounts.length > 0 ? {
              accountId: config.selectedAccounts[0].accountId || "ACC123456",
              accountName: config.selectedAccounts[0].accountName || "John Doe",
            } : {})
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

  // Load accounts based on profile and environment
  useEffect(() => {
    const accounts = getAccountTemplates(config.parentProfile, config.environment)
    setAvailableAccounts(accounts)
  }, [config.parentProfile, config.environment])

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // Observer for class changes on html element
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])

  // Auto-start call if profile setting is enabled
  useEffect(() => {
    if (profile.defaultBehaviors.autoStartCall) {
      setTimeout(() => {
        handleEventChange("START_CALL")
        setTimeout(handleSendEvent, 500)
      }, 1000)
    }
  }, [])

  // Conversation playback logic
  useEffect(() => {
    if (!conversationState.isPlaying || !selectedConversation) return

    const conversation = CONVERSATIONS.find(c => c.id === selectedConversation)
    if (!conversation) return

    const currentMessage = conversation.messages[conversationState.currentIndex]
    if (!currentMessage) {
      setConversationState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }))
      return
    }

    const delay = currentMessage.delay || conversation.defaultDelay

    const timer = setTimeout(() => {
      sendMessage(
        currentMessage.type === 'customer' ? 'CUSTOMER_MESSAGE' : 'AGENT_MESSAGE',
        { message: currentMessage.text }
      )

      if (conversationState.currentIndex < conversation.messages.length - 1) {
        setConversationState(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1
        }))
      } else {
        setConversationState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }))
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [conversationState, selectedConversation, sendMessage])

  const startConversation = () => {
    const conversation = CONVERSATIONS.find(c => c.id === selectedConversation)
    if (!conversation) return

    setConversationState({
      isPlaying: true,
      currentIndex: 0,
      delay: conversation.defaultDelay
    })
  }

  const stopConversation = () => {
    setConversationState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }))
  }

  const sendUtterance = (utterance: Utterance) => {
    sendMessage(
      utterance.type === 'customer' ? 'CUSTOMER_MESSAGE' : 'AGENT_MESSAGE',
      { message: utterance.text }
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Compact Status Bar */}
      <div className="bg-background border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">{config.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">{profile.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
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
      <div className="flex-1 flex flex-col sm:flex-row gap-4 p-4 overflow-auto">
        {/* Left Panel - Controls (minimal width) */}
        <div className="w-full sm:w-[370px] flex-shrink-0 flex flex-col min-h-[400px] sm:min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4 gap-1 flex-shrink-0">
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

            <TabsContent value="actions" className="flex-1 mt-4 overflow-hidden">
              <Card className="h-full flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2 overflow-hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      handleEventChange("START_CALL")
                      setTimeout(handleSendEvent, 100)
                    }}
                  >
                    <Play className="w-3 h-3 mr-1.5" />
                    Start Call
                  </Button>
                  
                  <div className="flex gap-2">
                    <Select
                      value={selectedAccountNumber}
                      onValueChange={setSelectedAccountNumber}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAccounts.length > 0 ? (
                          availableAccounts.map((account, idx) => (
                            <SelectItem 
                              key={idx} 
                              value={account.accountNumber}
                            >
                              <div className="flex items-center gap-2">
                                <span>{account.accountNumber}</span>
                                {account.lineOfBusiness && (
                                  <span className="text-xs text-muted-foreground">
                                    ({account.lineOfBusiness})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="ACC123456">ACC123456 (Default)</SelectItem>
                            <SelectItem value="ACC789012">ACC789012 (Premium)</SelectItem>
                            <SelectItem value="ACC345678">ACC345678 (Business)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2"
                      disabled={!selectedAccountNumber}
                      onClick={() => {
                        if (!selectedAccountNumber) return
                        
                        const selectedAccount = availableAccounts.find(
                          acc => acc.accountNumber === selectedAccountNumber
                        )
                        
                        const payload = {
                          ...DEFAULT_PAYLOADS.SWITCH_ACCOUNT,
                          accountId: selectedAccount?.accountNumber || selectedAccountNumber,
                          accountName: selectedAccount?.lineOfBusiness || "Account",
                          accountType: selectedAccount?.productType || "Standard",
                          accountNumber: selectedAccountNumber,
                          previousAccountId: config.selectedAccounts?.[0]?.accountNumber || "ACC000",
                        }
                        
                        setEventPayload(JSON.stringify(payload, null, 2))
                        setSelectedEvent("SWITCH_ACCOUNT")
                        setTimeout(handleSendEvent, 100)
                      }}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Switch
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      handleEventChange("END_CALL")
                      setTimeout(handleSendEvent, 100)
                    }}
                  >
                    <Square className="w-3 h-3 mr-1.5" />
                    End Call
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="flex-1 mt-4 overflow-hidden">
              <Card className="h-full flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Message Flow</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={messageMode === "freeform" ? "default" : "outline"}
                        onClick={() => setMessageMode("freeform")}
                        className="h-7 px-1.5 text-xs"
                        title="Freeform"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span className="hidden sm:inline ml-1">Free</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={messageMode === "utterances" ? "default" : "outline"}
                        onClick={() => setMessageMode("utterances")}
                        className="h-7 px-1.5 text-xs"
                        title="Utterances"
                      >
                        <List className="w-3 h-3" />
                        <span className="hidden sm:inline ml-1">Utter</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={messageMode === "conversations" ? "default" : "outline"}
                        onClick={() => setMessageMode("conversations")}
                        className="h-7 px-1.5 text-xs"
                        title="Conversations"
                      >
                        <PlayCircle className="w-3 h-3" />
                        <span className="hidden sm:inline ml-1">Conv</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  {messageMode === "freeform" && (
                    <div className="flex flex-col gap-3 h-full">
                      <div className="flex-1 flex flex-col">
                        <label className="text-xs font-medium mb-2">Customer Message</label>
                        <Textarea
                          value={messageFlow.userMessage}
                          onChange={(e) => setMessageFlow({ ...messageFlow, userMessage: e.target.value })}
                          placeholder="Type customer message..."
                          className="h-24 text-sm resize-none"
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
                          className="h-24 text-sm resize-none"
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
                  )}

                  {messageMode === "utterances" && (
                    <div className="h-full flex flex-col gap-3 overflow-hidden">
                      <Tabs defaultValue="customer" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="customer" className="text-xs">Customer</TabsTrigger>
                          <TabsTrigger value="agent" className="text-xs">Agent</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="customer" className="flex-1 overflow-hidden mt-2">
                          <div className="h-full flex flex-col gap-2 overflow-hidden">
                            <Select
                              value={selectedMainIntent}
                              onValueChange={setSelectedMainIntent}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="All Intents" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Intents</SelectItem>
                                {getMainIntents('customer').map(intent => (
                                  <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                              {getUtterancesByIntent('customer', selectedMainIntent === 'all' ? undefined : selectedMainIntent || undefined).map(utterance => (
                                <Button
                                  key={utterance.id}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-left h-auto py-2 px-3"
                                  onClick={() => sendUtterance(utterance)}
                                >
                                  <div className="flex-1">
                                    <div className="text-xs font-medium">{utterance.text}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {utterance.mainIntent} {utterance.subIntent && `› ${utterance.subIntent}`}
                                    </div>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="agent" className="flex-1 overflow-hidden mt-2">
                          <div className="h-full flex flex-col gap-2 overflow-hidden">
                            <Select
                              value={selectedMainIntent}
                              onValueChange={setSelectedMainIntent}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="All Intents" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Intents</SelectItem>
                                {getMainIntents('agent').map(intent => (
                                  <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                              {getUtterancesByIntent('agent', selectedMainIntent === 'all' ? undefined : selectedMainIntent || undefined).map(utterance => (
                                <Button
                                  key={utterance.id}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-left h-auto py-2 px-3"
                                  onClick={() => sendUtterance(utterance)}
                                >
                                  <div className="flex-1">
                                    <div className="text-xs font-medium">{utterance.text}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {utterance.mainIntent} {utterance.subIntent && `› ${utterance.subIntent}`}
                                    </div>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {messageMode === "conversations" && (
                    <div className="h-full flex flex-col gap-3 overflow-hidden">
                      <Select
                        value={selectedConversation}
                        onValueChange={setSelectedConversation}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select a conversation" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONVERSATIONS.map(conv => (
                            <SelectItem key={conv.id} value={conv.id}>
                              <div>
                                <div className="font-medium">{conv.name}</div>
                                <div className="text-xs text-muted-foreground">{conv.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedConversation && (
                        <>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={conversationState.isPlaying ? "outline" : "default"}
                              onClick={conversationState.isPlaying ? stopConversation : startConversation}
                              className="flex-1"
                            >
                              {conversationState.isPlaying ? (
                                <>
                                  <Pause className="w-3 h-3 mr-2" />
                                  Stop
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="w-3 h-3 mr-2" />
                                  Play Conversation
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConversationState(prev => ({ ...prev, currentIndex: 0 }))}
                              disabled={conversationState.isPlaying}
                            >
                              <Reset className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="flex-1 overflow-y-auto pr-2">
                            <div className="space-y-2">
                              {CONVERSATIONS.find(c => c.id === selectedConversation)?.messages.map((msg, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg text-xs ${
                                    msg.type === 'customer' 
                                      ? 'bg-secondary text-secondary-foreground' 
                                      : 'bg-primary/10 text-primary-foreground'
                                  } ${
                                    conversationState.isPlaying && conversationState.currentIndex === idx
                                      ? 'ring-2 ring-primary'
                                      : ''
                                  }`}
                                >
                                  <div className="font-medium mb-1">
                                    {msg.type === 'customer' ? 'Customer' : 'Agent'}
                                  </div>
                                  <div>{msg.text}</div>
                                  {msg.delay && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Delay: {msg.delay / 1000}s
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {conversationState.isPlaying && (
                            <div className="text-xs text-center text-muted-foreground">
                              Playing message {conversationState.currentIndex + 1} of{' '}
                              {CONVERSATIONS.find(c => c.id === selectedConversation)?.messages.length}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="flex-1 mt-4 overflow-hidden">
              <Card className="h-full flex flex-col overflow-hidden">
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
                      <SelectItem value="SWITCH_ACCOUNT">SWITCH_ACCOUNT</SelectItem>
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
                    <div className="flex-1 overflow-hidden rounded-md border">
                      <CodeMirror
                        value={eventPayload}
                        onChange={(value) => setEventPayload(value)}
                        theme={isDarkMode ? oneDark : undefined}
                        extensions={[json()]}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: true,
                          dropCursor: false,
                          allowMultipleSelections: false,
                          indentOnInput: true,
                          bracketMatching: true,
                          closeBrackets: true,
                          autocompletion: true,
                          rectangularSelection: false,
                          highlightSelectionMatches: false,
                          searchKeymap: false,
                        }}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSendEvent} size="sm" className="w-full">
                    <Send className="w-3 h-3 mr-2" />
                    Send Event
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="flex-1 mt-4 overflow-hidden">
              <Card className="h-full flex flex-col overflow-hidden">
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
                      <p className="text-muted-foreground text-center py-8 text-sm">No messages logged yet</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log, index) => (
                          <div key={index} className="p-2 bg-muted rounded text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={log.type === "sent" ? "default" : "secondary"} className="text-xs h-5">
                                {log.type}
                              </Badge>
                              <span className="font-medium">{log.event}</span>
                              <span className="text-muted-foreground ml-auto">{log.timestamp}</span>
                            </div>
                            <div className="mt-1 rounded border overflow-hidden">
                              <CodeMirror
                                value={JSON.stringify(log.payload, null, 2)}
                                theme={isDarkMode ? oneDark : undefined}
                                extensions={[json()]}
                                editable={false}
                                basicSetup={{
                                  lineNumbers: false,
                                  foldGutter: false,
                                  dropCursor: false,
                                  allowMultipleSelections: false,
                                  indentOnInput: false,
                                  bracketMatching: true,
                                  closeBrackets: false,
                                  autocompletion: false,
                                  rectangularSelection: false,
                                  highlightSelectionMatches: false,
                                  searchKeymap: false,
                                }}
                                className="text-xs"
                              />
                            </div>
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
        <div className="w-full sm:flex-1 flex flex-col min-h-[500px] sm:min-h-0 sm:max-h-[calc(100vh-8rem)]">
          <Card className="flex-1 flex flex-col h-full">
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
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_SIZES.map((preset) => (
                      <SelectItem key={preset.name} value={`${preset.width}x${preset.height}`}>
                        <span className="text-xs">{preset.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={reloadIframe}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-4 relative">
              <div className="flex items-center justify-center min-w-full min-h-full">
                <div
                  className="border-2 border-border rounded-lg overflow-hidden bg-card shadow-lg"
                  style={{ width: iframeSize.width, height: iframeSize.height }}
                >
                  <iframe
                    ref={iframeRef}
                    src="/mock-child-app.html"
                    className="w-full h-full border-0"
                    title="Agent Assist"
                  />
                </div>
              </div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                {iframeSize.width} × {iframeSize.height}px
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
