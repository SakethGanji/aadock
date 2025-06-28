import { Button } from "@/components/ui/button"
import { BookOpen, TestTube2, Route, LogOut } from "lucide-react"

type TabType = "gallery" | "tester" | "routes"

interface NavbarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  isLoggedIn: boolean
  onLogout?: () => void
}

export default function Navbar({ activeTab, onTabChange, isLoggedIn, onLogout }: NavbarProps) {
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
              <span className="hidden sm:inline">Tester</span>
            </Button>
            
            <Button
              variant={activeTab === "routes" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("routes")}
              className="flex items-center gap-2"
            >
              <Route className="w-4 h-4" />
              <span className="hidden sm:inline">Custom Routes</span>
            </Button>
          </nav>

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
  )
}