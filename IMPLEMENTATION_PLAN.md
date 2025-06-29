# Agent Assist Parent Replica Implementation Plan

## 🎯 Overview
Build a local parent app replica that mirrors production behavior with easy environment switching between home (mock) and work (real) setups. The app leverages the existing login screen configuration to properly load the iframe with correct query parameters and manage the event flow after the start button is clicked.

## 🏗️ Architecture Design

### Key Requirements
- Use existing app layout and login screen (no redundant implementation)
- Load iframe with proper URL based on selected environment (dev1, dev2, dev3, uat1, uat2, uat3, perf)
- Add query parameters: `?appName=aadesktop&cat1={cat1Token}&desktopview={parentApp}`
- Event flow starts AFTER the Start Call button is clicked (not on login)
- User can modify start_call parameters before sending initiateAA

### 1. Environment and URL Configuration

Update the existing environment configuration to include proper Agent Assist URLs:

```javascript
// Update src/components/pages/login/login-constants.ts
export const ENVIRONMENTS: Environment[] = [
  {
    id: "dev1",
    name: "Development 1",
    url: "https://dev1-agent-assist.company.com",
    tokenAPI: "/api/mock/token", // Mock for home
    description: "Development environment 1"
  },
  {
    id: "dev2",
    name: "Development 2",
    url: "https://dev2-agent-assist.company.com",
    tokenAPI: "/api/mock/token",
    description: "Development environment 2"
  },
  {
    id: "dev3",
    name: "Development 3",
    url: "https://dev3-agent-assist.company.com",
    tokenAPI: "/api/mock/token",
    description: "Development environment 3"
  },
  {
    id: "uat1",
    name: "UAT 1",
    url: "https://uat1-agent-assist.company.com",
    tokenAPI: "/api/mock/token",
    description: "User Acceptance Testing 1"
  },
  {
    id: "uat2",
    name: "UAT 2",
    url: "https://uat2-agent-assist.company.com",
    tokenAPI: "/api/mock/token",
    description: "User Acceptance Testing 2"
  },
  {
    id: "uat3",
    name: "UAT 3",
    url: "https://uat3-agent-assist.company.com",
    tokenAPI: "/api/mock/token",
    description: "User Acceptance Testing 3"
  },
  {
    id: "perf",
    name: "Performance",
    url: "https://perf-agent-assist.company.com",
    tokenAPI: "/api/mock/token",
    description: "Performance testing environment"
  },
  {
    id: "local",
    name: "Local Mock",
    url: "/mock-child-app.html", // Local mock for home development
    tokenAPI: "/api/mock/token",
    description: "Local mock child app"
  }
];

// config/environment.js
export const getEnvironmentConfig = (envId: string) => {
  const isHomeComputer = process.env.REACT_APP_ENV === 'development';
  
  return {
    useMockAuth: isHomeComputer,
    // At work, replace with real token endpoints
    tokenAPIOverride: isHomeComputer ? null : 'https://api.company.com/auth/token'
  };
};
```

### 2. Iframe URL Construction

Build the iframe URL with proper query parameters after token generation:

```javascript
// services/iframeUrlBuilder.js
export function buildAgentAssistUrl(environment: Environment, token: string, parentApp: string) {
  const params = new URLSearchParams({
    appName: 'aadesktop',
    cat1: token,
    desktopview: parentApp.toLowerCase() // eclipse, olympus, or sawgrass
  });
  
  return `${environment.url}?${params.toString()}`;
}
```

### 3. Mock Token API Implementation

#### Local Token Service
```javascript
// api/mock/token.js
export const mockTokenService = {
  async generateToken(lobType, credentials) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate mock token based on LOB
    const mockTokens = {
      sawgrass: `mock_sawgrass_token_${Date.now()}_${Math.random().toString(36)}`,
      olympus: `mock_olympus_token_${Date.now()}_${Math.random().toString(36)}`,
      eclipse: `mock_eclipse_token_${Date.now()}_${Math.random().toString(36)}`
    };
    
    return {
      token: mockTokens[lobType.toLowerCase()],
      expiresIn: 3600,
      tokenType: 'Bearer',
      lobType: lobType
    };
  }
};
```

#### Token Service Abstraction
```javascript
// services/tokenService.js
import { config } from '../config/environment';
import { mockTokenService } from '../api/mock/token';

export class TokenService {
  async getToken(lobType, credentials) {
    if (config.useMockAuth) {
      return mockTokenService.generateToken(lobType, credentials);
    }
    
    // Real API call (to be implemented at work)
    const response = await fetch(config.tokenAPI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lobType,
        ...credentials
      })
    });
    
    return response.json();
  }
}
```

### 4. LOB-Specific Startup Flows (Triggered by Start Call Button)

#### Event Flow Manager

IMPORTANT: The event flow starts ONLY when the user clicks "Start Call", not on login:
```javascript
// services/eventFlowManager.js
export class EventFlowManager {
  constructor(lobType, iframeRef, token) {
    this.lobType = lobType;
    this.iframeRef = iframeRef;
    this.token = token;
    this.flowState = 'INITIAL';
    this.isCallActive = false;
  }

  // Initialize with auto-start capability
  initialize(startCallParams, autoStartCall = false) {
    this.startCallParams = startCallParams;
    this.autoStartCall = autoStartCall;
    this.setupMessageListener();
    
    if (this.autoStartCall) {
      this.flowState = 'WAITING_FOR_CHILD_AUTO';
    }
  }
  
  // Called when user clicks "Start Call" button (manual mode)
  async startCall(startCallParams) {
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
    window.addEventListener('message', this.handleChildMessage.bind(this));
  }

  handleChildMessage(event) {
    if (event.source !== this.iframeRef.current?.contentWindow) return;

    const message = event.data;
    
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

  handleSawgrassOlympusFlow(message) {
    if (message.eventType === 'AA' && message.eventName === 'AALoadComplete') {
      // Store that we received AALoadComplete
      this.receivedAALoadComplete = true;
      
      // Auto-start flow
      if (this.flowState === 'WAITING_FOR_CHILD_AUTO' && this.autoStartCall) {
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

  handleEclipseFlow(message) {
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
    if (this.lobType === 'eclipse' && this.receivedAAReady) {
      this.handleEclipseFlow({ eventType: 'AA', eventName: 'AAReady' });
    } else if ((this.lobType === 'sawgrass' || this.lobType === 'olympus') && this.receivedAALoadComplete) {
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
    // Use the startCallParams that user configured in the UI
    const initiateMessage = {
      eventName: "initiateAA",
      ...this.startCallParams // This contains callDetailsAO, agentDetailsAO, customerDetailsAO
    };
    
    this.sendMessage(initiateMessage);
  }
  
  endCall() {
    this.isCallActive = false;
    this.flowState = 'INITIAL';
    // Clean up message listener
    window.removeEventListener('message', this.handleChildMessage.bind(this));
  }

  sendMessage(message) {
    this.iframeRef.current?.contentWindow?.postMessage(message, '*');
  }

}
```

### 5. Token Generation on Login

Generate token when user logs in, store it for later use:

```javascript
// components/pages/login/LoginPage.tsx - Update handleLogin
const handleLogin = useCallback(async () => {
  // ... existing credential saving logic ...
  
  // Generate token on login
  const tokenService = new TokenService();
  const tokenData = await tokenService.getToken(
    config.parentProfile, // eclipse, olympus, or sawgrass
    {
      username: config.username,
      password: config.password,
      environment: config.environment
    }
  );
  
  // Pass token along with config
  onLogin({
    ...config,
    token: tokenData.token
  });
}, [config, saveCredentials, saveDefaultAccount, onLogin]);
```

### 6. Updated Agent Assist Tester Component

Modify the iframe loading and event handling:

```javascript
// components/agent-assist-tester.tsx
import { buildAgentAssistUrl } from '../services/iframeUrlBuilder';
import { EventFlowManager } from '../services/eventFlowManager';

function AgentAssistTester({ config, profile, onLogout }) {
  const [flowManager, setFlowManager] = useState(null);
  const iframeRef = useRef(null);
  
  // Build iframe URL with query params
  const iframeSrc = useMemo(() => {
    const environment = ENVIRONMENTS.find(e => e.id === config.environment);
    return buildAgentAssistUrl(environment, config.token, config.parentProfile);
  }, [config]);
  
  // Initialize flow manager after iframe loads
  useEffect(() => {
    if (iframeRef.current && config.token) {
      const manager = new EventFlowManager(
        config.parentProfile,
        iframeRef,
        config.token
      );
      
      // Initialize with auto-start if enabled for this profile
      manager.initialize(
        config.startCallParams,
        profile.defaultBehaviors.autoStartCall
      );
      
      setFlowManager(manager);
    }
  }, [config, profile, iframeRef.current]);
  
  // Modified handleSendEvent to use flow manager
  const handleSendEvent = () => {
    try {
      const payload = JSON.parse(eventPayload);
      
      if (selectedEvent === "START_CALL" && flowManager) {
        // Start the LOB-specific flow
        flowManager.startCall(payload);
        setCallActive(true);
      } else if (selectedEvent === "END_CALL" && flowManager) {
        flowManager.endCall();
        setCallActive(false);
        sendMessage(selectedEvent, payload);
      } else {
        // Other events sent directly
        sendMessage(selectedEvent, payload);
      }
    } catch (error) {
      alert("Invalid JSON payload");
    }
  };
  
  return (
    // ... existing UI ...
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      className="w-full h-full border-0"
      title="Agent Assist"
    />
  );
}
```

### 7. Updated Mock Child App

```javascript
// Updates to mock-child-app.html
function initializeApp() {
  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const appName = urlParams.get('appName'); // Should be 'aadesktop'
  const cat1Token = urlParams.get('cat1');
  const desktopView = urlParams.get('desktopview'); // eclipse, olympus, or sawgrass
  
  console.log('Child app initialized with:', { appName, cat1Token, desktopView });
  
  // Store for later use
  window.appConfig = {
    appName,
    token: cat1Token,
    parentApp: desktopView
  };
  
  // Send appropriate initial message based on parent app
  // Note: These are sent immediately on load, not waiting for Start Call
  setTimeout(() => {
    switch(desktopView) {
      case 'sawgrass':
      case 'olympus':
        sendMessage({
          eventType: 'AA',
          eventName: 'AALoadComplete'
        });
        break;
      case 'eclipse':
        sendMessage({
          eventType: 'AA',
          eventName: 'AAReady'
        });
        break;
    }
  }, 1000);
}

// Handle Eclipse cat1 event
function handleCat1Event(data) {
  console.log('Received cat1 event with token:', data.token);
  // Store token for future use
  sessionStorage.setItem('authToken', data.token);
  
  // Send AALoadComplete after processing cat1
  setTimeout(() => {
    sendMessage({
      eventType: 'AA',
      eventName: 'AALoadComplete'
    });
  }, 500);
}
```

### 8. Complete Flow Sequence

#### Login Flow:
1. User selects parent profile (Eclipse/Olympus/Sawgrass)
2. User selects environment (dev1, dev2, etc.)
3. User enters credentials
4. User configures start call parameters
5. User clicks "Login"
6. Token is generated (mock or real)
7. Navigate to Agent Assist Tester page
8. Iframe loads with URL: `{env.url}?appName=aadesktop&cat1={token}&desktopview={parentApp}`

#### Call Flow - Option 1: Auto Start (if autoStartCall is true):
1. Parent profiles have autoStartCall setting:
   - Eclipse: `autoStartCall: true`
   - Olympus: `autoStartCall: false`
   - Sawgrass: `autoStartCall: true`
2. If autoStartCall is true:
   - EventFlowManager automatically starts when receiving initial child message
   - Uses start call parameters from login page configuration
   - **Sawgrass**: Receives AALoadComplete → Auto sends initiateAA
   - **Eclipse**: Receives AAReady → Auto sends cat1 → Receives AALoadComplete → Auto sends initiateAA
3. User sees call automatically started with their configured parameters

#### Call Flow - Option 2: Manual Start (if autoStartCall is false or user wants to modify):
1. User can modify start call parameters in the JSON editor
2. User clicks "Start Call" button
3. EventFlowManager takes over with the same LOB-specific sequences
4. initiateAA contains the user-configured parameters from the JSON editor

### 9. Implementation Priorities

1. **Phase 1 - Home Computer Setup**:
   - ✅ Update environment constants with all environments
   - ✅ Create mock token service
   - ✅ Build iframe URL with query params
   - ✅ Update mock child app to read query params
   - ✅ Implement EventFlowManager for LOB-specific flows
   - ✅ Ensure Start Call triggers the proper flow

2. **Phase 2 - Work Computer Integration**:
   - 📌 Replace mock token endpoint with real API
   - 📌 Update environment URLs to real endpoints
   - 📌 Test with actual credentials
   - 📌 Verify message contracts

### 10. Key Configuration Points for Work Migration

When moving to work computer, only these changes needed:

```javascript
// 1. Environment URLs (in login-constants.ts)
dev1: { url: "https://actual-dev1-url.company.com" }
// ... etc for all environments

// 2. Token API endpoint (in environment.js)
tokenAPIOverride: 'https://actual-token-api.company.com/auth/token'

// 3. Remove mock child app, use real URLs
// No code changes needed, just configuration
```

## 📋 File Changes Summary

### Files to Create:
1. `src/services/tokenService.js` - Token generation abstraction
2. `src/services/eventFlowManager.js` - LOB-specific event flow handling
3. `src/services/iframeUrlBuilder.js` - URL construction with query params
4. `src/api/mock/token.js` - Mock token generation for home development
5. `src/config/environment.js` - Environment configuration management

### Files to Update:
1. `src/components/pages/login/login-constants.ts` - Add new environments (dev1-3, uat1-3, perf)
2. `src/components/pages/login/LoginPage.tsx` - Add token generation on login
3. `src/components/agent-assist-tester.tsx` - Use EventFlowManager for Start Call
4. `public/mock-child-app.html` - Read query params and handle LOB-specific flows
5. `types/auth.d.ts` - Add token field to LoginConfig type

## 🧪 Testing Strategy

### Testing Each LOB Flow:

1. **Sawgrass Flow (autoStartCall: true)**:
   - Login with Sawgrass profile
   - Iframe loads with query params
   - Child app sends AALoadComplete
   - Parent automatically sends initiateAA (no user action needed)
   - Call is active with parameters from login page

2. **Olympus Flow (autoStartCall: false)**:
   - Login with Olympus profile
   - Iframe loads with query params
   - Child app sends AALoadComplete
   - User can modify parameters in JSON editor
   - User clicks Start Call → sends initiateAA

3. **Eclipse Flow (autoStartCall: true)**:
   - Login with Eclipse profile  
   - Iframe loads with query params
   - Child app sends AAReady
   - Parent automatically sends cat1
   - Child app sends AALoadComplete
   - Parent automatically sends initiateAA
   - Call is active with parameters from login page

### Manual Testing Functions
Create browser console utilities for testing:

```javascript
// Test utilities to paste in browser console
window.testUtils = {
  sendInitiateAA: function() {
    const message = {
      eventName: "initiateAA",
      callDetailsAO: { /* ... */ },
      agentDetailsAO: { /* ... */ },
      customerDetailsAO: { /* ... */ }
    };
    window.parent.postMessage(message, "*");
  },
  
  sendAAReady: function() {
    window.parent.postMessage({
      eventType: 'AA',
      eventName: 'AAReady'
    }, "*");
  },
  
  sendAALoadComplete: function() {
    window.parent.postMessage({
      eventType: 'AA',
      eventName: 'AALoadComplete'
    }, "*");
  }
};
```

## 🔐 Security Considerations

1. **Token Security**:
   - Never commit real tokens or credentials
   - Use environment variables for sensitive data
   - Implement token expiration handling

2. **Origin Validation**:
   - Replace `"*"` with specific origins in production
   - Validate message sources before processing

3. **Data Sanitization**:
   - Validate all incoming messages
   - Sanitize data before displaying or processing

## 📁 File Structure

```
src/
├── api/
│   └── mock/
│       └── token.js
├── config/
│   └── environment.js
├── services/
│   ├── tokenService.js
│   └── eventFlowManager.js
├── components/
│   └── agent-assist-tester.tsx
└── utils/
    └── testHelpers.js
```

## 🚀 Next Steps

1. Start with Phase 1 implementation
2. Test each LOB flow independently
3. Document any deviations from expected behavior
4. Prepare work computer environment variables
5. Create deployment checklist for work integration