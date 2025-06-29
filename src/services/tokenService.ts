import { getEnvironmentConfig } from '../config/environment';
import { mockTokenService, type TokenResponse } from '../api/mock/token';

export class TokenService {
  async getToken(
    lobType: string, 
    credentials: { username: string; password: string; environment: string }
  ): Promise<TokenResponse> {
    const config = getEnvironmentConfig(credentials.environment);
    
    if (config.useMockAuth) {
      return mockTokenService.generateToken(lobType, credentials);
    }
    
    // Real API call (to be implemented at work)
    const response = await fetch(config.tokenAPIOverride!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lobType,
        ...credentials
      })
    });
    
    if (!response.ok) {
      throw new Error(`Token generation failed: ${response.statusText}`);
    }
    
    return response.json();
  }
}