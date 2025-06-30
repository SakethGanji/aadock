import { Button } from "@/components/ui/button"
import { BookOpen, Monitor, Route, LogOut, Moon, Sun, Database } from "lucide-react"
import { useState, useEffect } from "react"

type TabType = "gallery" | "tester" | "routes" | "mongo"

interface NavbarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  isLoggedIn: boolean
  onLogout?: () => void
}

export default function Navbar({ activeTab, onTabChange, isLoggedIn, onLogout }: NavbarProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check localStorage first, then fall back to current DOM state
    const savedTheme = localStorage.getItem('theme')
    const isDarkMode = savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'))
    
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <div className="bg-primary text-primary-foreground rounded p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18m-4-4l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-foreground hidden sm:block">
                  AA <span className="text-primary">Dock</span>
                </span>
              </h1>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1">
            <Button
              variant={activeTab === "gallery" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("gallery")}
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Info</span>
            </Button>
            
            <Button
              variant={activeTab === "tester" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("tester")}
              className="flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            
            <Button
              variant={activeTab === "routes" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("routes")}
              className="flex items-center gap-2"
            >
              <Route className="w-4 h-4" />
              <span className="hidden sm:inline">Routes</span>
            </Button>
            
            <Button
              variant={activeTab === "mongo" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("mongo")}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Mongo</span>
            </Button>
          </nav>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="w-9 h-9"
              >
                {isDark ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>

              {/* Logout Button */}
              {isLoggedIn && onLogout && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}