export interface ApiEnvironment {
  name: string
  url: string
  type: 'dev' | 'uat' | 'perf' | 'local'
  version?: string // API version for this environment
}

export const API_ENVIRONMENTS: ApiEnvironment[] = [
  {
    name: 'Dev1',
    url: 'https://dev1.example.com/api',
    type: 'dev',
    version: 'v1'
  },
  {
    name: 'Dev2',
    url: 'https://dev2.example.com/api',
    type: 'dev',
    version: 'v1'
  },
  {
    name: 'Dev3',
    url: 'https://dev3.example.com/api',
    type: 'dev',
    version: 'v1'
  },
  {
    name: 'UAT1',
    url: 'https://uat1.example.com/api',
    type: 'uat',
    version: 'v1'
  },
  {
    name: 'UAT2',
    url: 'https://uat2.example.com/api',
    type: 'uat',
    version: 'v1'
  },
  {
    name: 'UAT3',
    url: 'https://uat3.example.com/api',
    type: 'uat',
    version: 'v1'
  },
  {
    name: 'Performance',
    url: 'https://perf.example.com/api',
    type: 'perf',
    version: 'v1'
  }
]

export const getDefaultEnvironment = (): ApiEnvironment => {
  return API_ENVIRONMENTS[0] // Default to Dev1
}