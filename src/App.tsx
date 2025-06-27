"use client"

import { useState } from "react"
import LoginPage from "@/components/login-page"
import AgentAssistTester from "@/components/agent-assist-tester"
import type { LoginConfig, ParentProfile } from "../types/auth"

const PARENT_PROFILES: ParentProfile[] = [
    {
        id: "sawgrass",
        name: "Sawgrass",
        color: "bg-blue-500",
        defaultBehaviors: {
            autoStartCall: true,
            tokenRefreshInterval: 30000,
            defaultToken: "sawgrass_token_123",
        },
    },
    {
        id: "olympus",
        name: "Olympus",
        color: "bg-green-500",
        defaultBehaviors: {
            autoStartCall: false,
            tokenRefreshInterval: 60000,
            defaultToken: "olympus_secure_456",
        },
    },
    {
        id: "eclipse",
        name: "Eclipse",
        color: "bg-purple-500",
        defaultBehaviors: {
            autoStartCall: true,
            tokenRefreshInterval: 45000,
            defaultToken: "eclipse_auth_789",
        },
    },
]

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loginConfig, setLoginConfig] = useState<LoginConfig | null>(null)

    const handleLogin = (config: LoginConfig) => {
        setLoginConfig(config)
        setIsLoggedIn(true)
    }

    const handleLogout = () => {
        setIsLoggedIn(false)
        setLoginConfig(null)
    }

    if (!isLoggedIn || !loginConfig) {
        return <LoginPage onLogin={handleLogin} />
    }

    const selectedProfile = PARENT_PROFILES.find((p) => p.id === loginConfig.parentProfile)!

    return <AgentAssistTester config={loginConfig} profile={selectedProfile} onLogout={handleLogout} />
}
