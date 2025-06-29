export interface EnvironmentConfig {
  useMockAuth: boolean;
  tokenAPIOverride?: string;
}

export const getEnvironmentConfig = (envId: string): EnvironmentConfig => {
  // For now, always use mock auth since we're in development
  // When deploying to work, change this to check for specific environments
  const isHomeComputer = true; // Change this to false when on work computer
  
  return {
    useMockAuth: isHomeComputer,
    // At work, replace with real token endpoints
    tokenAPIOverride: isHomeComputer ? undefined : 'https://api.company.com/auth/token'
  };
};