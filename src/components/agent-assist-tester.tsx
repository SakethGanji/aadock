"use client"


import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
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
  ChevronDown,
  Upload,
  Trash2,
} from "lucide-react"
import type { LoginConfig, ParentProfile } from "../../types/auth"
import { 
  CONVERSATIONS, 
  getUtterancesByIntent, 
  getMainIntents,
  type Utterance,
  type Conversation,
} from "@/data/message-templates"
import { ConversationUpload } from "./ConversationUpload"
import { getAccountTemplates } from "../../data/account-templates"
import type { AccountTemplate } from "../../types/auth"
import { buildAgentAssistUrl } from "../services/iframeUrlBuilder"
import { EventFlowManager } from "../services/eventFlowManager"
import { ENVIRONMENTS } from "./pages/login/login-constants"

interface LogEntry {
  timestamp: string
  type: "sent" | "received"
  event: string
  payload: any
  requestType?: string
  websocketEvent?: any
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
  const [iframeSize, setIframeSize] = useState({ width: 320, height: 568 })
  const [selectedEvent, setSelectedEvent] = useState<string>("START_CALL")
  const [eventPayload, setEventPayload] = useState<string>(JSON.stringify(config.startCallParams, null, 2))
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [websocketLogs, setWebsocketLogs] = useState<LogEntry[]>([])
  const [callActive, setCallActive] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
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
  const [customerDetailsEdited, setCustomerDetailsEdited] = useState(false)
  const [conversationState, setConversationState] = useState<{
    isPlaying: boolean
    currentIndex: number
    delay: number
  }>({
    isPlaying: false,
    currentIndex: 0,
    delay: 2000
  })
  const [customConversations, setCustomConversations] = useState<Conversation[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [flowManager, setFlowManager] = useState<EventFlowManager | null>(null)
  
  // Get all conversations (built-in + custom)
  const allConversations = useMemo(() => {
    return [...CONVERSATIONS, ...customConversations]
  }, [customConversations])

  // Add custom conversation handler
  const handleAddCustomConversation = useCallback((conversation: Conversation) => {
    setCustomConversations(prev => [...prev, conversation])
    setShowUploadDialog(false)
  }, [])

  // Remove custom conversation handler
  const handleRemoveCustomConversation = useCallback((conversationId: string) => {
    setCustomConversations(prev => prev.filter(c => c.id !== conversationId))
    if (selectedConversation === conversationId) {
      setSelectedConversation("")
    }
  }, [selectedConversation])
  
  // Check if customerDetailsAO has been manually edited
  const checkCustomerDetailsEdited = useCallback(() => {
    if (!config.selectedAccounts || config.selectedAccounts.length === 0) return false
    
    const selectedAccount = config.selectedAccounts[0]
    const customerDetails = config.startCallParams?.customerDetailsAO || {}
    
    // Check if customerDetailsAO differs from selected account
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
  }, [config.selectedAccounts, config.startCallParams])
  
  // Build iframe URL with query params
  const iframeSrc = useMemo(() => {
    const environment = ENVIRONMENTS.find(e => e.id === config.environment)
    if (!environment || !config.token) return '/mock-child-app.html'
    
    // For local development, always use mock child app with query params
    if (environment.id === 'local' || environment.url.includes('example.com')) {
      const params = new URLSearchParams({
        appName: 'aadesktop',
        cat1: config.token,
        desktopview: config.parentProfile.toLowerCase()
      });
      return `/mock-child-app.html?${params.toString()}`
    }
    
    return buildAgentAssistUrl(environment, config.token, config.parentProfile)
  }, [config])

  const addLog = useCallback((
    type: "sent" | "received", 
    event: string, 
    payload: any,
    requestType?: string,
    websocketEvent?: any
  ) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type,
      event,
      payload,
      requestType,
      websocketEvent
    }
    setLogs((prev) => [...prev, logEntry])
  }, [])

  const sendMessage = useCallback(
    (event: string, payload: any, requestType?: string, websocketEvent?: any) => {
      if (iframeRef.current?.contentWindow) {
        const message = { type: event, ...payload }
        iframeRef.current.contentWindow.postMessage(message, "*")
        addLog("sent", event, payload, requestType, websocketEvent)
      }
    },
    [addLog],
  )

  const handleSendEvent = () => {
    try {
      const payload = JSON.parse(eventPayload)
      
      if (selectedEvent === "START_CALL") {
        if (flowManager) {
          // Start the LOB-specific flow - flowManager handles all messaging
          flowManager.startCall(payload)
          setCallActive(true)
          // Don't send any START_CALL message - flowManager handles the flow
        } else {
          // No flow manager, send START_CALL directly (shouldn't happen)
          sendMessage(selectedEvent, payload)
          setCallActive(true)
        }
      } else if (selectedEvent === "END_CALL") {
        if (flowManager) {
          flowManager.endCall() // This will dispatch callStatusChanged event
        } else {
          setCallActive(false)
        }
        sendMessage(selectedEvent, payload)
      } else {
        // Other events sent directly
        sendMessage(selectedEvent, payload)
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
      iframeRef.current.src = iframeSrc
      setCallActive(false)
      addLog("sent", "IFRAME_RELOAD", {})
      
      // Re-initialize flow manager after reload
      if (flowManager) {
        flowManager.endCall()
      }
    }
  }


  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if this is from our iframe or mock-child-app
      if (event.source === iframeRef.current?.contentWindow || 
          (event.origin === window.location.origin && event.data.eventName)) {
        
        // Special handling for WebsocketRequestLog events - don't add to regular logs
        if (event.data.eventName === "WebsocketRequestLog") {
          console.log('[Parent] Processing WebsocketRequestLog:', event.data);
          // Add only to WebSocket logs with proper timestamp
          const wsLogEntry: LogEntry = {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            type: "received",
            event: "WebsocketRequestLog", 
            payload: event.data,
            requestType: event.data.requestType,
            websocketEvent: event.data.eventObject
          }
          setWebsocketLogs((prev) => {
            console.log('[Parent] WebSocket logs count:', prev.length + 1);
            return [...prev, wsLogEntry];
          })
        } else if (event.source === iframeRef.current?.contentWindow) {
          // Regular post message logging for non-WebSocket events only from iframe
          const eventName = event.data.type || event.data.eventName || "MESSAGE"
          addLog("received", eventName, event.data)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [addLog])

  // Listen for call status changes from EventFlowManager
  useEffect(() => {
    const handleCallStatusChange = (event: CustomEvent) => {
      setCallActive(event.detail.active)
    }

    window.addEventListener("callStatusChanged", handleCallStatusChange as EventListener)
    return () => window.removeEventListener("callStatusChanged", handleCallStatusChange as EventListener)
  }, [])
  
  // Initialize flow manager after iframe loads
  useEffect(() => {
    // Only create flow manager if we don't already have one
    if (iframeRef.current && config.token && !flowManager) {
      const manager = new EventFlowManager(
        config.parentProfile,
        iframeRef,
        config.token
      )
      
      // Initialize with auto-start based on config or profile default
      const autoStartEnabled = config.autoStartCall !== undefined 
        ? config.autoStartCall 
        : profile.defaultBehaviors.autoStartCall;
        
      manager.initialize(
        config.startCallParams,
        autoStartEnabled
      )
      
      setFlowManager(manager)
      
      // Flow manager already logs sent messages internally
      
      // Cleanup function
      return () => {
        manager.endCall()
        setFlowManager(null)
      }
    }
  }, [config.token, config.parentProfile]) // Only re-create when token or profile changes

  // Update flow manager when startCallParams changes
  useEffect(() => {
    if (flowManager && config.startCallParams) {
      flowManager.updateStartCallParams(config.startCallParams)
      console.log('[AgentAssistTester] Updated flow manager with new startCallParams')
    }
  }, [config.startCallParams, flowManager])

  // Update event payload when startCallParams changes and START_CALL is selected
  useEffect(() => {
    if (selectedEvent === "START_CALL" && config.startCallParams) {
      setEventPayload(JSON.stringify(config.startCallParams, null, 2))
    }
  }, [config.startCallParams, selectedEvent])

  // Track if customerDetailsAO has been edited
  useEffect(() => {
    const isEdited = checkCustomerDetailsEdited()
    setCustomerDetailsEdited(isEdited)
  }, [config.startCallParams, checkCustomerDetailsEdited])

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

  // Remove auto-start logic from here - it's handled by EventFlowManager
  // The EventFlowManager's initialize method already handles auto-start based on config

  // Conversation playback logic
  useEffect(() => {
    if (!conversationState.isPlaying || !selectedConversation) return

    const conversation = allConversations.find(c => c.id === selectedConversation)
    if (!conversation) return

    const currentMessage = conversation.messages[conversationState.currentIndex]
    if (!currentMessage) {
      setConversationState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }))
      return
    }

    const delay = currentMessage.delay || conversation.defaultDelay

    const timer = setTimeout(() => {
      if (currentMessage.type === 'customer') {
        sendMessage('CUSTOMER_MESSAGE', { message: currentMessage.text })
      } else {
        // Agent messages use AGENT_TRANSCRIPT format
        const timestamp = new Date().toLocaleTimeString()
        const timestampValue = Date.now()
        const messageId = crypto.randomUUID()
        
        const transcriptMessage = {
          eventName: 'AGENT_TRANSCRIPT',
          data: {
            agentId: config.startCallParams.agentDetailsA0?.soeId || 'SOE12345',
            customerId: '9430874843110687',
            chatSessionId: '123',
            timestamp: timestamp,
            timestampValue: timestampValue,
            from: 'user',
            msg: currentMessage.text,
            type: 'user',
            isFromSocket: false,
            messageId: messageId,
          }
        }
        
        // Send directly to iframe
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(transcriptMessage, '*')
          addLog("sent", "AGENT_TRANSCRIPT", transcriptMessage)
        }
      }

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
  }, [conversationState, selectedConversation, sendMessage, allConversations, config.startCallParams, addLog])

  const startConversation = () => {
    const conversation = allConversations.find(c => c.id === selectedConversation)
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
    if (utterance.type === 'customer') {
      sendMessage('CUSTOMER_MESSAGE', { message: utterance.text })
    } else {
      // Agent utterances use AGENT_TRANSCRIPT format
      const timestamp = new Date().toLocaleTimeString()
      const timestampValue = Date.now()
      const messageId = crypto.randomUUID()
      
      const transcriptMessage = {
        eventName: 'AGENT_TRANSCRIPT',
        data: {
          agentId: config.startCallParams.agentDetailsA0?.soeId || 'SOE12345',
          customerId: '9430874843110687',
          chatSessionId: '123',
          timestamp: timestamp,
          timestampValue: timestampValue,
          from: 'user',
          msg: utterance.text,
          type: 'user',
          isFromSocket: false,
          messageId: messageId,
        }
      }
      
      // Send directly to iframe
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(transcriptMessage, '*')
        addLog("sent", "AGENT_TRANSCRIPT", transcriptMessage)
      }
    }
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
      <div className="flex-1 p-4 overflow-hidden">
        {/* Desktop Layout - Side by side with resizable */}
        <div className="hidden md:block h-full">
          <ResizablePanelGroup 
            direction="horizontal" 
            className="h-full rounded-lg"
          >
            {/* Left Panel - Controls */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="p-3 pb-0">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full h-9 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actions">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>Quick Actions</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="messages">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Message Flow</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="events">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        <span>Event Controls</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="logs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>WebSocket Logs ({websocketLogs.length})</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">

              <TabsContent value="actions" className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                      {/* Call Control Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>Call Control</span>
                        </div>
                        
                        <div className="space-y-2">
                          <Button
                            variant={callActive ? "secondary" : "default"}
                            size="sm"
                            className="w-full justify-start"
                            disabled={config.autoStartCall !== undefined ? config.autoStartCall : profile.defaultBehaviors.autoStartCall}
                            onClick={() => {
                              handleEventChange("START_CALL")
                              setTimeout(handleSendEvent, 100)
                            }}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {(config.autoStartCall !== undefined ? config.autoStartCall : profile.defaultBehaviors.autoStartCall) ? 'Auto-Start Enabled' : 'Start Call'}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            disabled={!callActive}
                            onClick={() => {
                              handleEventChange("END_CALL")
                              setTimeout(handleSendEvent, 100)
                            }}
                          >
                            <Square className="w-4 h-4 mr-2" />
                            End Call
                          </Button>
                        </div>
                      </div>

                      <div className="border-t pt-4" />

                      {/* Account Management Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>Account Management</span>
                        </div>
                        
                        <div className="space-y-2">
                          <Select
                            value={selectedAccountNumber}
                            onValueChange={setSelectedAccountNumber}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Select account to switch" />
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
                            className="w-full"
                            disabled={!selectedAccountNumber || !callActive}
                            onClick={() => {
                              if (!selectedAccountNumber) return
                              
                              const selectedAccount = availableAccounts.find(
                                acc => acc.accountNumber === selectedAccountNumber
                              )
                              
                              if (!selectedAccount) return
                              
                              // Check if customerDetailsAO has been manually edited
                              const isEdited = checkCustomerDetailsEdited()
                              
                              if (isEdited) {
                                const proceed = window.confirm(
                                  "Warning: customerDetailsAO has been manually edited and will be overwritten with the selected account details.\n\n" +
                                  "Do you want to proceed with switching accounts?"
                                )
                                if (!proceed) return
                              }
                              
                              // Create the SWITCH_ACCOUNT payload
                              const switchPayload = {
                                ...DEFAULT_PAYLOADS.SWITCH_ACCOUNT,
                                accountId: selectedAccount.accountNumber,
                                accountName: selectedAccount.lineOfBusiness || "Account",
                                accountType: selectedAccount.productType || "Standard",
                                accountNumber: selectedAccount.accountNumber,
                                previousAccountId: config.selectedAccounts?.[0]?.accountNumber || "ACC000",
                              }
                              
                              // Update customerDetailsAO in the current start call params
                              const updatedStartCallParams = {
                                ...config.startCallParams,
                                customerDetailsAO: {
                                  accountHolderRole: selectedAccount.accountHolderRole,
                                  accountNumber: selectedAccount.accountNumber,
                                  customerNumber: selectedAccount.customerNumber,
                                  ccid: selectedAccount.ccid,
                                  lineOfBusiness: selectedAccount.lineOfBusiness,
                                  productType: selectedAccount.productType,
                                  ...(selectedAccount.nivrCallerId && { nivrCallerId: selectedAccount.nivrCallerId })
                                }
                              }
                              
                              // Update flow manager with new customerDetailsAO
                              if (flowManager) {
                                flowManager.updateStartCallParams(updatedStartCallParams)
                              }
                              
                              // Reset the edited flag since we're syncing with the account
                              setCustomerDetailsEdited(false)
                              
                              setEventPayload(JSON.stringify(switchPayload, null, 2))
                              setSelectedEvent("SWITCH_ACCOUNT")
                              setTimeout(handleSendEvent, 100)
                            }}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Switch Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="messages" className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="p-4 space-y-4">
                    {/* Message Mode Selector */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span>Message Type</span>
                      </div>
                      
                      <Select value={messageMode} onValueChange={(value: any) => setMessageMode(value)}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Select message type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freeform">
                            <div className="flex items-center gap-2">
                              <Edit3 className="w-4 h-4" />
                              <span>Freeform Messages</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="utterances">
                            <div className="flex items-center gap-2">
                              <List className="w-4 h-4" />
                              <span>Utterance Templates</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="conversations">
                            <div className="flex items-center gap-2">
                              <PlayCircle className="w-4 h-4" />
                              <span>Conversation Flows</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border-t pt-4" />
                  </div>
                  
                  <div className="flex-1 overflow-hidden px-4 pb-4">
                  {messageMode === "freeform" && (
                    <div className="flex flex-col gap-4 h-full">
                      {/* Customer Message Section */}
                      <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <label className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                            Customer Message
                          </label>
                        </div>
                        <Textarea
                          value={messageFlow.userMessage}
                          onChange={(e) => setMessageFlow({ ...messageFlow, userMessage: e.target.value })}
                          placeholder="Type customer message..."
                          className="h-20 text-sm resize-none border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 placeholder:text-blue-400 dark:placeholder:text-blue-500"
                        />
                        <Button
                          size="sm"
                          className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={!messageFlow.userMessage.trim()}
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

                      {/* Agent Message Section */}
                      <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <label className="text-sm font-semibold text-green-900 dark:text-green-100 uppercase tracking-wide">
                            Agent Message
                          </label>
                        </div>
                        <Textarea
                          value={messageFlow.agentMessage}
                          onChange={(e) => setMessageFlow({ ...messageFlow, agentMessage: e.target.value })}
                          placeholder="Type agent message..."
                          className="h-20 text-sm resize-none border-green-200 dark:border-green-700 bg-white dark:bg-green-900/20 text-green-900 dark:text-green-100 placeholder:text-green-400 dark:placeholder:text-green-500"
                        />
                        <Button
                          size="sm"
                          className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
                          disabled={!messageFlow.agentMessage.trim()}
                          onClick={() => {
                            if (messageFlow.agentMessage) {
                              // Send AGENT_TRANSCRIPT format
                              const timestamp = new Date().toLocaleTimeString()
                              const timestampValue = Date.now()
                              const messageId = crypto.randomUUID()
                              
                              const transcriptMessage = {
                                eventName: 'AGENT_TRANSCRIPT',
                                data: {
                                  agentId: config.startCallParams.agentDetailsA0?.soeId || 'SOE12345',
                                  customerId: '9430874843110687',
                                  chatSessionId: '123',
                                  timestamp: timestamp,
                                  timestampValue: timestampValue,
                                  from: 'user',
                                  msg: messageFlow.agentMessage,
                                  type: 'user',
                                  isFromSocket: false,
                                  messageId: messageId,
                                }
                              }
                              
                              // Send directly to iframe, not through sendMessage
                              if (iframeRef.current?.contentWindow) {
                                iframeRef.current.contentWindow.postMessage(transcriptMessage, '*')
                                addLog("sent", "AGENT_TRANSCRIPT", transcriptMessage)
                              }
                              
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
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                              {getUtterancesByIntent('customer', selectedMainIntent === 'all' ? undefined : selectedMainIntent || undefined).map(utterance => (
                                <div
                                  key={utterance.id}
                                  className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  onClick={() => sendUtterance(utterance)}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100 leading-relaxed">
                                        {utterance.text}
                                      </div>
                                      <div className="text-xs text-blue-600 dark:text-blue-300 mt-1 flex items-center gap-1">
                                        <span className="font-medium">{utterance.mainIntent}</span>
                                        {utterance.subIntent && (
                                          <>
                                            <span className="opacity-60">›</span>
                                            <span>{utterance.subIntent}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
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
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                              {getUtterancesByIntent('agent', selectedMainIntent === 'all' ? undefined : selectedMainIntent || undefined).map(utterance => (
                                <div
                                  key={utterance.id}
                                  className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 rounded-lg p-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                  onClick={() => sendUtterance(utterance)}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-green-900 dark:text-green-100 leading-relaxed">
                                        {utterance.text}
                                      </div>
                                      <div className="text-xs text-green-600 dark:text-green-300 mt-1 flex items-center gap-1">
                                        <span className="font-medium">{utterance.mainIntent}</span>
                                        {utterance.subIntent && (
                                          <>
                                            <span className="opacity-60">›</span>
                                            <span>{utterance.subIntent}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {messageMode === "conversations" && (
                    <div className="h-full flex flex-col gap-2 overflow-hidden">
                      {/* Conversation Selection */}
                      <div className="space-y-2">
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
                            {customConversations.length > 0 && (
                              <>
                                <div className="border-t border-border my-1"></div>
                                {customConversations.map(conv => (
                                  <SelectItem key={conv.id} value={conv.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <div>
                                        <div className="font-medium">{conv.name}</div>
                                        <div className="text-xs text-muted-foreground">{conv.description}</div>
                                      </div>
                                      <Badge variant="outline" className="text-xs ml-2">Custom</Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>

                        {/* Compact Action Buttons */}
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowUploadDialog(!showUploadDialog)}
                            className="h-7 text-xs"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            {showUploadDialog ? 'Hide' : 'Upload'}
                          </Button>
                          {customConversations.length > 0 && selectedConversation && 
                           customConversations.some(c => c.id === selectedConversation) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveCustomConversation(selectedConversation)}
                              className="h-7 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          ) : (
                            <div></div>
                          )}
                        </div>
                      </div>

                      {/* Collapsible Upload Section */}
                      {showUploadDialog && (
                        <div className="border border-border rounded p-2 bg-muted/20 max-h-48 overflow-y-auto">
                          <ConversationUpload
                            onConversationAdded={handleAddCustomConversation}
                            existingConversations={allConversations}
                          />
                        </div>
                      )}

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
                              {allConversations.find(c => c.id === selectedConversation)?.messages.map((msg, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg text-sm border transition-all duration-200 ${
                                    msg.type === 'customer' 
                                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100' 
                                      : 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                                  } ${
                                    conversationState.isPlaying && conversationState.currentIndex === idx
                                      ? 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]'
                                      : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      msg.type === 'customer' ? 'bg-blue-500' : 'bg-green-500'
                                    }`} />
                                    <div className="font-semibold text-xs uppercase tracking-wide">
                                      {msg.type === 'customer' ? 'Customer' : 'Agent'}
                                    </div>
                                    {msg.delay && (
                                      <div className="text-xs opacity-60 ml-auto">
                                        {msg.delay / 1000}s delay
                                      </div>
                                    )}
                                  </div>
                                  <div className="leading-relaxed">{msg.text}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {conversationState.isPlaying && (
                            <div className="text-xs text-center text-muted-foreground">
                              Playing message {conversationState.currentIndex + 1} of{' '}
                              {allConversations.find(c => c.id === selectedConversation)?.messages.length}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="events" className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                      {/* Event Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Terminal className="w-4 h-4" />
                          <span>Event Type</span>
                        </div>
                        
                        <Select value={selectedEvent} onValueChange={handleEventChange}>
                          <SelectTrigger className="w-full h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="START_CALL">START_CALL</SelectItem>
                            <SelectItem value="SWITCH_ACCOUNT">SWITCH_ACCOUNT</SelectItem>
                            <SelectItem value="END_CALL">END_CALL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="border-t pt-4" />

                      {/* Payload Editor */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            <span>Event Payload</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyPayload}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={resetPayload}>
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="h-[300px] overflow-hidden rounded-md border bg-background">
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
                        className="text-xs h-full"
                      />
                    </div>
                    
                    <Button onClick={handleSendEvent} size="sm" className="w-full mt-3">
                      <Send className="w-4 h-4 mr-2" />
                      Send Event
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

              <TabsContent value="logs" className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>WebSocket Logs ({websocketLogs.length})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setWebsocketLogs([])}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden p-4">
                    <div className="h-full overflow-y-auto pr-2">
                    {websocketLogs.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8 text-sm">No WebSocket messages logged yet</p>
                    ) : (
                      <div className="space-y-2">
                        {websocketLogs.map((log, index) => {
                          // Default to expanded unless user has explicitly collapsed
                          const isExpanded = expandedLogs.has(index) ? false : true
                          
                          return (
                            <div key={index} className="border rounded-lg bg-card">
                              <div 
                                className="p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  const newExpanded = new Set(expandedLogs)
                                  if (isExpanded) {
                                    // Add to set means collapsed
                                    newExpanded.add(index)
                                  } else {
                                    // Remove from set means expanded
                                    newExpanded.delete(index)
                                  }
                                  setExpandedLogs(newExpanded)
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <ChevronDown 
                                      className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
                                    />
                                    <Badge 
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 ${
                                        log.requestType === "sent" 
                                          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800" 
                                          : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800"
                                      }`}
                                    >
                                      {log.requestType === "sent" ? "SENT" : "RECV"}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-mono">{log.timestamp}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(JSON.stringify(log.websocketEvent || log.payload, null, 2))
                                    }}
                                    title="Copy log"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="px-2 pb-2">
                                  <div className="rounded border overflow-hidden bg-muted/30">
                                    <CodeMirror
                                      value={JSON.stringify(log.websocketEvent || log.payload, null, 2)}
                                      theme={isDarkMode ? oneDark : undefined}
                                      extensions={[json()]}
                                      editable={false}
                                      basicSetup={{
                                        lineNumbers: false,
                                        foldGutter: true,
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
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </TabsContent>
              </Tabs>
            </Card>
          </ResizablePanel>

          {/* Resize Handle */}
          <ResizableHandle withHandle />

          {/* Right Panel - Agent Assist Preview */}
          <ResizablePanel defaultSize={70}>
            <Card className="h-full flex flex-col">
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
                  <SelectTrigger className="w-32 h-8 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800">
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
                    src={iframeSrc}
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout - Stacked vertically */}
      <div className="md:hidden h-full overflow-y-auto space-y-4">
        {/* Left Panel - Controls */}
        <Card className="flex flex-col">
          <div className="p-3 pb-0">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-9 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actions">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Quick Actions</span>
                  </div>
                </SelectItem>
                <SelectItem value="messages">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Message Flow</span>
                  </div>
                </SelectItem>
                <SelectItem value="events">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    <span>Event Controls</span>
                  </div>
                </SelectItem>
                <SelectItem value="logs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>WebSocket Logs ({websocketLogs.length})</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-h-[400px]">
            {activeTab === 'actions' && (
              <div className="p-3">
                <div className="pb-3">
                  <h3 className="text-sm font-semibold">Quick Actions</h3>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    disabled={config.autoStartCall !== undefined ? config.autoStartCall : profile.defaultBehaviors.autoStartCall}
                    onClick={() => {
                      handleEventChange("START_CALL")
                      setTimeout(handleSendEvent, 100)
                    }}
                  >
                    <Play className="w-3 h-3 mr-1.5" />
                    {(config.autoStartCall !== undefined ? config.autoStartCall : profile.defaultBehaviors.autoStartCall) ? 'Auto-Start Enabled' : 'Start Call'}
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
                </div>
              </div>
            )}
            
            {/* Use same content as desktop for consistency */}
            {activeTab === 'messages' && (
              <div className="p-4 h-full overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsContent value="messages" className="mt-0">
                    {/* Reuse the desktop message content */}
                    <div className="space-y-4">
                      <Select value={messageMode} onValueChange={(value: any) => setMessageMode(value)}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Select message type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freeform">
                            <div className="flex items-center gap-2">
                              <Edit3 className="w-4 h-4" />
                              <span>Freeform Messages</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="utterances">
                            <div className="flex items-center gap-2">
                              <List className="w-4 h-4" />
                              <span>Utterance Templates</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="conversations">
                            <div className="flex items-center gap-2">
                              <PlayCircle className="w-4 h-4" />
                              <span>Conversation Flows</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            
            {activeTab === 'events' && (
              <div className="p-4 h-full overflow-y-auto">
                <div className="space-y-4">
                  <Select value={selectedEvent} onValueChange={handleEventChange}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="START_CALL">START_CALL</SelectItem>
                      <SelectItem value="SWITCH_ACCOUNT">SWITCH_ACCOUNT</SelectItem>
                      <SelectItem value="END_CALL">END_CALL</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="h-[200px] overflow-hidden rounded-md border bg-background">
                    <pre className="text-xs p-3 overflow-auto h-full">
                      <code>{eventPayload}</code>
                    </pre>
                  </div>
                  
                  <Button onClick={handleSendEvent} size="sm" className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Event
                  </Button>
                </div>
              </div>
            )}
            
            {activeTab === 'logs' && (
              <div className="p-3">
                <div className="pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">WebSocket Log</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setWebsocketLogs([])}
                  >
                    Clear
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {websocketLogs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8 text-sm">No WebSocket messages logged yet</p>
                  ) : (
                    <div className="space-y-2">
                      {websocketLogs.map((log, index) => (
                        <div key={index} className="p-2 bg-muted rounded text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline"
                              className={`text-xs h-5 ${
                                log.requestType === "sent" 
                                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800" 
                                  : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800"
                              }`}
                            >
                              {log.requestType === "sent" ? "Sent" : "Received"}
                            </Badge>
                            <span className="text-muted-foreground ml-auto flex items-center gap-2">
                              {log.timestamp}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(log.websocketEvent || log.payload, null, 2))
                                }}
                                title="Copy log"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </span>
                          </div>
                          <div className="mt-1 rounded border overflow-hidden bg-background">
                            <pre className="text-xs p-2 overflow-x-auto">
                              {JSON.stringify(log.websocketEvent || log.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Agent Assist Preview - Below on mobile */}
        <Card className="flex flex-col">
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
                <SelectTrigger className="w-32 h-8 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-800">
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
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <div
                className="border-2 border-border rounded-lg overflow-hidden bg-card shadow-lg"
                style={{ width: '100%', maxWidth: iframeSize.width, height: iframeSize.height }}
              >
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  className="w-full h-full border-0"
                  title="Agent Assist"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
