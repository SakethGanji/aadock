import { EditorView } from '@codemirror/view'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Light theme colors based on your app
const lightColors = {
  background: '#f8f9fa',
  foreground: '#1f2937',
  selection: '#e6edff',
  selectionMatch: '#e6edff80',
  cursor: '#4169E1',
  lineNumber: '#6b7280',
  activeLineNumber: '#1f2937',
  activeLine: '#e6edff40',
  matchingBracket: '#4169E1',
  matchingBracketOutline: '#4169E180',
  gutter: '#f3f4f6',
  gutterBorder: '#e5e7eb',
  fold: '#6b7280',
  // Syntax colors
  keyword: '#4169E1',
  string: '#059669',
  number: '#dc2626',
  boolean: '#dc2626',
  null: '#6b7280',
  property: '#1f2937',
  operator: '#6b7280',
  comment: '#6b7280',
  punctuation: '#6b7280',
}

// Dark theme colors based on your app
const darkColors = {
  background: '#0a0d1a',
  foreground: '#e5e7eb',
  selection: '#2a3969',
  selectionMatch: '#2a396960',
  cursor: '#5b7fe1',
  lineNumber: '#9ca3af',
  activeLineNumber: '#e5e7eb',
  activeLine: '#1a1f3640',
  matchingBracket: '#5b7fe1',
  matchingBracketOutline: '#5b7fe180',
  gutter: '#1a1f36',
  gutterBorder: '#374151',
  fold: '#9ca3af',
  // Syntax colors
  keyword: '#5b7fe1',
  string: '#10b981',
  number: '#ef4444',
  boolean: '#ef4444',
  null: '#9ca3af',
  property: '#e5e7eb',
  operator: '#9ca3af',
  comment: '#9ca3af',
  punctuation: '#9ca3af',
}

// Create theme extension
const createTheme = (colors: typeof lightColors) => {
  const theme = EditorView.theme({
    '&': {
      color: colors.foreground,
      backgroundColor: colors.background,
      fontSize: '0.875rem',
    },
    '.cm-content': {
      caretColor: colors.cursor,
      fontFamily: 'IBM Plex Mono, monospace',
      padding: '12px',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: colors.cursor,
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: colors.selection,
    },
    '.cm-selectionBackground': {
      backgroundColor: colors.selection,
    },
    '.cm-searchMatch': {
      backgroundColor: colors.selectionMatch,
      outline: `1px solid ${colors.cursor}40`,
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: colors.selection,
    },
    '.cm-activeLine': {
      backgroundColor: colors.activeLine,
    },
    '.cm-activeLineGutter': {
      backgroundColor: colors.activeLine,
    },
    '.cm-gutters': {
      backgroundColor: colors.gutter,
      color: colors.lineNumber,
      borderRight: `1px solid ${colors.gutterBorder}`,
    },
    '.cm-gutter': {
      fontFamily: 'DM Sans, sans-serif',
    },
    '.cm-activeLineGutter': {
      color: colors.activeLineNumber,
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: colors.fold,
    },
    '.cm-matchingBracket': {
      backgroundColor: colors.matchingBracketOutline,
      outline: `1px solid ${colors.matchingBracket}`,
    },
    '.cm-nonmatchingBracket': {
      color: colors.number,
    },
    '.cm-tooltip': {
      backgroundColor: colors.background,
      color: colors.foreground,
      border: `1px solid ${colors.gutterBorder}`,
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: colors.gutterBorder,
      borderBottomColor: colors.gutterBorder,
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: colors.background,
      borderBottomColor: colors.background,
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: colors.selection,
        color: colors.foreground,
      },
    },
  })

  const highlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: colors.keyword },
    { tag: t.string, color: colors.string },
    { tag: t.number, color: colors.number },
    { tag: t.bool, color: colors.boolean },
    { tag: t.null, color: colors.null },
    { tag: t.propertyName, color: colors.property },
    { tag: t.operator, color: colors.operator },
    { tag: t.comment, color: colors.comment, fontStyle: 'italic' },
    { tag: t.punctuation, color: colors.punctuation },
    { tag: t.bracket, color: colors.punctuation },
  ])

  return [theme, syntaxHighlighting(highlightStyle)]
}

export const lightTheme = createTheme(lightColors)
export const darkTheme = createTheme(darkColors)