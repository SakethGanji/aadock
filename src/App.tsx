"use client"

import { useState } from "react"
import LoginPage from "@/components/login-page"
import AgentAssistTester from "@/components/agent-assist-tester"
import Gallery from "@/components/gallery"
import CustomRoutes from "@/components/custom-routes"
import Navbar from "@/components/navbar"
import type { LoginConfig, ParentProfile } from "../types/auth"

type TabType = "gallery" | "tester" | "routes"

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
    const [activeTab, setActiveTab] = useState<TabType>("gallery")

    const handleLogin = (config: LoginConfig) => {
        setLoginConfig(config)
        setIsLoggedIn(true)
        setActiveTab("tester") // Switch to tester after login
    }

    const handleLogout = () => {
        setIsLoggedIn(false)
        setLoginConfig(null)
        setActiveTab("gallery") // Return to gallery after logout
    }

    const selectedProfile = loginConfig ? PARENT_PROFILES.find((p) => p.id === loginConfig.parentProfile) : null

    return (
        <>
            <Navbar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
            />
            
            {/* Add padding to account for floating navbar */}
            <div className="pt-20">
                {activeTab === "gallery" && (
                    <Gallery onNavigateToTester={() => setActiveTab("tester")} />
                )}
                
                {activeTab === "tester" && (
                    <>
                        {!isLoggedIn || !loginConfig ? (
                            <LoginPage onLogin={handleLogin} />
                        ) : (
                            <AgentAssistTester 
                                config={loginConfig} 
                                profile={selectedProfile!} 
                                onLogout={handleLogout} 
                            />
                        )}
                    </>
                )}
                
                {activeTab === "routes" && (
                    <CustomRoutes />
                )}
            </div>
        </>
    )
}
