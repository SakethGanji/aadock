import ComingSoon from './coming-soon'

interface GalleryProps {
  onNavigateToTester: () => void
}

export default function Gallery(_props: GalleryProps) {
  return <ComingSoon title="Gallery" />
}