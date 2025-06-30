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
    id: "dev1",
    name: "dev1",
    url: "https://dev1-agent-assist.example.com",
    description: "Development environment 1",
  },
  {
    id: "dev2",
    name: "dev2",
    url: "https://dev2-agent-assist.example.com",
    description: "Development environment 2",
  },
  {
    id: "dev3",
    name: "dev3",
    url: "https://dev3-agent-assist.example.com",
    description: "Development environment 3",
  },
  {
    id: "uat1",
    name: "uat1",
    url: "https://uat1-agent-assist.example.com",
    description: "User Acceptance Testing 1",
  },
  {
    id: "uat2",
    name: "uat2",
    url: "https://uat2-agent-assist.example.com",
    description: "User Acceptance Testing 2",
  },
  {
    id: "uat3",
    name: "uat3",
    url: "https://uat3-agent-assist.example.com",
    description: "User Acceptance Testing 3",
  },
  {
    id: "perf",
    name: "perf",
    url: "https://perf-agent-assist.example.com",
    description: "Performance testing environment",
  },
]