import { Button } from "@/components/ui/button"
import { BookOpen, TestTube2, Route, LogOut, Moon, Sun } from "lucide-react"
import { useState, useEffect } from "react"

type TabType = "gallery" | "tester" | "routes"

interface NavbarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  isLoggedIn: boolean
  onLogout?: () => void
}

export default function Navbar({ activeTab, onTabChange, isLoggedIn, onLogout }: NavbarProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check if dark mode is already set
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center">
              <h1 className="text-lg font-semibold hidden sm:block">AA Desktop Sim</h1>
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
              <span className="hidden sm:inline">Gallery</span>
            </Button>
            
            <Button
              variant={activeTab === "tester" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("tester")}
              className="flex items-center gap-2"
            >
              <TestTube2 className="w-4 h-4" />
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