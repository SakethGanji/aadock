import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'

export const defaultCodeMirrorSetup = {
  lineNumbers: true,
  foldGutter: true,
  dropCursor: true,
  allowMultipleSelections: true,
  indentOnInput: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  rectangularSelection: true,
  highlightSelectionMatches: true,
  searchKeymap: true,
}

export const getCodeMirrorTheme = (isDarkMode: boolean) => 
  isDarkMode ? oneDark : undefined

export const jsonExtensions = [json()]