import jsPDF from 'jspdf';
import { Canvas as FabricCanvas } from 'fabric';

export interface CanvasObject {
  type: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  fill?: string;
  backgroundColor?: string;
  stroke?: string;
  strokeWidth?: number;
  textAlign?: string;
  objects?: CanvasObject[];
}

export interface CanvasData {
  version: string;
  objects: CanvasObject[];
  background?: string;
}

export const generateCanvasPDF = async (
  canvasData: CanvasData,
  documentType: 'quote' | 'invoice',
  eventId?: string
): Promise<void> => {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Scale factor to convert from canvas coordinates to PDF coordinates
  const scaleFactor = 1.25; // Adjust based on your canvas scale

  // Set background if specified
  if (canvasData.background && canvasData.background !== '#ffffff') {
    doc.setFillColor(canvasData.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // Process each canvas object
  for (const obj of canvasData.objects) {
    await renderObjectToPDF(doc, obj, scaleFactor);
  }

  // Replace variables with actual data
  await replaceVariablesInPDF(doc, eventId);

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${documentType}-${timestamp}.pdf`;

  // Download the PDF
  doc.save(filename);
};

const renderObjectToPDF = async (
  doc: jsPDF,
  obj: CanvasObject,
  scaleFactor: number
): Promise<void> => {
  const x = obj.left * scaleFactor;
  const y = obj.top * scaleFactor;

  switch (obj.type) {
    case 'i-text':
    case 'text':
      renderTextToPDF(doc, obj, x, y);
      break;
      
    case 'rect':
      renderRectToPDF(doc, obj, x, y, scaleFactor);
      break;
      
    case 'group':
      if (obj.objects) {
        for (const groupObj of obj.objects) {
          await renderObjectToPDF(doc, {
            ...groupObj,
            left: obj.left + (groupObj.left || 0),
            top: obj.top + (groupObj.top || 0)
          }, scaleFactor);
        }
      }
      break;
      
    default:
      console.warn(`Unsupported canvas object type: ${obj.type}`);
  }
};

const renderTextToPDF = (
  doc: jsPDF,
  obj: CanvasObject,
  x: number,
  y: number
): void => {
  if (!obj.text) return;

  // Set font properties
  let fontStyle = 'normal';
  if (obj.fontWeight === 'bold' || obj.fontWeight === 700) {
    fontStyle = obj.fontStyle === 'italic' ? 'bolditalic' : 'bold';
  } else if (obj.fontStyle === 'italic') {
    fontStyle = 'italic';
  }

  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(obj.fontSize || 12);

  // Set text color
  if (obj.fill) {
    const color = parseColor(obj.fill);
    doc.setTextColor(color.r, color.g, color.b);
  }

  // Handle multi-line text
  const lines = obj.text.split('\n');
  const lineHeight = (obj.fontSize || 12) * 1.2;

  lines.forEach((line, index) => {
    const lineY = y + (index * lineHeight);
    
    // Handle text alignment
    const alignment = obj.textAlign || 'left';
    if (alignment === 'center') {
      doc.text(line, x, lineY, { align: 'center' });
    } else if (alignment === 'right') {
      doc.text(line, x, lineY, { align: 'right' });
    } else {
      doc.text(line, x, lineY);
    }
  });
};

const renderRectToPDF = (
  doc: jsPDF,
  obj: CanvasObject,
  x: number,
  y: number,
  scaleFactor: number
): void => {
  const width = (obj.width || 100) * scaleFactor;
  const height = (obj.height || 50) * scaleFactor;

  // Set fill color if specified
  if (obj.fill || obj.backgroundColor) {
    const fillColor = parseColor(obj.fill || obj.backgroundColor || '#ffffff');
    doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
  }

  // Set stroke color if specified
  if (obj.stroke) {
    const strokeColor = parseColor(obj.stroke);
    doc.setDrawColor(strokeColor.r, strokeColor.g, strokeColor.b);
    doc.setLineWidth(obj.strokeWidth || 1);
  }

  // Draw rectangle
  const style = obj.fill ? (obj.stroke ? 'FD' : 'F') : (obj.stroke ? 'D' : '');
  if (style) {
    doc.rect(x, y, width, height, style);
  }
};

const parseColor = (colorString: string): { r: number; g: number; b: number } => {
  // Handle hex colors
  if (colorString.startsWith('#')) {
    const hex = colorString.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }
  
  // Handle hsl colors
  if (colorString.startsWith('hsl')) {
    // Simple hsl parsing - for production, use a proper color library
    return { r: 0, g: 0, b: 0 }; // Fallback to black
  }
  
  // Handle rgb colors
  if (colorString.startsWith('rgb')) {
    const matches = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (matches) {
      return {
        r: parseInt(matches[1]),
        g: parseInt(matches[2]),
        b: parseInt(matches[3])
      };
    }
  }
  
  // Fallback to black
  return { r: 0, g: 0, b: 0 };
};

const replaceVariablesInPDF = async (doc: jsPDF, eventId?: string): Promise<void> => {
  // This is a simplified version - in a real implementation,
  // you would fetch the event data and replace variables in the text
  
  if (!eventId) return;

  try {
    // Fetch event data from Supabase
    // const { data: event } = await supabase
    //   .from('events')
    //   .select('*')
    //   .eq('id', eventId)
    //   .single();

    // For now, just replace with placeholder data
    const variables = {
      '{business_name}': 'Your Business Name',
      '{customer_name}': 'Customer Name',
      '{event_date}': new Date().toLocaleDateString(),
      '{guest_count}': '50',
      '{total_amount}': '£1,250.00',
      '{current_date}': new Date().toLocaleDateString()
    };

    // In a real implementation, you would need to:
    // 1. Parse the PDF content
    // 2. Find and replace variable placeholders
    // 3. Re-render the affected text objects
    
    console.log('Variables to replace:', variables);
  } catch (error) {
    console.error('Error replacing variables:', error);
  }
};

export const createCanvasFromTemplate = async (
  canvas: FabricCanvas,
  templateData: CanvasData
): Promise<void> => {
  return new Promise((resolve) => {
    canvas.loadFromJSON(templateData, () => {
      canvas.renderAll();
      resolve();
    });
  });
};