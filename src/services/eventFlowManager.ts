import { messageFlowLogger } from '../utils/message-flow-logger';

export class EventFlowManager {
  private lobType: string;
  private iframeRef: React.RefObject<HTMLIFrameElement>;
  private token: string;
  private flowState: string = 'INITIAL';
  private isCallActive: boolean = false;
  private startCallParams: any;
  private autoStartCall: boolean = false;
  private receivedAALoadComplete: boolean = false;
  private receivedAAReady: boolean = false;
  private boundHandleMessage: (event: MessageEvent) => void;

  constructor(lobType: string, iframeRef: React.RefObject<HTMLIFrameElement>, token: string) {
    this.lobType = lobType;
    this.iframeRef = iframeRef;
    this.token = token;
    this.boundHandleMessage = this.handleChildMessage.bind(this);
    console.log('[EventFlowManager] Created for', lobType);
  }

  // Initialize with auto-start capability
  initialize(startCallParams: any, autoStartCall: boolean = false) {
    console.log('[EventFlowManager] Initializing:', this.lobType, '- Auto-start:', autoStartCall);
    this.startCallParams = startCallParams;
    this.autoStartCall = autoStartCall;
    this.setupMessageListener();
    
    if (this.autoStartCall) {
      this.flowState = 'WAITING_FOR_CHILD_AUTO';
      console.log('[EventFlowManager] Auto-start enabled, waiting for child message');
    } else {
      console.log('[EventFlowManager] Manual start mode, waiting for user action');
    }
  }
  
  // Called when user clicks "Start Call" button (manual mode)
  async startCall(startCallParams?: any) {
    if (this.isCallActive) {
      console.warn('Call already active');
      return;
    }
    
    this.startCallParams = startCallParams || this.startCallParams;
    this.flowState = 'WAITING_FOR_CHILD';
    this.isCallActive = true;
    
    // Trigger the flow based on current state
    this.checkAndProgressFlow();
  }

  setupMessageListener() {
    window.addEventListener('message', this.boundHandleMessage);
  }

  handleChildMessage(event: MessageEvent) {
    if (event.source !== this.iframeRef.current?.contentWindow) {
      // Ignore non-iframe messages
      return;
    }

    const message = event.data;
    messageFlowLogger.logMessage('CHILD -> PARENT', message.eventName || message.type || 'Unknown', message);
    
    switch (this.lobType.toLowerCase()) {
      case 'sawgrass':
      case 'olympus':
        this.handleSawgrassOlympusFlow(message);
        break;
      case 'eclipse':
        this.handleEclipseFlow(message);
        break;
    }
  }

  handleSawgrassOlympusFlow(message: any) {
    if (message.eventType === 'AA' && message.eventName === 'AALoadComplete') {
      // Store that we received AALoadComplete
      this.receivedAALoadComplete = true;
      
      // Auto-start flow
      if (this.flowState === 'WAITING_FOR_CHILD_AUTO' && this.autoStartCall) {
        console.log('[EventFlowManager] Auto-starting call for', this.lobType);
        this.isCallActive = true;
        this.sendInitiateAA();
        this.flowState = 'READY';
      }
      // Manual flow - only proceed if startCall was clicked
      else if (this.flowState === 'WAITING_FOR_CHILD' && this.isCallActive) {
        this.sendInitiateAA();
        this.flowState = 'READY';
      }
    }
  }

  handleEclipseFlow(message: any) {
    if (message.eventType === 'AA' && message.eventName === 'AAReady') {
      // Store that we received AAReady
      this.receivedAAReady = true;
      
      // Auto-start flow
      if (this.flowState === 'WAITING_FOR_CHILD_AUTO' && this.autoStartCall) {
        this.isCallActive = true;
        this.sendCat1Event();
        this.flowState = 'WAITING_FOR_LOAD_COMPLETE_AUTO';
      }
      // Manual flow - only proceed if startCall was clicked
      else if (this.flowState === 'WAITING_FOR_CHILD' && this.isCallActive) {
        this.sendCat1Event();
        this.flowState = 'WAITING_FOR_LOAD_COMPLETE';
      }
    } else if (message.eventType === 'AA' && message.eventName === 'AALoadComplete') {
      // Auto-start flow
      if (this.flowState === 'WAITING_FOR_LOAD_COMPLETE_AUTO') {
        this.sendInitiateAA();
        this.flowState = 'READY';
      }
      // Manual flow
      else if (this.flowState === 'WAITING_FOR_LOAD_COMPLETE') {
        this.sendInitiateAA();
        this.flowState = 'READY';
      }
    }
  }
  
  // Helper to check if we can progress the flow (for manual start)
  checkAndProgressFlow() {
    if (this.lobType.toLowerCase() === 'eclipse' && this.receivedAAReady) {
      this.handleEclipseFlow({ eventType: 'AA', eventName: 'AAReady' });
    } else if ((this.lobType.toLowerCase() === 'sawgrass' || this.lobType.toLowerCase() === 'olympus') && this.receivedAALoadComplete) {
      this.handleSawgrassOlympusFlow({ eventType: 'AA', eventName: 'AALoadComplete' });
    }
  }

  sendCat1Event() {
    const cat1Message = {
      appName: "Eclipse",
      eventName: 'cat1',
      token: this.token
    };
    
    this.sendMessage(cat1Message);
  }

  sendInitiateAA() {
    // Use the startCallParams that user configured in the UI, but exclude eventName
    const { eventName, ...paramsWithoutEventName } = this.startCallParams;
    const initiateMessage = {
      eventName: "initiateAA",
      ...paramsWithoutEventName // This contains callDetailsAO, agentDetailsAO, customerDetailsAO
    };
    
    this.sendMessage(initiateMessage);
    
    // Notify that call is now active
    window.dispatchEvent(new CustomEvent('callStatusChanged', { detail: { active: true } }));
  }

  updateStartCallParams(newParams: any) {
    this.startCallParams = newParams;
    console.log('[EventFlowManager] Updated startCallParams with new customerDetailsAO');
  }
  
  endCall() {
    this.isCallActive = false;
    this.flowState = 'INITIAL';
    this.receivedAALoadComplete = false;
    this.receivedAAReady = false;
    // Clean up message listener
    window.removeEventListener('message', this.boundHandleMessage);
    
    // Notify that call is no longer active
    window.dispatchEvent(new CustomEvent('callStatusChanged', { detail: { active: false } }));
  }
  
  cleanup() {
    this.endCall();
  }

  sendMessage(message: any) {
    messageFlowLogger.logMessage('PARENT -> CHILD', message.eventName || message.type || 'Unknown', message);
    if (this.iframeRef.current?.contentWindow) {
      this.iframeRef.current.contentWindow.postMessage(message, '*');
    } else {
      console.error('[EventFlowManager] Cannot send message - iframe not ready');
    }
  }

  getCallActive(): boolean {
    return this.isCallActive;
  }

  getFlowState(): string {
    return this.flowState;
  }
}