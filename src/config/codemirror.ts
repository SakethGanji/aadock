import { json } from '@codemirror/lang-json'
import { lightTheme, darkTheme } from './codemirror-theme'

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
  isDarkMode ? darkTheme : lightTheme

export const jsonExtensions = [json()]