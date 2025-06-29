export interface TokenResponse {
  token: string;
  expiresIn: number;
  tokenType: string;
  lobType: string;
}

export const mockTokenService = {
  async generateToken(lobType: string, credentials: { username: string; password: string; environment: string }): Promise<TokenResponse> {
    // Generate mock token
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate mock token based on LOB and environment
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const envPrefix = credentials.environment.toUpperCase();
    
    const mockTokens: Record<string, string> = {
      sawgrass: `mock_${envPrefix}_sawgrass_token_${timestamp}_${random}`,
      olympus: `mock_${envPrefix}_olympus_token_${timestamp}_${random}`,
      eclipse: `mock_${envPrefix}_eclipse_token_${timestamp}_${random}`
    };
    
    const token = mockTokens[lobType.toLowerCase()] || `mock_${envPrefix}_default_token_${timestamp}_${random}`;
    // Token generated
    
    return {
      token,
      expiresIn: 3600,
      tokenType: 'Bearer',
      lobType: lobType
    };
  }
};