import { useEffect, useRef } from 'react'
import { useDarkMode } from '../hooks/useDarkMode'

export default function ApiDocumentation() {
  const rapidocRef = useRef<HTMLElement>(null)
  const isDarkMode = useDarkMode()

  useEffect(() => {
    if (!rapidocRef.current) return

    const updateTheme = () => {
      if (rapidocRef.current) {
        rapidocRef.current.setAttribute('theme', isDarkMode ? 'dark' : 'light')
        rapidocRef.current.setAttribute('bg-color', isDarkMode ? '#0a0d1a' : '#f8f9fa')
        rapidocRef.current.setAttribute('text-color', isDarkMode ? '#e5e7eb' : '#1f2937')
        rapidocRef.current.setAttribute('primary-color', isDarkMode ? '#5b7fe1' : '#4169E1')
        rapidocRef.current.setAttribute('nav-bg-color', isDarkMode ? '#1a1f36' : '#e6edff')
        rapidocRef.current.setAttribute('nav-text-color', isDarkMode ? '#e5e7eb' : '#1f2937')
        rapidocRef.current.setAttribute('nav-hover-bg-color', isDarkMode ? '#2a3969' : '#e6edff')
        rapidocRef.current.setAttribute('nav-hover-text-color', isDarkMode ? '#ffffff' : '#4169E1')
      }
    }

    updateTheme()
  }, [isDarkMode])

  useEffect(() => {
    const loadRapidoc = () => {
      if (!customElements.get('rapi-doc')) {
        const script = document.createElement('script')
        script.type = 'module'
        script.src = 'https://unpkg.com/rapidoc/dist/rapidoc-min.js'
        document.head.appendChild(script)
      }
    }
    loadRapidoc()
  }, [])

  return (
    <div className="h-full w-full">
      <rapi-doc
        ref={rapidocRef}
        spec-url="/api-spec.json"
        render-style="view"
        style={{ height: '100%', width: '100%' }}
        show-header="false"
        allow-try="true"
        allow-authentication="true"
        allow-spec-url-load="false"
        allow-spec-file-load="false"
        allow-server-selection="true"
        show-info="true"
        nav-bg-color={isDarkMode ? '#1a1f36' : '#e6edff'}
        bg-color={isDarkMode ? '#0a0d1a' : '#f8f9fa'}
        text-color={isDarkMode ? '#e5e7eb' : '#1f2937'}
        primary-color={isDarkMode ? '#5b7fe1' : '#4169E1'}
        theme={isDarkMode ? 'dark' : 'light'}
        font-size="regular"
        mono-font="IBM Plex Mono, monospace"
        regular-font="DM Sans, sans-serif"
        use-path-in-nav-bar="true"
        show-method-in-nav-bar="as-colored-text"
        response-area-height="400px"
        nav-hover-bg-color={isDarkMode ? '#2a3969' : '#e6edff'}
        nav-hover-text-color={isDarkMode ? '#ffffff' : '#4169E1'}
        show-components="true"
        default-schema-tab="model"
        server-url=""
      />
    </div>
  )
}