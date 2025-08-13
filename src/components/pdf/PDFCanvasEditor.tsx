import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Text, Rect, IText } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PDFCanvasToolbar } from './PDFCanvasToolbar';
import { PDFPageManager } from './PDFPageManager';
import { usePDFTemplate } from '@/hooks/usePDFTemplate';
import { generateCanvasPDF } from '@/utils/canvasPdfGenerator';
import { toast } from 'sonner';
import { Eye, Download, Save } from 'lucide-react';

interface PDFCanvasEditorProps {
  eventId?: string;
}

export const PDFCanvasEditor: React.FC<PDFCanvasEditorProps> = ({ eventId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [documentType, setDocumentType] = useState<'quote' | 'invoice'>('quote');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'table' | 'image'>('select');
  
  const { template, saveTemplate, isLoading } = usePDFTemplate(eventId, documentType);

  // A4 dimensions in pixels at 72 DPI (matches jsPDF)
  const A4_WIDTH = 595;
  const A4_HEIGHT = 842;
  const SCALE_FACTOR = 0.8; // Scale for better UI display

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: A4_WIDTH * SCALE_FACTOR,
      height: A4_HEIGHT * SCALE_FACTOR,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    // Set canvas zoom and viewport
    canvas.setZoom(SCALE_FACTOR);

    setFabricCanvas(canvas);

    // Load default template if available
    if (template?.sections) {
      try {
        canvas.loadFromJSON(template.sections as any, () => {
          canvas.renderAll();
        });
      } catch (error) {
        console.error('Error loading template:', error);
        createDefaultTemplate(canvas);
      }
    } else {
      // Create default template
      createDefaultTemplate(canvas);
    }

    return () => {
      canvas.dispose();
    };
  }, [template]);

  const createDefaultTemplate = (canvas: FabricCanvas) => {
    // Header section
    const header = new Rect({
      left: 40,
      top: 40,
      width: A4_WIDTH - 80,
      height: 80,
      fill: 'hsl(215 85% 55%)',
      selectable: false,
    });

    const businessName = new IText('Your Business Name', {
      left: 60,
      top: 65,
      fontSize: 24,
      fill: 'white',
      fontWeight: 'bold',
      selectable: true,
    });

    const documentTitle = new IText(`${documentType.toUpperCase()}`, {
      left: A4_WIDTH - 150,
      top: 65,
      fontSize: 20,
      fill: 'white',
      fontWeight: 'bold',
      selectable: true,
    });

    // Customer info section
    const customerLabel = new IText('Bill To:', {
      left: 60,
      top: 160,
      fontSize: 14,
      fontWeight: 'bold',
      selectable: true,
    });

    const customerInfo = new IText('Customer Name\nCustomer Address\nCity, State ZIP', {
      left: 60,
      top: 180,
      fontSize: 12,
      selectable: true,
    });

    // Document info
    const docInfoLabel = new IText(`${documentType} Info:`, {
      left: 350,
      top: 160,
      fontSize: 14,
      fontWeight: 'bold',
      selectable: true,
    });

    const docInfo = new IText(`${documentType} #: 001\nDate: {current_date}\nEvent Date: {event_date}`, {
      left: 350,
      top: 180,
      fontSize: 12,
      selectable: true,
    });

    // Add all elements to canvas
    canvas.add(header, businessName, documentTitle, customerLabel, customerInfo, docInfoLabel, docInfo);
    canvas.renderAll();
  };

  const handleAddText = () => {
    if (!fabricCanvas) return;

    const text = new IText('Click to edit text', {
      left: 100,
      top: 300,
      fontSize: 14,
      selectable: true,
      editable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  const handleAddTable = () => {
    if (!fabricCanvas) return;

    // Create a simple table using rectangles and text
    const tableHeader = new Rect({
      left: 60,
      top: 350,
      width: A4_WIDTH - 120,
      height: 30,
      fill: 'hsl(215 14% 96%)',
      stroke: 'hsl(214 32% 91%)',
      strokeWidth: 1,
    });

    const headerText = new IText('Description                                           Qty     Price     Total', {
      left: 70,
      top: 365,
      fontSize: 12,
      fontWeight: 'bold',
      selectable: true,
    });

    fabricCanvas.add(tableHeader, headerText);
    fabricCanvas.renderAll();
  };

  const handleSaveTemplate = async () => {
    if (!fabricCanvas) return;

    try {
      const canvasData = fabricCanvas.toJSON();
      await saveTemplate({
        document_type: documentType,
        name: `${documentType} Template`,
        sections: canvasData,
        styling: {},
        page_settings: { size: 'A4', orientation: 'portrait' },
        active: true,
      });
      toast.success('Template saved successfully');
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleGeneratePDF = async () => {
    if (!fabricCanvas) return;

    setIsGenerating(true);
    try {
      const canvasData = fabricCanvas.toJSON();
      await generateCanvasPDF(canvasData, documentType, eventId);
      toast.success(`${documentType} generated successfully`);
    } catch (error) {
      toast.error(`Failed to generate ${documentType}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    // Toggle between edit and preview mode
    if (!fabricCanvas) return;
    
    const isInEditMode = fabricCanvas.selection;
    fabricCanvas.selection = !isInEditMode;
    fabricCanvas.getObjects().forEach(obj => {
      obj.selectable = !isInEditMode;
    });
    fabricCanvas.renderAll();
    
    toast.info(isInEditMode ? 'Preview mode enabled' : 'Edit mode enabled');
  };

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Left Sidebar - Tools */}
      <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto">
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="space-y-4">
            <PDFCanvasToolbar
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onAddText={handleAddText}
              onAddTable={handleAddTable}
              canvas={fabricCanvas}
            />
            
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Document Type</h3>
              <div className="flex gap-2">
                <Button
                  variant={documentType === 'quote' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDocumentType('quote')}
                >
                  Quote
                </Button>
                <Button
                  variant={documentType === 'invoice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDocumentType('invoice')}
                >
                  Invoice
                </Button>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="pages">
            <PDFPageManager
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onAddPage={() => setTotalPages(prev => prev + 1)}
              onDeletePage={(page) => {
                if (totalPages > 1) {
                  setTotalPages(prev => prev - 1);
                  if (currentPage > totalPages - 1) {
                    setCurrentPage(totalPages - 1);
                  }
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Toolbar */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Page {currentPage} of {totalPages}
              </Badge>
              <Badge variant={documentType === 'quote' ? 'default' : 'secondary'}>
                {documentType.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveTemplate}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button 
                size="sm" 
                onClick={handleGeneratePDF}
                disabled={isGenerating}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : `Download ${documentType}`}
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 p-8 bg-muted/20 overflow-auto">
          <div className="flex justify-center">
            <div className="bg-white shadow-elegant rounded-lg p-8">
              <canvas ref={canvasRef} className="border border-border/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};