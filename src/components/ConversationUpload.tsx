import { useState, useRef, useCallback } from 'react'
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Upload, File, Trash2, AlertCircle, CheckCircle, Eye, Download } from "lucide-react"
import type { Conversation } from "../data/message-templates"

interface ConversationUploadProps {
  onConversationAdded: (conversation: Conversation) => void
  existingConversations: Conversation[]
}

interface ValidationError {
  field: string
  message: string
}

export function ConversationUpload({ onConversationAdded, existingConversations }: ConversationUploadProps) {
  const [uploadedConversation, setUploadedConversation] = useState<Conversation | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateConversation = useCallback((data: any): { isValid: boolean; errors: ValidationError[] } => {
    const errors: ValidationError[] = []

    // Check required fields
    if (!data.id || typeof data.id !== 'string') {
      errors.push({ field: 'id', message: 'Must have a valid ID' })
    }
    if (!data.name || typeof data.name !== 'string') {
      errors.push({ field: 'name', message: 'Must have a valid name' })
    }
    if (!data.defaultDelay || typeof data.defaultDelay !== 'number' || data.defaultDelay < 0) {
      errors.push({ field: 'defaultDelay', message: 'Must have a valid defaultDelay' })
    }

    // Check if ID already exists
    if (data.id && existingConversations.some(c => c.id === data.id)) {
      errors.push({ field: 'id', message: `ID "${data.id}" already exists` })
    }

    // Validate messages array
    if (!Array.isArray(data.messages) || data.messages.length === 0) {
      errors.push({ field: 'messages', message: 'Must have at least one message' })
    } else {
      data.messages.forEach((msg: any, index: number) => {
        if (!msg.type || !['customer', 'agent'].includes(msg.type)) {
          errors.push({ field: `msg${index}`, message: `Message ${index + 1}: invalid type` })
        }
        if (!msg.text || typeof msg.text !== 'string') {
          errors.push({ field: `msg${index}`, message: `Message ${index + 1}: invalid text` })
        }
      })
    }

    return { isValid: errors.length === 0, errors }
  }, [existingConversations])

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        const { isValid, errors } = validateConversation(data)
        
        if (isValid) {
          setUploadedConversation(data as Conversation)
          setValidationErrors([])
          setShowPreview(true)
        } else {
          setValidationErrors(errors)
          setUploadedConversation(null)
          setShowPreview(false)
        }
      } catch (error) {
        setValidationErrors([{ field: 'file', message: 'Invalid JSON format' }])
        setUploadedConversation(null)
        setShowPreview(false)
      }
    }
    reader.readAsText(file)
  }, [validateConversation])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'))
    
    if (jsonFile) {
      handleFileUpload(jsonFile)
    } else {
      setValidationErrors([{ field: 'file', message: 'Please upload a JSON file' }])
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleAddConversation = useCallback(() => {
    if (uploadedConversation) {
      onConversationAdded(uploadedConversation)
      setUploadedConversation(null)
      setValidationErrors([])
      setShowPreview(false)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [uploadedConversation, onConversationAdded])

  const clearUpload = useCallback(() => {
    setUploadedConversation(null)
    setValidationErrors([])
    setShowPreview(false)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const generateSampleJSON = useCallback(() => {
    const sample: Conversation = {
      id: 'custom-sample-' + Date.now(),
      name: 'Sample Custom Conversation',
      description: 'A sample conversation to demonstrate the format',
      defaultDelay: 2000,
      messages: [
        { type: 'agent', text: 'Hello! How can I help you today?' },
        { type: 'customer', text: 'I have a question about my account', delay: 3000 },
        { type: 'agent', text: 'I\'d be happy to help with your account. What specific question do you have?' },
        { type: 'customer', text: 'I need to update my email address', delay: 2500 },
        { type: 'agent', text: 'I can help you update your email address. For security purposes, I\'ll need to verify your identity first.' }
      ]
    }

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample-conversation.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="space-y-3">
      {/* Compact File Upload Area */}
      <div
        className={`border-2 border-dashed rounded p-3 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/10' 
            : uploadedConversation 
              ? 'border-green-500 bg-green-50 dark:bg-green-950' 
              : validationErrors.length > 0 
                ? 'border-destructive bg-destructive/10' 
                : 'border-border hover:border-primary hover:bg-primary/5'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        {uploadedConversation ? (
          <div className="space-y-1">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
            <p className="text-xs font-medium text-green-700 dark:text-green-300">
              {uploadedConversation.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploadedConversation.messages.length} messages
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <File className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-xs font-medium">Drop JSON or click to browse</p>
          </div>
        )}
        
        <div className="flex gap-1 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs flex-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            Choose
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={generateSampleJSON}
            title="Download sample JSON"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="border border-destructive rounded p-2 bg-destructive/10">
          <div className="flex items-start gap-1">
            <AlertCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive">Validation Errors:</p>
              <ul className="text-xs text-destructive space-y-0.5 mt-1">
                {validationErrors.slice(0, 3).map((error, index) => (
                  <li key={index}>• {error.message}</li>
                ))}
                {validationErrors.length > 3 && (
                  <li>• ...and {validationErrors.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Preview */}
      {uploadedConversation && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Preview</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-3 h-3 mr-1" />
              {showPreview ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showPreview && (
            <div className="border border-border rounded p-2 bg-background max-h-32 overflow-y-auto">
              <div className="space-y-2">
                <div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs h-4">
                      {uploadedConversation.messages.length} msgs
                    </Badge>
                    <span className="text-xs font-medium">{uploadedConversation.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{uploadedConversation.description}</p>
                </div>
                
                <div className="space-y-1">
                  {uploadedConversation.messages.slice(0, 3).map((msg, index) => (
                    <div key={index} className={`text-xs p-2 rounded border ${
                      msg.type === 'customer' 
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100' 
                        : 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                    }`}>
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          msg.type === 'customer' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <span className="font-semibold text-xs uppercase tracking-wide">
                          {msg.type}
                        </span>
                      </div>
                      <span className="leading-relaxed">{msg.text.slice(0, 60)}...</span>
                    </div>
                  ))}
                  {uploadedConversation.messages.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      ...{uploadedConversation.messages.length - 3} more messages
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {uploadedConversation && (
        <div className="flex gap-1">
          <Button
            onClick={handleAddConversation}
            size="sm"
            className="flex-1 h-7 text-xs"
          >
            Add Conversation
          </Button>
          <Button
            variant="outline"
            onClick={clearUpload}
            size="sm"
            className="h-7 text-xs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  )
}