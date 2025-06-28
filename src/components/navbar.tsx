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
    <div className="fixed top-4 left-4 right-4 z-50">
      <div className="bg-card rounded-xl shadow-md border border-border px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Title - Empty for now */}
          <div className="flex items-center">
            {/* Logo space */}
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
              Gallery
            </Button>
            
            <Button
              variant={activeTab === "tester" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("tester")}
              className="flex items-center gap-2"
            >
              <TestTube2 className="w-4 h-4" />
              Tester
            </Button>
            
            <Button
              variant={activeTab === "routes" ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange("routes")}
              className="flex items-center gap-2"
            >
              <Route className="w-4 h-4" />
              Custom Routes
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
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}