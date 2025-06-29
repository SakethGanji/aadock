interface GalleryProps {
  onNavigateToTester: () => void
}

export default function Gallery({ onNavigateToTester: _onNavigateToTester }: GalleryProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <h2 className="text-2xl font-semibold mb-2">Gallery</h2>
        <p>Coming soon...</p>
      </div>
    </div>
  )
}