declare namespace JSX {
  interface IntrinsicElements {
    'rapi-doc': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      'spec-url'?: string
      'render-style'?: string
      'show-header'?: string
      'allow-try'?: string
      'allow-authentication'?: string
      'allow-spec-url-load'?: string
      'allow-spec-file-load'?: string
      'allow-server-selection'?: string
      'show-info'?: string
      'nav-bg-color'?: string
      'bg-color'?: string
      'text-color'?: string
      'primary-color'?: string
      'theme'?: string
      'font-size'?: string
      'mono-font'?: string
      'regular-font'?: string
      'use-path-in-nav-bar'?: string
      'show-method-in-nav-bar'?: string
      'response-area-height'?: string
      'nav-hover-bg-color'?: string
      'nav-hover-text-color'?: string
      'show-components'?: string
      'default-schema-tab'?: string
      'server-url'?: string
    }
  }
}