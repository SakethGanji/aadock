export interface ApiEnvironment {
  name: string
  url: string
  type: 'cluster' | 'apigee' | 'local'
}

export const API_ENVIRONMENTS: ApiEnvironment[] = [
  {
    name: 'Local Development',
    url: 'http://localhost:3000/api',
    type: 'local'
  },
  {
    name: 'Dev Cluster',
    url: 'https://dev-cluster.example.com/api',
    type: 'cluster'
  },
  {
    name: 'Staging Apigee',
    url: 'https://staging-apigee.example.com/v1/api',
    type: 'apigee'
  },
  {
    name: 'Production Apigee',
    url: 'https://apigee.example.com/v1/api',
    type: 'apigee'
  }
]

export const getDefaultEnvironment = (): ApiEnvironment => {
  return API_ENVIRONMENTS[0] // Always default to Local Development
}