import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Loader2, Database, FileJson, ArrowRight, Copy, Check, Settings } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { mongoService } from '@/services/mongo-service'


interface Collection {
  id: string
  name: string
  icon: React.ReactNode
  result: any
  isLoading: boolean
}

export function MongoPage() {
  const [ucid, setUcid] = useState('UC123456789') // Pre-filled for demo
  const [interactionId, setInteractionId] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [copiedCollection, setCopiedCollection] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'split' | string>('split')
  
  const [collections, setCollections] = useState<Collection[]>([
    { id: 'interactions', name: 'Interactions', icon: <Database className="w-4 h-4" />, result: null, isLoading: false },
    { id: 'transcripts', name: 'Transcripts', icon: <FileJson className="w-4 h-4" />, result: null, isLoading: false },
    { id: 'config', name: 'Config', icon: <Settings className="w-4 h-4" />, result: null, isLoading: false },
  ])

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  // Auto-load dummy data on mount for demo
  useEffect(() => {
    if (ucid && !hasSearched) {
      handleSearch();
    }
  }, [])

  const updateCollectionLoading = (id: string, isLoading: boolean) => {
    setCollections(prev => prev.map(col => 
      col.id === id ? { ...col, isLoading } : col
    ))
  }

  const updateCollectionResult = (id: string, result: any) => {
    setCollections(prev => prev.map(col => 
      col.id === id ? { ...col, result } : col
    ))
  }

  const handleSearchCollection = async (collectionId: string) => {
    if (!ucid && !interactionId) return
    
    updateCollectionLoading(collectionId, true)
    try {
      let result
      switch (collectionId) {
        case 'interactions':
          result = await mongoService.searchInteractions(ucid, interactionId)
          break
        case 'transcripts':
          result = await mongoService.searchTranscripts(ucid, interactionId)
          break
        case 'config':
          // For now, mock the config search
          result = { configVersion: '1.0', settings: { theme: 'dark', language: 'en' } }
          break
        default:
          result = null
      }
      updateCollectionResult(collectionId, result)
    } catch (error) {
      console.error(`Error searching ${collectionId}:`, error)
      updateCollectionResult(collectionId, null)
    } finally {
      updateCollectionLoading(collectionId, false)
    }
  }

  const handleSearch = () => {
    setHasSearched(true)
    collections.forEach(col => handleSearchCollection(col.id))
  }

  const handleClear = () => {
    setUcid('')
    setInteractionId('')
    setCollections(prev => prev.map(col => ({ ...col, result: null })))
    setHasSearched(false)
  }

  const handleCopyJson = async (data: any, collectionName: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopiedCollection(collectionName)
      setTimeout(() => setCopiedCollection(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const renderJsonViewer = (data: any, isLoading: boolean, collectionName: string) => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Fetching {collectionName} data...</p>
        </div>
      )
    }
    
    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="p-4 rounded-full bg-muted/50">
            <FileJson className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">No data available</p>
            <p className="text-xs text-muted-foreground/70">Enter a UCID or Interaction ID to begin</p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="relative group h-full">
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopyJson(data, collectionName)}
            className="opacity-100 pointer-events-auto"
          >
            {copiedCollection === collectionName ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="h-full w-full overflow-auto">
          <CodeMirror
            value={JSON.stringify(data, null, 2)}
            height="100%"
            theme={isDarkMode ? oneDark : undefined}
            extensions={[json()]}
            editable={false}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: false,
              bracketMatching: true,
              closeBrackets: false,
              autocompletion: false,
              rectangularSelection: false,
              highlightSelectionMatches: false,
              searchKeymap: true,
            }}
            className="rounded-lg border"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Search Form */}
        <Card className="mb-8 border-0 shadow-lg bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Search Collections</CardTitle>
                <CardDescription className="mt-1">
                  Query by UCID or Interaction ID to explore both collections
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-stretch gap-6 mb-6">
              <div className="flex-1 space-y-2">
                <Label htmlFor="ucid" className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full" />
                  UCID
                </Label>
                <div className="relative">
                  <Input
                    id="ucid"
                    placeholder="e.g., UC123456789"
                    value={ucid}
                    onChange={(e) => {
                      setUcid(e.target.value)
                      if (e.target.value) setInteractionId('')
                    }}
                    className="h-12 px-4 bg-background/50 border-muted-foreground/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted to-transparent" />
                  <span className="relative bg-background px-4 py-2 text-sm font-medium text-muted-foreground rounded-full border">
                    OR
                  </span>
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <Label htmlFor="interactionId" className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full" />
                  Interaction ID
                </Label>
                <div className="relative">
                  <Input
                    id="interactionId"
                    placeholder="e.g., INT789012345"
                    value={interactionId}
                    onChange={(e) => {
                      setInteractionId(e.target.value)
                      if (e.target.value) setUcid('')
                    }}
                    className="h-12 px-4 bg-background/50 border-muted-foreground/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          
            <div className="flex gap-3">
              <Button 
                onClick={handleSearch}
                disabled={!ucid && !interactionId}
                size="lg"
                className="h-11 bg-primary hover:bg-primary/90 shadow-md transition-all duration-200 disabled:opacity-50"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Collections
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClear}
                size="lg"
                className="h-11 border-muted-foreground/20 hover:bg-muted/50 transition-colors"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Collection Tabs */}
        <div className="mb-4">
          <Tabs value={selectedView} onValueChange={setSelectedView}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="split">Split View</TabsTrigger>
              {collections.map(col => (
                <TabsTrigger key={col.id} value={col.id}>
                  {col.icon}
                  <span className="ml-2">{col.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Results Display */}
        <div className="h-[700px] lg:h-[700px] md:h-[900px]">
          {selectedView === 'split' ? (
            <ResizablePanelGroup 
              direction="horizontal" 
              className="rounded-lg h-full"
            >
              {collections.slice(0, 2).map((col, index) => (
                <React.Fragment key={col.id}>
                  {index > 0 && <ResizableHandle withHandle />}
                  <ResizablePanel defaultSize={50} minSize={5}>
                    <Card className="h-full border-0 shadow-lg bg-card/50 backdrop-blur overflow-hidden">
                      <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {col.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{col.name} Collection</CardTitle>
                            <CardDescription className="text-sm">MongoDB document from {col.id}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 h-[calc(100%-5rem)] overflow-hidden">
                        <div className="p-6 h-full overflow-hidden">
                          {renderJsonViewer(col.result, col.isLoading, col.id)}
                        </div>
                      </CardContent>
                    </Card>
                  </ResizablePanel>
                </React.Fragment>
              ))}
            </ResizablePanelGroup>
          ) : (
            <Card className="h-full border-0 shadow-lg bg-card/50 backdrop-blur overflow-hidden">
              {(() => {
                const collection = collections.find(col => col.id === selectedView)
                if (!collection) return null
                
                return (
                  <>
                    <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {collection.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{collection.name} Collection</CardTitle>
                          <CardDescription className="text-sm">MongoDB document from {collection.id}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 h-[calc(100%-5rem)] overflow-hidden">
                      <div className="p-6 h-full overflow-hidden">
                        {renderJsonViewer(collection.result, collection.isLoading, collection.id)}
                      </div>
                    </CardContent>
                  </>
                )
              })()}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}