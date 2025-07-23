import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, FileText, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MermaidEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onRender: (code: string) => void;
  className?: string;
}

export function MermaidEditor({ code, onCodeChange, onRender, className }: MermaidEditorProps) {
  const [localCode, setLocalCode] = useState(code);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalCode(code);
    setHasChanges(false);
  }, [code]);

  const handleCodeChange = (value: string) => {
    setLocalCode(value);
    setHasChanges(value !== code);
    onCodeChange(value);
  };

  const handleRender = () => {
    onRender(localCode);
    setHasChanges(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localCode);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadMarkdown = () => {
    const markdown = `# Diagram\n\n\`\`\`mermaid\n${localCode}\n\`\`\`\n`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const defaultMermaidCode = `graph TB
    A[Start Here] --> B{Need Help?}
    B -->|Yes| C[Ask the Assistant]
    B -->|No| D[Edit the Code]
    C --> E[Get Diagram Suggestion]
    D --> F[Click Render]
    E --> F
    F --> G[View Diagram]`;

  const currentCode = localCode || defaultMermaidCode;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Mermaid Editor</h2>
            {hasChanges && (
              <div className="h-2 w-2 rounded-full bg-orange-500" />
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMarkdown}
              className="h-8"
            >
              <Download className="h-3 w-3 mr-1" />
              MD
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4">
        <Textarea
          value={currentCode}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="h-full font-mono text-sm resize-none"
          placeholder="Enter Mermaid diagram code here..."
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Lines: {currentCode.split('\n').length} | 
            Chars: {currentCode.length}
          </div>
          <Button
            onClick={handleRender}
            disabled={!hasChanges}
            size="sm"
            className="ml-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Render
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Edit the Mermaid code above and click Render to update the diagram
        </div>
      </div>
    </div>
  );
}