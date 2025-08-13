import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Canvas as FabricCanvas } from 'fabric';
import { 
  MousePointer, 
  Type, 
  Table, 
  Image, 
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Trash2
} from 'lucide-react';

interface PDFCanvasToolbarProps {
  activeTool: 'select' | 'text' | 'table' | 'image';
  onToolChange: (tool: 'select' | 'text' | 'table' | 'image') => void;
  onAddText: () => void;
  onAddTable: () => void;
  canvas: FabricCanvas | null;
}

export const PDFCanvasToolbar: React.FC<PDFCanvasToolbarProps> = ({
  activeTool,
  onToolChange,
  onAddText,
  onAddTable,
  canvas
}) => {
  const [selectedObject, setSelectedObject] = React.useState<any>(null);
  const [fontSize, setFontSize] = React.useState(14);
  const [textColor, setTextColor] = React.useState('#000000');

  React.useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      setSelectedObject(activeObject);
      
      if (activeObject && activeObject.type === 'i-text') {
        setFontSize((activeObject as any).fontSize || 14);
        const fill = (activeObject as any).fill;
        setTextColor(typeof fill === 'string' ? fill : '#000000');
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared');
    };
  }, [canvas]);

  const handleFontSizeChange = (newSize: number) => {
    if (!canvas || !selectedObject || selectedObject.type !== 'i-text') return;
    
    selectedObject.set('fontSize', newSize);
    setFontSize(newSize);
    canvas.renderAll();
  };

  const handleColorChange = (newColor: string) => {
    if (!canvas || !selectedObject) return;
    
    selectedObject.set('fill', newColor);
    setTextColor(newColor);
    canvas.renderAll();
  };

  const handleAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!canvas || !selectedObject || selectedObject.type !== 'i-text') return;
    
    selectedObject.set('textAlign', alignment);
    canvas.renderAll();
  };

  const handleTextStyle = (style: 'bold' | 'italic') => {
    if (!canvas || !selectedObject || selectedObject.type !== 'i-text') return;
    
    if (style === 'bold') {
      const currentWeight = selectedObject.fontWeight || 'normal';
      selectedObject.set('fontWeight', currentWeight === 'bold' ? 'normal' : 'bold');
    } else if (style === 'italic') {
      const currentStyle = selectedObject.fontStyle || 'normal';
      selectedObject.set('fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
    }
    
    canvas.renderAll();
  };

  const handleDelete = () => {
    if (!canvas || !selectedObject) return;
    
    canvas.remove(selectedObject);
    canvas.renderAll();
  };

  return (
    <div className="space-y-4">
      {/* Tool Selection */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={activeTool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('select')}
          >
            <MousePointer className="h-4 w-4 mr-2" />
            Select
          </Button>
          <Button
            variant={activeTool === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              onToolChange('text');
              onAddText();
            }}
          >
            <Type className="h-4 w-4 mr-2" />
            Text
          </Button>
          <Button
            variant={activeTool === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              onToolChange('table');
              onAddTable();
            }}
          >
            <Table className="h-4 w-4 mr-2" />
            Table
          </Button>
          <Button
            variant={activeTool === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('image')}
          >
            <Image className="h-4 w-4 mr-2" />
            Image
          </Button>
        </div>
      </Card>

      {/* Object Properties */}
      {selectedObject && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Properties</h3>
          
          {selectedObject.type === 'i-text' && (
            <div className="space-y-4">
              {/* Font Size */}
              <div>
                <Label htmlFor="fontSize">Font Size</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                  min="8"
                  max="72"
                />
              </div>

              {/* Text Color */}
              <div>
                <Label htmlFor="textColor">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="textColor"
                    type="color"
                    value={textColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-8 p-0 border rounded"
                  />
                  <Input
                    value={textColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Text Formatting */}
              <div>
                <Label>Formatting</Label>
                <div className="flex gap-1 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTextStyle('bold')}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTextStyle('italic')}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <Label>Alignment</Label>
                <div className="flex gap-1 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAlignment('left')}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAlignment('center')}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAlignment('right')}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Separator className="my-4" />
          
          {/* Delete Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Object
          </Button>
        </Card>
      )}

      {/* Variables */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Variables</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>{'{'} business_name {'}'}</div>
          <div>{'{'} customer_name {'}'}</div>
          <div>{'{'} event_date {'}'}</div>
          <div>{'{'} guest_count {'}'}</div>
          <div>{'{'} total_amount {'}'}</div>
          <div>{'{'} current_date {'}'}</div>
        </div>
      </Card>
    </div>
  );
};