// MongoDB Service - Easy to swap between dummy and real data
// To use real MongoDB: Replace the setTimeout calls with actual API fetch calls

interface MongoConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

// Dummy data for development
const DUMMY_INTERACTIONS = [
  {
    _id: "507f1f77bcf86cd799439011",
    ucid: "UC123456789",
    interactionId: "INT987654321",
    timestamp: "2024-01-15T10:30:00Z",
    status: "completed",
    duration: 245,
    channel: "voice",
    metadata: {
      source: "web",
      region: "us-east-1",
      customerInfo: {
        customerId: "CUST789456",
        tier: "premium",
        location: "San Francisco, CA"
      }
    },
    agentInfo: {
      agentId: "AGT456789",
      name: "Sarah Johnson",
      skills: ["technical", "billing", "escalation"]
    },
    callDetails: {
      queue: "tech_support",
      waitTime: 45,
      holdTime: 30,
      transferCount: 0
    }
  },
  {
    _id: "507f1f77bcf86cd799439012",
    ucid: "UC987654321",
    interactionId: "INT123456789",
    timestamp: "2024-01-15T14:45:00Z",
    status: "completed",
    duration: 512,
    channel: "voice",
    metadata: {
      source: "mobile",
      region: "eu-west-1",
      customerInfo: {
        customerId: "CUST456123",
        tier: "standard",
        location: "London, UK"
      }
    },
    agentInfo: {
      agentId: "AGT789123",
      name: "James Smith",
      skills: ["billing", "general"]
    },
    callDetails: {
      queue: "billing",
      waitTime: 120,
      holdTime: 0,
      transferCount: 1
    }
  }
]

const DUMMY_TRANSCRIPTS = [
  {
    _id: "507f1f77bcf86cd799439013",
    ucid: "UC123456789",
    interactionId: "INT987654321",
    transcript: [
      { 
        speaker: "customer", 
        text: "Hello, I need help with my account. I can't seem to log in.", 
        timestamp: "00:00:01",
        sentiment: "neutral"
      },
      { 
        speaker: "agent", 
        text: "I'd be happy to help you with that. Can you please provide me with your account email?", 
        timestamp: "00:00:05",
        sentiment: "positive"
      },
      { 
        speaker: "customer", 
        text: "Sure, it's john.doe@example.com", 
        timestamp: "00:00:08",
        sentiment: "neutral"
      },
      {
        speaker: "agent",
        text: "Thank you. I can see your account here. Let me help you reset your password.",
        timestamp: "00:00:12",
        sentiment: "positive"
      },
      {
        speaker: "customer",
        text: "That would be great, thank you so much!",
        timestamp: "00:00:15",
        sentiment: "positive"
      }
    ],
    language: "en-US",
    createdAt: "2024-01-15T10:30:00Z",
    analysis: {
      totalTurns: 5,
      avgSentiment: 0.6,
      keywords: ["account", "login", "password", "reset"],
      intent: "account_access_issue"
    }
  },
  {
    _id: "507f1f77bcf86cd799439014",
    ucid: "UC987654321",
    interactionId: "INT123456789",
    transcript: [
      { 
        speaker: "customer", 
        text: "Hi, I've been charged twice for my subscription this month.", 
        timestamp: "00:00:01",
        sentiment: "negative"
      },
      { 
        speaker: "agent", 
        text: "I apologize for the inconvenience. Let me look into this for you right away.", 
        timestamp: "00:00:04",
        sentiment: "positive"
      },
      { 
        speaker: "customer", 
        text: "This is really frustrating. I need this resolved today.", 
        timestamp: "00:00:07",
        sentiment: "negative"
      },
      {
        speaker: "agent",
        text: "I completely understand your frustration. I can see the duplicate charge here, and I'll process a refund immediately.",
        timestamp: "00:00:10",
        sentiment: "positive"
      },
      {
        speaker: "customer",
        text: "Okay, how long will the refund take?",
        timestamp: "00:00:13",
        sentiment: "neutral"
      },
      {
        speaker: "agent",
        text: "The refund will be processed within 3-5 business days. I've also added a credit to your account for the inconvenience.",
        timestamp: "00:00:16",
        sentiment: "positive"
      },
      {
        speaker: "customer",
        text: "Thank you, I appreciate you resolving this quickly.",
        timestamp: "00:00:19",
        sentiment: "positive"
      }
    ],
    language: "en-US",
    createdAt: "2024-01-15T14:45:00Z",
    analysis: {
      totalTurns: 7,
      avgSentiment: 0.14,
      keywords: ["charged", "subscription", "refund", "duplicate", "credit"],
      intent: "billing_dispute"
    }
  }
]

export class MongoService {
  private config: MongoConfig;
  private useDummyData: boolean;

  constructor(config: MongoConfig = {}, useDummyData = true) {
    this.config = config;
    this.useDummyData = useDummyData;
  }

  async searchInteractions(ucid?: string, interactionId?: string): Promise<any> {
    if (this.useDummyData) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return dummy data based on search criteria
      if (ucid === "UC123456789" || interactionId === "INT987654321") {
        return DUMMY_INTERACTIONS[0];
      } else if (ucid === "UC987654321" || interactionId === "INT123456789") {
        return DUMMY_INTERACTIONS[1];
      } else {
        // Return first dummy data for any other input
        return DUMMY_INTERACTIONS[0];
      }
    }

    // Real API implementation (uncomment and modify when ready)
    /*
    const params = new URLSearchParams();
    if (ucid) params.append('ucid', ucid);
    if (interactionId) params.append('interactionId', interactionId);
    
    const response = await fetch(`${this.config.baseUrl}/api/interactions?${params}`, {
      headers: this.config.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
    */
  }

  async searchTranscripts(ucid?: string, interactionId?: string): Promise<any> {
    if (this.useDummyData) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return dummy data based on search criteria
      if (ucid === "UC123456789" || interactionId === "INT987654321") {
        return DUMMY_TRANSCRIPTS[0];
      } else if (ucid === "UC987654321" || interactionId === "INT123456789") {
        return DUMMY_TRANSCRIPTS[1];
      } else {
        // Return first dummy data for any other input
        return DUMMY_TRANSCRIPTS[0];
      }
    }

    // Real API implementation (uncomment and modify when ready)
    /*
    const params = new URLSearchParams();
    if (ucid) params.append('ucid', ucid);
    if (interactionId) params.append('interactionId', interactionId);
    
    const response = await fetch(`${this.config.baseUrl}/api/transcripts?${params}`, {
      headers: this.config.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
    */
  }
}

// Export a default instance for easy use
export const mongoService = new MongoService();