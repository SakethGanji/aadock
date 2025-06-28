import type { ParentProfile, Environment } from "../../../../types/auth"

export const PARENT_PROFILES: ParentProfile[] = [
  {
    id: "eclipse",
    name: "Eclipse",
    color: "bg-secondary",
    defaultBehaviors: {
      autoStartCall: true,
      tokenRefreshInterval: 45000,
      defaultToken: "eclipse_auth_789",
    },
  },
  {
    id: "olympus",
    name: "Olympus",
    color: "bg-accent",
    defaultBehaviors: {
      autoStartCall: false,
      tokenRefreshInterval: 60000,
      defaultToken: "olympus_secure_456",
    },
  },
  {
    id: "sawgrass",
    name: "Sawgrass",
    color: "bg-primary",
    defaultBehaviors: {
      autoStartCall: true,
      tokenRefreshInterval: 30000,
      defaultToken: "sawgrass_token_123",
    },
  },
]

export const ENVIRONMENTS: Environment[] = [
  {
    id: "development",
    name: "Development",
    url: "https://dev-agent-assist.example.com",
    description: "Development environment for testing",
  },
  {
    id: "staging",
    name: "Staging",
    url: "https://staging-agent-assist.example.com",
    description: "Pre-production environment",
  },
  {
    id: "production",
    name: "Production",
    url: "https://agent-assist.example.com",
    description: "Live production environment",
  },
  {
    id: "local",
    name: "Local",
    url: "http://localhost:3000",
    description: "Local development server",
  },
]