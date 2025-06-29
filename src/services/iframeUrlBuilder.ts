import type { Environment } from '../../types/auth';

export function buildAgentAssistUrl(
  environment: Environment, 
  token: string, 
  parentApp: string
): string {
  const params = new URLSearchParams({
    appName: 'aadesktop',
    cat1: token,
    desktopview: parentApp.toLowerCase() // eclipse, olympus, or sawgrass
  });
  
  return `${environment.url}?${params.toString()}`;
}