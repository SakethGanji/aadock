import { getEnvironmentConfig } from '../config/environment';
import { mockTokenService, type TokenResponse } from '../api/mock/token';

interface TokenAPIConfig {
  baseUrl: string;
  version: string;
  endpoints: {
    eclipse: string;
    olympus: string;
    sawgrass: string;
  };
}

// Token API configuration per environment
const TOKEN_API_CONFIG: Record<string, TokenAPIConfig> = {
  dev1: {
    baseUrl: 'https://dev1.example.com',
    version: 'v1',
    endpoints: {
      eclipse: '/auth/eclipse/token',
      olympus: '/auth/olympus/token',
      sawgrass: '/auth/sawgrass/token'
    }
  },
  dev2: {
    baseUrl: 'https://dev2.example.com',
    version: 'v1',
    endpoints: {
      eclipse: '/auth/eclipse/token',
      olympus: '/auth/olympus/token',
      sawgrass: '/auth/sawgrass/token'
    }
  },
  dev3: {
    baseUrl: 'https://dev3.example.com',
    version: 'v1',
    endpoints: {
      eclipse: '/auth/eclipse/token',
      olympus: '/auth/olympus/token',
      sawgrass: '/auth/sawgrass/token'
    }
  },
  uat1: {
    baseUrl: 'https://uat1.example.com',
    version: 'v1',
    endpoints: {
      eclipse: '/auth/eclipse/token',
      olympus: '/auth/olympus/token',
      sawgrass: '/auth/sawgrass/token'
    }
  },
  uat2: {
    baseUrl: 'https://uat2.example.com',
    version: 'v1',
    endpoints: {
      eclipse: '/auth/eclipse/token',
      olympus: '/auth/olympus/token',
      sawgrass: '/auth/sawgrass/token'
    }
  },
  uat3: {
    baseUrl: 'https://uat3.example.com',
    version: 'v1',
    endpoints: {
      eclipse: '/auth/eclipse/token',
      olympus: '/auth/olympus/token',
      sawgrass: '/auth/sawgrass/token'
    }
  },
  perf: {
    baseUrl: 'https://perf.example.com',
    version: 'v1',
    endpoints: {
      eclipse: '/auth/eclipse/token',
      olympus: '/auth/olympus/token',
      sawgrass: '/auth/sawgrass/token'
    }
  }
};

export class TokenService {
  async getToken(
    lobType: string, 
    credentials: { username: string; password: string; environment: string }
  ): Promise<TokenResponse> {
    const config = getEnvironmentConfig(credentials.environment);
    
    if (config.useMockAuth) {
      return mockTokenService.generateToken(lobType, credentials);
    }
    
    // Get API configuration for environment
    const apiConfig = TOKEN_API_CONFIG[credentials.environment];
    if (!apiConfig) {
      throw new Error(`No token API configuration found for environment: ${credentials.environment}`);
    }
    
    // Get endpoint for LOB type
    const endpoint = apiConfig.endpoints[lobType as keyof typeof apiConfig.endpoints];
    if (!endpoint) {
      throw new Error(`No token endpoint configured for LOB: ${lobType}`);
    }
    
    // Build full URL with version
    const url = `${apiConfig.baseUrl}/${apiConfig.version}${endpoint}`;
    
    // Real API call (to be implemented at work)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': apiConfig.version,
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        environment: credentials.environment
      })
    });
    
    if (!response.ok) {
      throw new Error(`Token generation failed: ${response.statusText}`);
    }
    
    return response.json();
  }
}