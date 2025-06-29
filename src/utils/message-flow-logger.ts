// Simple message flow logger that prevents duplicates
class MessageFlowLogger {
  private lastMessage: string = '';
  private lastTimestamp: number = 0;
  
  logMessage(direction: 'PARENT -> CHILD' | 'CHILD -> PARENT', eventName: string, data: any) {
    // Create a unique key for this message
    const messageKey = `${direction}:${eventName}:${JSON.stringify(data)}`;
    const now = Date.now();
    
    // Skip if this is a duplicate message within 100ms
    if (messageKey === this.lastMessage && (now - this.lastTimestamp) < 100) {
      return;
    }
    
    this.lastMessage = messageKey;
    this.lastTimestamp = now;
    
    // Log the message
    console.log(`[${direction}] ${eventName}`, data);
  }
}

export const messageFlowLogger = new MessageFlowLogger();