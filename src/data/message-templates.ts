export interface Utterance {
  id: string
  text: string
  type: 'customer' | 'agent'
  mainIntent: string
  subIntent?: string
}

export interface ConversationMessage {
  type: 'customer' | 'agent'
  text: string
  delay?: number // milliseconds
}

export interface Conversation {
  id: string
  name: string
  description: string
  messages: ConversationMessage[]
  defaultDelay: number // default delay between messages
}

export const UTTERANCES: Utterance[] = [
  // Customer utterances - Account & Billing
  {
    id: 'cust-acct-1',
    text: "I need help with my account",
    type: 'customer',
    mainIntent: 'Account & Billing',
    subIntent: 'General'
  },
  {
    id: 'cust-acct-2',
    text: "I want to check my balance",
    type: 'customer',
    mainIntent: 'Account & Billing',
    subIntent: 'Balance Inquiry'
  },
  {
    id: 'cust-acct-3',
    text: "I need to update my billing information",
    type: 'customer',
    mainIntent: 'Account & Billing',
    subIntent: 'Update Info'
  },
  {
    id: 'cust-acct-4',
    text: "Why was I charged this amount?",
    type: 'customer',
    mainIntent: 'Account & Billing',
    subIntent: 'Billing Dispute'
  },
  
  // Customer utterances - Technical Support
  {
    id: 'cust-tech-1',
    text: "My internet is not working",
    type: 'customer',
    mainIntent: 'Technical Support',
    subIntent: 'Connectivity'
  },
  {
    id: 'cust-tech-2',
    text: "I can't log into my account",
    type: 'customer',
    mainIntent: 'Technical Support',
    subIntent: 'Login Issues'
  },
  {
    id: 'cust-tech-3',
    text: "The app keeps crashing",
    type: 'customer',
    mainIntent: 'Technical Support',
    subIntent: 'App Issues'
  },
  
  // Customer utterances - Orders & Shipping
  {
    id: 'cust-order-1',
    text: "Where is my order?",
    type: 'customer',
    mainIntent: 'Orders & Shipping',
    subIntent: 'Track Order'
  },
  {
    id: 'cust-order-2',
    text: "I want to return this item",
    type: 'customer',
    mainIntent: 'Orders & Shipping',
    subIntent: 'Returns'
  },
  {
    id: 'cust-order-3',
    text: "Can I change my delivery address?",
    type: 'customer',
    mainIntent: 'Orders & Shipping',
    subIntent: 'Modify Order'
  },
  
  // Agent utterances - Greetings & Opening
  {
    id: 'agent-greet-1',
    text: "Hello! Thank you for contacting us. How can I help you today?",
    type: 'agent',
    mainIntent: 'Greetings',
    subIntent: 'Opening'
  },
  {
    id: 'agent-greet-2',
    text: "Welcome! I'm here to assist you. What brings you here today?",
    type: 'agent',
    mainIntent: 'Greetings',
    subIntent: 'Opening'
  },
  
  // Agent utterances - Information Gathering
  {
    id: 'agent-info-1',
    text: "I'd be happy to help. Can you provide me with your account number?",
    type: 'agent',
    mainIntent: 'Information Gathering',
    subIntent: 'Account Verification'
  },
  {
    id: 'agent-info-2',
    text: "I understand your concern. Let me look into this for you.",
    type: 'agent',
    mainIntent: 'Information Gathering',
    subIntent: 'Acknowledgment'
  },
  {
    id: 'agent-info-3',
    text: "Could you please provide more details about the issue?",
    type: 'agent',
    mainIntent: 'Information Gathering',
    subIntent: 'Clarification'
  },
  
  // Agent utterances - Resolution
  {
    id: 'agent-res-1',
    text: "I've updated your information. The changes will take effect within 24 hours.",
    type: 'agent',
    mainIntent: 'Resolution',
    subIntent: 'Account Update'
  },
  {
    id: 'agent-res-2',
    text: "I've processed a refund for you. You should see it in 3-5 business days.",
    type: 'agent',
    mainIntent: 'Resolution',
    subIntent: 'Refund'
  },
  {
    id: 'agent-res-3',
    text: "I've escalated this to our technical team. They'll contact you within 2 hours.",
    type: 'agent',
    mainIntent: 'Resolution',
    subIntent: 'Escalation'
  },
  
  // Agent utterances - Closing
  {
    id: 'agent-close-1',
    text: "Is there anything else I can help you with today?",
    type: 'agent',
    mainIntent: 'Closing',
    subIntent: 'Check Additional Needs'
  },
  {
    id: 'agent-close-2',
    text: "Thank you for contacting us. Have a great day!",
    type: 'agent',
    mainIntent: 'Closing',
    subIntent: 'Farewell'
  }
]

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Balance Inquiry Flow',
    description: 'Customer checking their account balance',
    defaultDelay: 2000,
    messages: [
      { type: 'agent', text: "Hello! Thank you for contacting us. How can I help you today?" },
      { type: 'customer', text: "Hi, I'd like to check my account balance please", delay: 3000 },
      { type: 'agent', text: "I'd be happy to help you check your balance. Can you please provide your account number?" },
      { type: 'customer', text: "Sure, it's 123456789", delay: 4000 },
      { type: 'agent', text: "Thank you. I can see your current balance is $1,250.00. Is there anything specific about your balance you'd like to know?" },
      { type: 'customer', text: "No, that's all I needed. Thank you!", delay: 2000 },
      { type: 'agent', text: "You're welcome! Is there anything else I can help you with today?" },
      { type: 'customer', text: "No, that's everything", delay: 2000 },
      { type: 'agent', text: "Thank you for contacting us. Have a great day!" }
    ]
  },
  {
    id: 'conv-2',
    name: 'Technical Issue Resolution',
    description: 'Customer reporting internet connectivity issues',
    defaultDelay: 2500,
    messages: [
      { type: 'agent', text: "Welcome! I'm here to assist you. What brings you here today?" },
      { type: 'customer', text: "My internet has been down for the past 2 hours", delay: 3000 },
      { type: 'agent', text: "I'm sorry to hear you're experiencing connectivity issues. Let me help you with that. Can you tell me which lights are showing on your modem?" },
      { type: 'customer', text: "The power light is on but the internet light is red", delay: 4000 },
      { type: 'agent', text: "I see. Let's try a quick reset. Can you unplug your modem for 30 seconds and then plug it back in?" },
      { type: 'customer', text: "Okay, I've done that. The lights are coming back on", delay: 6000 },
      { type: 'agent', text: "Great! It may take 2-3 minutes to fully reconnect. Can you let me know when all lights are green?" },
      { type: 'customer', text: "Yes! All lights are green now and my internet is working!", delay: 5000 },
      { type: 'agent', text: "Excellent! I'm glad we could resolve that quickly. Is your connection speed normal now?" },
      { type: 'customer', text: "Yes, everything seems to be working perfectly. Thank you so much!", delay: 3000 },
      { type: 'agent', text: "You're very welcome! Is there anything else I can help you with today?" },
      { type: 'customer', text: "No, that's all. Thanks again!", delay: 2000 },
      { type: 'agent', text: "My pleasure! Have a wonderful day!" }
    ]
  },
  {
    id: 'conv-3',
    name: 'Order Status Check',
    description: 'Customer inquiring about order delivery',
    defaultDelay: 2000,
    messages: [
      { type: 'agent', text: "Hello! How can I assist you today?" },
      { type: 'customer', text: "I placed an order 3 days ago and haven't received it yet", delay: 3000 },
      { type: 'agent', text: "I'd be happy to check on your order status. May I have your order number please?" },
      { type: 'customer', text: "It's ORD-789456", delay: 3500 },
      { type: 'agent', text: "Thank you. I'm checking your order now... I can see that your order is currently in transit and scheduled for delivery tomorrow by 5 PM." },
      { type: 'customer', text: "Oh great! Can I get a tracking number?", delay: 2500 },
      { type: 'agent', text: "Of course! Your tracking number is TRK123456789. I'll also send this to your email on file." },
      { type: 'customer', text: "Perfect, thank you for your help!", delay: 2000 },
      { type: 'agent', text: "You're welcome! The package should arrive tomorrow. Is there anything else I can help you with?" },
      { type: 'customer', text: "No, that's all I needed", delay: 1500 },
      { type: 'agent', text: "Great! Thank you for your patience. Have a wonderful day!" }
    ]
  },
  {
    id: 'conv-4',
    name: 'Billing Dispute',
    description: 'Customer disputing a charge on their account',
    defaultDelay: 3000,
    messages: [
      { type: 'agent', text: "Good day! How may I assist you?" },
      { type: 'customer', text: "I see a charge on my account that I don't recognize", delay: 3000 },
      { type: 'agent', text: "I understand your concern about an unrecognized charge. I'll help you investigate this. Can you tell me the amount and date of the charge?" },
      { type: 'customer', text: "It's $49.99 from yesterday", delay: 3500 },
      { type: 'agent', text: "Thank you. Let me review your account... I see the charge. This appears to be for your premium service renewal. Did you recently sign up for our premium plan?" },
      { type: 'customer', text: "Oh! Yes, I did sign up last month. I forgot it would auto-renew", delay: 4000 },
      { type: 'agent', text: "No worries! Yes, the premium service auto-renews monthly. Would you like to keep the service or would you prefer to cancel it?" },
      { type: 'customer', text: "I'll keep it. Thanks for clarifying!", delay: 3000 },
      { type: 'agent', text: "Perfect! Your premium service will continue. You can manage your subscription settings in your account dashboard. Anything else I can help with?" },
      { type: 'customer', text: "No, that cleared everything up. Thanks!", delay: 2000 },
      { type: 'agent', text: "Wonderful! Thank you for being a premium member. Have an excellent day!" }
    ]
  }
]

// Helper function to get utterances by intent
export function getUtterancesByIntent(type: 'customer' | 'agent', mainIntent?: string): Utterance[] {
  return UTTERANCES.filter(u => {
    if (u.type !== type) return false
    if (mainIntent && u.mainIntent !== mainIntent) return false
    return true
  })
}

// Helper function to get unique main intents
export function getMainIntents(type: 'customer' | 'agent'): string[] {
  const intents = new Set<string>()
  UTTERANCES.forEach(u => {
    if (u.type === type) {
      intents.add(u.mainIntent)
    }
  })
  return Array.from(intents)
}