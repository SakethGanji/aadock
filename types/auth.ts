export interface LoginConfig {
  username: string
  password: string
  parentProfile: string
  environment: string
  startCallParams: Record<string, any>
  devMode?: boolean
  localhostIframeUrl?: string
  localhostWebsocketUrl?: string
  selectedAccounts?: AccountTemplate[]
}

export interface ParentProfile {
  id: string
  name: string
  color: string
}

export interface Environment {
  id: string
  name: string
  url: string
  description: string
}

export interface CallTemplate {
  id: string
  name: string
  description: string
  params: Record<string, any>
}

export interface AccountTemplate {
  [key: string]: any
}
