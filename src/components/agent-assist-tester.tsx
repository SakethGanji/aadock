"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { getCodeMirrorTheme } from '../config/codemirror'
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
import type { LoginConfig, ParentProfile, AccountTemplate } from "../../types/auth"
import { 
  CONVERSATIONS, 
  getUtterancesByIntent, 
  getMainIntents,
  type Utterance,
  type Conversation,
} from "@/data/message-templates"
import { ConversationUpload } from "./ConversationUpload"
import { getAccountTemplates } from "../../data/account-templates"
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

interface ConversationState {
  isPlaying: boolean
  currentIndex: number
  delay: number
}

interface AgentAssistTesterProps {
  config: LoginConfig
  profile: ParentProfile
  onLogout: () => void
}

// Constants
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

// Reusable Components
const SectionHeader = ({ icon: Icon, label }: { icon: any, label: string }) => (
  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </div>
)

const MessageInput = ({ 
  type, 
  value, 
  onChange, 
  onSend, 
  placeholder 
}: { 
  type: 'customer' | 'agent'
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder: string
}) => {
  const isCustomer = type === 'customer'
  const colorClasses = isCustomer 
    ? {
        border: "border-blue-200 dark:border-blue-800",
        bg: "bg-blue-50 dark:bg-blue-950/50",
        text: "text-blue-900 dark:text-blue-100",
        button: "bg-blue-600 hover:bg-blue-700",
        dot: "bg-blue-500",
        textareaBg: "bg-white dark:bg-blue-900/20",
        textareaBorder: "border-blue-200 dark:border-blue-700",
        placeholder: "placeholder:text-blue-400 dark:placeholder:text-blue-500"
      }
    : {
        border: "border-green-200 dark:border-green-800",
        bg: "bg-green-50 dark:bg-green-950/50",
        text: "text-green-900 dark:text-green-100",
        button: "bg-green-600 hover:bg-green-700",
        dot: "bg-green-500",
        textareaBg: "bg-white dark:bg-green-900/20",
        textareaBorder: "border-green-200 dark:border-green-700",
        placeholder: "placeholder:text-green-400 dark:placeholder:text-green-500"
      }

  return (
    <div className={`border ${colorClasses.border} ${colorClasses.bg} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${colorClasses.dot}`} />
        <label className={`text-sm font-semibold ${colorClasses.text} uppercase tracking-wide`}>
          {isCustomer ? 'Customer Message' : 'Agent Message'}
        </label>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-20 text-sm resize-none ${colorClasses.textareaBorder} ${colorClasses.textareaBg} ${colorClasses.text} ${colorClasses.placeholder}`}
      />
      <Button
        size="sm"
        className={`w-full mt-3 ${colorClasses.button} text-white`}
        disabled={!value.trim()}
        onClick={onSend}
      >
        <Send className="w-3 h-3 mr-2" />
        Send as {isCustomer ? 'Customer' : 'Agent'}
      </Button>
    </div>
  )
}

const UtteranceCard = ({ 
  utterance, 
  onClick 
}: { 
  utterance: Utterance
  onClick: () => void 
}) => {
  const isCustomer = utterance.type === 'customer'
  const colorClasses = isCustomer
    ? {
        border: "border-blue-200 dark:border-blue-800",
        bg: "bg-blue-50 dark:bg-blue-950/50",
        hover: "hover:bg-blue-100 dark:hover:bg-blue-900/50",
        text: "text-blue-900 dark:text-blue-100",
        subtext: "text-blue-600 dark:text-blue-300",
        dot: "bg-blue-500"
      }
    : {
        border: "border-green-200 dark:border-green-800",
        bg: "bg-green-50 dark:bg-green-950/50",
        hover: "hover:bg-green-100 dark:hover:bg-green-900/50",
        text: "text-green-900 dark:text-green-100",
        subtext: "text-green-600 dark:text-green-300",
        dot: "bg-green-500"
      }

  return (
    <div
      className={`border ${colorClasses.border} ${colorClasses.bg} rounded-lg p-3 cursor-pointer ${colorClasses.hover} transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full ${colorClasses.dot} mt-2 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${colorClasses.text} leading-relaxed`}>
            {utterance.text}
          </div>
          <div className={`text-xs ${colorClasses.subtext} mt-1 flex items-center gap-1`}>
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
  )
}

const WebSocketLogItem = ({ 
  log, 
  index, 
  isExpanded, 
  onToggle, 
  isDarkMode 
}: { 
  log: LogEntry
  index: number
  isExpanded: boolean
  onToggle: () => void
  isDarkMode: boolean
}) => (
  <div className="border rounded-lg bg-card">
    <div 
      className="p-2 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onToggle}
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
            theme={getCodeMirrorTheme(isDarkMode)}
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

export default function AgentAssistTester({ config, profile }: AgentAssistTesterProps) {
  // State Management
  const [iframeSize, setIframeSize] = useState({ width: 320, height: 568 })
  const [selectedEvent, setSelectedEvent] = useState<string>("START_CALL")
  const [eventPayload, setEventPayload] = useState<string>(JSON.stringify(config.startCallParams, null, 2))
  const [, setLogs] = useState<LogEntry[]>([])
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
  const [conversationState, setConversationState] = useState<ConversationState>({
    isPlaying: false,
    currentIndex: 0,
    delay: 2000
  })
  const [customConversations, setCustomConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('aa-custom-conversations')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
    return []
  })
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [flowManager, setFlowManager] = useState<EventFlowManager | null>(null)
  
  // Computed Values
  const allConversations = useMemo(() => [...CONVERSATIONS, ...customConversations], [customConversations])
  
  const autoStartEnabled = useMemo(() => 
    config.autoStartCall !== undefined ? config.autoStartCall : profile.defaultBehaviors.autoStartCall,
    [config.autoStartCall, profile.defaultBehaviors.autoStartCall]
  )

  const iframeSrc = useMemo(() => {
    const environment = ENVIRONMENTS.find(e => e.id === config.environment)
    if (!environment || !config.token) return '/mock-child-app.html'
    
    if (config.devMode && config.localhostIframeUrl) {
      const params = new URLSearchParams({
        appName: 'aadesktop',
        cat1: config.token,
        desktopview: config.parentProfile.toLowerCase()
      })
      
      if (config.localhostWebsocketUrl) {
        params.append('websocketUrl', config.localhostWebsocketUrl)
      }
      
      const separator = config.localhostIframeUrl.includes('?') ? '&' : '?'
      return `${config.localhostIframeUrl}${separator}${params.toString()}`
    }
    
    if (environment.url.includes('example.com')) {
      const params = new URLSearchParams({
        appName: 'aadesktop',
        cat1: config.token,
        desktopview: config.parentProfile.toLowerCase()
      })
      return `/mock-child-app.html?${params.toString()}`
    }
    
    return buildAgentAssistUrl(environment, config.token, config.parentProfile)
  }, [config])

  // Callbacks
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

  const sendMessage = useCallback((event: string, payload: any) => {
    if (iframeRef.current?.contentWindow) {
      const message = { type: event, ...payload }
      iframeRef.current.contentWindow.postMessage(JSON.stringify(message), "*")
      addLog("sent", event, payload)
    }
  }, [addLog])

  const sendTranscriptMessage = useCallback((text: string, senderType: 'customer' | 'agent') => {
    if (!iframeRef.current?.contentWindow) return
    
    const timestamp = new Date().toLocaleTimeString()
    const timestampValue = Date.now()
    const messageId = crypto.randomUUID()
    
    const transcriptMessage = {
      eventName: senderType === 'customer' ? 'CUSTOMER_TRANSCRIPT' : 'AGENT_TRANSCRIPT',
      data: {
        agentId: config.startCallParams.agentDetailsAO?.soeId || 'SOE12345',
        customerId: '9430874843110687',
        chatSessionId: '123',
        timestamp,
        timestampValue,
        from: senderType === 'customer' ? 'customer' : 'user',
        msg: text,
        type: senderType === 'customer' ? 'customer' : 'user',
        isFromSocket: false,
        messageId,
      }
    }
    
    iframeRef.current.contentWindow.postMessage(JSON.stringify(transcriptMessage), '*')
    addLog("sent", transcriptMessage.eventName, transcriptMessage)
  }, [config.startCallParams.agentDetailsAO?.soeId, addLog])

  const handleSendEvent = useCallback(() => {
    try {
      const payload = JSON.parse(eventPayload)
      
      if (selectedEvent === "START_CALL") {
        if (flowManager) {
          flowManager.startCall(payload)
          setCallActive(true)
        } else {
          sendMessage(selectedEvent, payload)
          setCallActive(true)
        }
      } else if (selectedEvent === "END_CALL") {
        if (flowManager) {
          flowManager.endCall()
        } else {
          setCallActive(false)
        }
        sendMessage(selectedEvent, payload)
      } else {
        sendMessage(selectedEvent, payload)
      }
    } catch {
      alert("Invalid JSON payload")
    }
  }, [eventPayload, selectedEvent, flowManager, sendMessage])

  const handleEventChange = useCallback((event: string) => {
    setSelectedEvent(event)
    if (event === "START_CALL") {
      setEventPayload(JSON.stringify(config.startCallParams, null, 2))
    } else if (event === "SWITCH_ACCOUNT") {
      setEventPayload(
        JSON.stringify(
          {
            ...DEFAULT_PAYLOADS.SWITCH_ACCOUNT,
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
  }, [config.startCallParams, config.selectedAccounts])

  const handleAccountSwitch = useCallback(() => {
    if (!selectedAccountNumber) return
    
    const selectedAccount = availableAccounts.find(acc => acc.accountNumber === selectedAccountNumber)
    if (!selectedAccount) return
    
    const checkCustomerDetailsEdited = () => {
      if (!config.selectedAccounts || config.selectedAccounts.length === 0) return false
      
      const currentAccount = config.selectedAccounts[0]
      const customerDetails = config.startCallParams?.customerDetailsAO || {}
      
      const accountKeys = Object.keys(currentAccount)
      const customerKeys = Object.keys(customerDetails)
      
      if (accountKeys.length !== customerKeys.length) return true
      
      for (const key of accountKeys) {
        if (customerDetails[key] !== currentAccount[key]) return true
      }
      
      return false
    }
    
    const isEdited = checkCustomerDetailsEdited()
    
    if (isEdited) {
      const proceed = window.confirm(
        "Warning: customerDetailsAO has been manually edited and will be overwritten with the selected account details.\n\n" +
        "Do you want to proceed with switching accounts?"
      )
      if (!proceed) return
    }
    
    const switchPayload = {
      ...DEFAULT_PAYLOADS.SWITCH_ACCOUNT,
      accountId: selectedAccount.accountNumber,
      accountName: selectedAccount.lineOfBusiness || "Account",
      accountType: selectedAccount.productType || "Standard",
      accountNumber: selectedAccount.accountNumber,
      previousAccountId: config.selectedAccounts?.[0]?.accountNumber || "ACC000",
    }
    
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
    
    if (flowManager) {
      flowManager.updateStartCallParams(updatedStartCallParams)
    }
    
    setEventPayload(JSON.stringify(switchPayload, null, 2))
    setSelectedEvent("SWITCH_ACCOUNT")
    setTimeout(handleSendEvent, 100)
  }, [selectedAccountNumber, availableAccounts, config, flowManager, handleSendEvent])

  const reloadIframe = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc
      setCallActive(false)
      addLog("sent", "IFRAME_RELOAD", {})
      
      if (flowManager) {
        flowManager.endCall()
      }
    }
  }, [iframeSrc, flowManager, addLog])

  const handleAddCustomConversation = useCallback((conversation: Conversation) => {
    setCustomConversations(prev => [...prev, conversation])
    setShowUploadDialog(false)
  }, [])

  const handleRemoveCustomConversation = useCallback((conversationId: string) => {
    setCustomConversations(prev => prev.filter(c => c.id !== conversationId))
    if (selectedConversation === conversationId) {
      setSelectedConversation("")
    }
  }, [selectedConversation])

  const sendUtterance = useCallback((utterance: Utterance) => {
    sendTranscriptMessage(utterance.text, utterance.type === 'customer' ? 'customer' : 'agent')
  }, [sendTranscriptMessage])

  const startConversation = useCallback(() => {
    const conversation = allConversations.find(c => c.id === selectedConversation)
    if (!conversation) return

    setConversationState({
      isPlaying: true,
      currentIndex: 0,
      delay: conversation.defaultDelay
    })
  }, [selectedConversation, allConversations])

  const stopConversation = useCallback(() => {
    setConversationState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }))
  }, [])

  // Effects
  useEffect(() => {
    localStorage.setItem('aa-custom-conversations', JSON.stringify(customConversations))
  }, [customConversations])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow || 
          (event.origin === window.location.origin && event.data)) {
        
        let messageData = event.data
        
        // Parse stringified messages
        if (typeof messageData === 'string') {
          try {
            messageData = JSON.parse(messageData)
          } catch (e) {
            // If parsing fails, use the original string
            console.warn('Failed to parse message:', e)
            return
          }
        }
        
        if (messageData.eventName === "WebsocketRequestLog") {
          const wsLogEntry: LogEntry = {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            type: "received",
            event: "WebsocketRequestLog", 
            payload: messageData,
            requestType: messageData.requestType,
            websocketEvent: messageData.eventObject
          }
          setWebsocketLogs((prev) => [...prev, wsLogEntry])
        } else if (event.source === iframeRef.current?.contentWindow) {
          const eventName = messageData.type || messageData.eventName || "MESSAGE"
          addLog("received", eventName, messageData)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [addLog])

  useEffect(() => {
    const handleCallStatusChange = (event: CustomEvent) => {
      setCallActive(event.detail.active)
    }

    window.addEventListener("callStatusChanged", handleCallStatusChange as EventListener)
    return () => window.removeEventListener("callStatusChanged", handleCallStatusChange as EventListener)
  }, [])
  
  useEffect(() => {
    if (iframeRef.current && config.token && !flowManager) {
      const manager = new EventFlowManager(
        config.parentProfile,
        iframeRef,
        config.token
      )
      
      manager.initialize(config.startCallParams, autoStartEnabled)
      setFlowManager(manager)
      
      return () => {
        manager.endCall()
        setFlowManager(null)
      }
    }
  }, [config.token, config.parentProfile])

  useEffect(() => {
    if (flowManager && config.startCallParams) {
      flowManager.updateStartCallParams(config.startCallParams)
    }
  }, [config.startCallParams, flowManager])

  useEffect(() => {
    if (selectedEvent === "START_CALL" && config.startCallParams) {
      setEventPayload(JSON.stringify(config.startCallParams, null, 2))
    }
  }, [config.startCallParams, selectedEvent])

  useEffect(() => {
    const accounts = getAccountTemplates(config.parentProfile, config.environment)
    setAvailableAccounts(accounts)
  }, [config.parentProfile, config.environment])

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])

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
      sendTranscriptMessage(currentMessage.text, currentMessage.type)

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
  }, [conversationState, selectedConversation, sendTranscriptMessage, allConversations])

  // Render Functions
  const renderActionsTab = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <SectionHeader icon={Phone} label="Call Control" />
            
            <div className="space-y-2">
              <Button
                variant={callActive ? "secondary" : "default"}
                size="sm"
                className="w-full justify-start"
                disabled={autoStartEnabled}
                onClick={() => {
                  handleEventChange("START_CALL")
                  setTimeout(handleSendEvent, 100)
                }}
              >
                <Play className="w-4 h-4 mr-2" />
                {autoStartEnabled ? 'Auto-Start Enabled' : 'Start Call'}
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

          <div className="space-y-3">
            <SectionHeader icon={Users} label="Account Management" />
            
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
                      <SelectItem key={idx} value={account.accountNumber}>
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
                onClick={handleAccountSwitch}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Switch Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMessagesTab = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <SectionHeader icon={MessageSquare} label="Message Type" />
          
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
            <MessageInput
              type="customer"
              value={messageFlow.userMessage}
              onChange={(value) => setMessageFlow({ ...messageFlow, userMessage: value })}
              onSend={() => {
                if (messageFlow.userMessage) {
                  sendTranscriptMessage(messageFlow.userMessage, 'customer')
                  setMessageFlow({ ...messageFlow, userMessage: "" })
                }
              }}
              placeholder="Type customer message..."
            />
            
            <MessageInput
              type="agent"
              value={messageFlow.agentMessage}
              onChange={(value) => setMessageFlow({ ...messageFlow, agentMessage: value })}
              onSend={() => {
                if (messageFlow.agentMessage) {
                  sendTranscriptMessage(messageFlow.agentMessage, 'agent')
                  setMessageFlow({ ...messageFlow, agentMessage: "" })
                }
              }}
              placeholder="Type agent message..."
            />
          </div>
        )}

        {messageMode === "utterances" && (
          <div className="h-full flex flex-col gap-3 overflow-hidden">
            <Tabs defaultValue="customer" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="customer" className="text-xs">Customer</TabsTrigger>
                <TabsTrigger value="agent" className="text-xs">Agent</TabsTrigger>
              </TabsList>
              
              {['customer', 'agent'].map((type) => (
                <TabsContent key={type} value={type} className="flex-1 overflow-hidden mt-2">
                  <div className="h-full flex flex-col gap-2 overflow-hidden">
                    <Select value={selectedMainIntent} onValueChange={setSelectedMainIntent}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All Intents" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Intents</SelectItem>
                        {getMainIntents(type as 'customer' | 'agent').map(intent => (
                          <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                      {getUtterancesByIntent(
                        type as 'customer' | 'agent', 
                        selectedMainIntent === 'all' ? undefined : selectedMainIntent
                      ).map(utterance => (
                        <UtteranceCard
                          key={utterance.id}
                          utterance={utterance}
                          onClick={() => sendUtterance(utterance)}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {messageMode === "conversations" && (
          <div className="h-full flex flex-col gap-2 overflow-hidden">
            <div className="space-y-2">
              <Select value={selectedConversation} onValueChange={setSelectedConversation}>
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
  )

  const renderEventsTab = () => (
    <div className="h-full flex flex-col p-4">
      <div className="space-y-3 mb-4">
        <SectionHeader icon={Terminal} label="Event Type" />
        
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

      <div className="border-t pt-4 mb-4" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between">
          <SectionHeader icon={FileText} label="Event Payload" />
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => navigator.clipboard.writeText(eventPayload)}>
              <Copy className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEventChange(selectedEvent)}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-md border bg-background mt-2">
          <CodeMirror
            value={eventPayload}
            onChange={setEventPayload}
            theme={getCodeMirrorTheme(isDarkMode)}
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
            className="text-xs h-full overflow-y-auto"
          />
        </div>
        
        <Button onClick={handleSendEvent} size="sm" className="w-full mt-3">
          <Send className="w-4 h-4 mr-2" />
          Send Event
        </Button>
      </div>
    </div>
  )

  const renderLogsTab = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <SectionHeader icon={FileText} label={`WebSocket Logs (${websocketLogs.length})`} />
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
                const isExpanded = !expandedLogs.has(index)
                
                return (
                  <WebSocketLogItem
                    key={index}
                    log={log}
                    index={index}
                    isExpanded={isExpanded}
                    onToggle={() => {
                      const newExpanded = new Set(expandedLogs)
                      if (isExpanded) {
                        newExpanded.add(index)
                      } else {
                        newExpanded.delete(index)
                      }
                      setExpandedLogs(newExpanded)
                    }}
                    isDarkMode={isDarkMode}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderControlPanel = () => (
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
          {renderActionsTab()}
        </TabsContent>
        <TabsContent value="messages" className="flex-1 overflow-hidden">
          {renderMessagesTab()}
        </TabsContent>
        <TabsContent value="events" className="flex-1 overflow-hidden">
          {renderEventsTab()}
        </TabsContent>
        <TabsContent value="logs" className="flex-1 overflow-hidden">
          {renderLogsTab()}
        </TabsContent>
      </Tabs>
    </Card>
  )

  const renderIframePanel = () => (
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
  )

  return (
    <div className="h-screen flex flex-col">
      {/* Status Bar */}
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
        {/* Desktop Layout */}
        <div className="hidden md:block h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              {renderControlPanel()}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70}>
              {renderIframePanel()}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden h-full overflow-y-auto space-y-4">
          {renderControlPanel()}
          {renderIframePanel()}
        </div>
      </div>
    </div>
  )
}