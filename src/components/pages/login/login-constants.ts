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
    name: "Development 1",
    url: "https://dev1-agent-assist.example.com",
    description: "Development environment 1",
  },
  {
    id: "dev2",
    name: "Development 2",
    url: "https://dev2-agent-assist.example.com",
    description: "Development environment 2",
  },
  {
    id: "dev3",
    name: "Development 3",
    url: "https://dev3-agent-assist.example.com",
    description: "Development environment 3",
  },
  {
    id: "uat1",
    name: "UAT 1",
    url: "https://uat1-agent-assist.example.com",
    description: "User Acceptance Testing 1",
  },
  {
    id: "uat2",
    name: "UAT 2",
    url: "https://uat2-agent-assist.example.com",
    description: "User Acceptance Testing 2",
  },
  {
    id: "uat3",
    name: "UAT 3",
    url: "https://uat3-agent-assist.example.com",
    description: "User Acceptance Testing 3",
  },
  {
    id: "perf",
    name: "Performance",
    url: "https://perf-agent-assist.example.com",
    description: "Performance testing environment",
  },
  {
    id: "local",
    name: "Local Mock",
    url: "/mock-child-app.html",
    description: "Local mock child app for development",
  },
]