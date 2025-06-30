"use client"

import { useState } from "react"
import LoginPage from "@/components/login-page"
import AgentAssistTester from "@/components/agent-assist-tester"
import Gallery from "@/components/gallery"
import CustomRoutes from "@/components/custom-routes"
import { MongoPage } from "@/components/mongo-page"
import Navbar from "@/components/navbar"
import { PARENT_PROFILES } from "@/components/pages/login/login-constants"
import type { LoginConfig } from "../types/auth"

type TabType = "gallery" | "tester" | "routes" | "mongo"

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loginConfig, setLoginConfig] = useState<LoginConfig | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>("tester")

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
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
            <Navbar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
            />
            
            {/* Main content */}
            <div className="relative">
                <div className={activeTab === "gallery" ? "block" : "hidden"}>
                    <Gallery />
                </div>
                
                <div className={activeTab === "tester" ? "block" : "hidden"}>
                    {!isLoggedIn || !loginConfig ? (
                        <LoginPage onLogin={handleLogin} />
                    ) : (
                        <AgentAssistTester 
                            config={loginConfig} 
                            profile={selectedProfile!} 
                            onLogout={handleLogout} 
                        />
                    )}
                </div>
                
                <div className={activeTab === "routes" ? "block" : "hidden"}>
                    <CustomRoutes />
                </div>
                
                <div className={activeTab === "mongo" ? "block" : "hidden"}>
                    <MongoPage />
                </div>
            </div>
        </div>
    )
}
