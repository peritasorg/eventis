import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FileText, FileSignature, FileBarChart } from 'lucide-react';

interface PDFPageManagerProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAddPage: () => void;
  onDeletePage: (page: number) => void;
}

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: 'main' | 'terms' | 'signature' | 'custom';
}

const pageTemplates: PageTemplate[] = [
  {
    id: 'main',
    name: 'Main Content',
    description: 'Quote/Invoice details, items, totals',
    icon: <FileBarChart className="h-4 w-4" />,
    type: 'main'
  },
  {
    id: 'terms',
    name: 'Terms & Conditions',
    description: 'Terms, conditions, disclaimers',
    icon: <FileText className="h-4 w-4" />,
    type: 'terms'
  },
  {
    id: 'signature',
    name: 'Signature Page',
    description: 'Signature fields, acceptance',
    icon: <FileSignature className="h-4 w-4" />,
    type: 'signature'
  }
];

export const PDFPageManager: React.FC<PDFPageManagerProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onAddPage,
  onDeletePage
}) => {
  const [pages, setPages] = React.useState<Array<{ id: number; type: string; name: string }>>([
    { id: 1, type: 'main', name: 'Main Content' }
  ]);

  const handleAddPageTemplate = (template: PageTemplate) => {
    const newPageId = pages.length + 1;
    setPages(prev => [...prev, {
      id: newPageId,
      type: template.type,
      name: template.name
    }]);
    onAddPage();
    onPageChange(newPageId);
  };

  const handleDeletePage = (pageId: number) => {
    if (pages.length <= 1) return; // Don't delete the last page
    
    setPages(prev => prev.filter(p => p.id !== pageId));
    onDeletePage(pageId);
  };

  return (
    <div className="space-y-4">
      {/* Current Pages */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Pages</h3>
        <div className="space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`flex items-center justify-between p-2 rounded-md border transition-colors cursor-pointer ${
                currentPage === page.id 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-card border-border hover:bg-muted/50'
              }`}
              onClick={() => onPageChange(page.id)}
            >
              <div className="flex items-center gap-2">
                <Badge variant={currentPage === page.id ? 'default' : 'outline'} className="text-xs">
                  {page.id}
                </Badge>
                <span className="text-sm font-medium">{page.name}</span>
              </div>
              
              {pages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePage(page.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Add Page Templates */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Add Page</h3>
        <div className="space-y-2">
          {pageTemplates.map((template) => {
            const alreadyExists = pages.some(p => p.type === template.type);
            
            return (
              <Button
                key={template.id}
                variant="outline"
                className="w-full justify-start h-auto p-3"
                onClick={() => handleAddPageTemplate(template)}
                disabled={alreadyExists && template.type !== 'custom'}
              >
                <div className="flex items-start gap-3 text-left">
                  {template.icon}
                  <div>
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                    {alreadyExists && template.type !== 'custom' && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Already added
                      </Badge>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Page Settings */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Page Settings</h3>
        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-medium">Page Size</div>
            <div className="text-muted-foreground">A4 (210 × 297 mm)</div>
          </div>
          
          <div className="text-sm">
            <div className="font-medium">Orientation</div>
            <div className="text-muted-foreground">Portrait</div>
          </div>
          
          <div className="text-sm">
            <div className="font-medium">Margins</div>
            <div className="text-muted-foreground">20mm all sides</div>
          </div>
        </div>
      </Card>
    </div>
  );
};