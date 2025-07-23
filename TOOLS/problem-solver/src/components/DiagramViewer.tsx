import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';

interface DiagramViewerProps {
  mermaidCode: string;
  className?: string;
}

export function DiagramViewer({ mermaidCode, className }: DiagramViewerProps) {
  const diagramRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    if (mermaidCode && diagramRef.current) {
      renderDiagram();
    }
  }, [mermaidCode]);

  const renderDiagram = async () => {
    if (!diagramRef.current || !mermaidCode.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear previous content
      diagramRef.current.innerHTML = '';
      
      // Generate unique ID for this render
      const id = `mermaid-${Date.now()}`;
      
      // Render the diagram
      const { svg } = await mermaid.render(id, mermaidCode);
      diagramRef.current.innerHTML = svg;

      // Reset zoom and pan
      setZoom(1);
      setPan({ x: 0, y: 0 });
      
    } catch (err) {
      console.error('Mermaid render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
      diagramRef.current.innerHTML = '';
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.1), 3));
  };

  const handleDownloadImage = async () => {
    if (!diagramRef.current) return;

    try {
      const canvas = await html2canvas(diagramRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
      });
      
      const link = document.createElement('a');
      link.download = 'diagram.png';
      link.href = canvas.toDataURL();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <h2 className="text-lg font-semibold">Diagram Viewer</h2>
            {isLoading && (
              <div className="text-sm text-muted-foreground">Rendering...</div>
            )}
          </div>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.1}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetView}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              disabled={!mermaidCode.trim() || error !== null}
              className="h-8 w-8 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Zoom: {Math.round(zoom * 100)}% | Drag to pan | Scroll to zoom
        </div>
      </div>

      {/* Viewer */}
      <div 
        className="flex-1 overflow-hidden bg-white relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-700 mb-2">Diagram Error</h3>
              <p className="text-sm text-red-600 max-w-md mx-auto">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={renderDiagram}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : !mermaidCode.trim() ? (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <div>
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 mx-auto mb-4 flex items-center justify-center">
                <div className="h-6 w-6 rounded bg-muted-foreground/20" />
              </div>
              <p>No diagram to display</p>
              <p className="text-sm mt-1">
                Enter Mermaid code in the editor or ask the assistant for help
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={diagramRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          />
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Rendering diagram...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}