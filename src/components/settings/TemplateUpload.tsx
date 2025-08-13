import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WordTemplateGenerator } from '@/utils/wordTemplateGenerator';

interface TemplateUploadProps {
  onTemplateUploaded?: () => void;
}

export const TemplateUpload: React.FC<TemplateUploadProps> = ({ onTemplateUploaded }) => {
  const { currentTenant } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTenant) return;

    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a .docx file');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase storage
      const fileName = `${currentTenant.id}-template.docx`;
      const { error } = await supabase.storage
        .from('word-templates')
        .upload(fileName, file, {
          upsert: true
        });

      if (error) throw error;

      setCurrentTemplate(fileName);
      toast.success('Template uploaded successfully');
      
      // Analyze the template for placeholders
      await analyzeTemplate(fileName);
      
      onTemplateUploaded?.();
    } catch (error: any) {
      console.error('Error uploading template:', error);
      toast.error('Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const analyzeTemplate = async (templateName: string) => {
    setAnalyzing(true);
    try {
      const foundPlaceholders = await WordTemplateGenerator.analyzeTemplate(templateName);
      setPlaceholders(foundPlaceholders);
      
      if (foundPlaceholders.length > 0) {
        toast.success(`Found ${foundPlaceholders.length} placeholders in template`);
      }
    } catch (error) {
      console.error('Error analyzing template:', error);
      toast.error('Failed to analyze template');
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteTemplate = async () => {
    if (!currentTemplate || !currentTenant) return;

    try {
      const { error } = await supabase.storage
        .from('word-templates')
        .remove([currentTemplate]);

      if (error) throw error;

      setCurrentTemplate(null);
      setPlaceholders([]);
      toast.success('Template deleted successfully');
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Check if there's an existing template
  React.useEffect(() => {
    const checkExistingTemplate = async () => {
      if (!currentTenant) return;
      
      const fileName = `${currentTenant.id}-template.docx`;
      const { data } = await supabase.storage
        .from('word-templates')
        .list('', {
          search: fileName
        });
      
      if (data && data.length > 0) {
        setCurrentTemplate(fileName);
        await analyzeTemplate(fileName);
      }
    };

    checkExistingTemplate();
  }, [currentTenant]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice/Quote Template
        </CardTitle>
        <CardDescription>
          Upload a Word document (.docx) with content controls for generating invoices and quotes.
          Use placeholders like {'{business_name}'}, {'{customer_name}'}, {'{line_items}'} etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentTemplate ? (
          <div>
            <Label htmlFor="template-upload">Upload Template</Label>
            <div className="mt-2">
              <Input
                id="template-upload"
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            {uploading && (
              <p className="text-sm text-muted-foreground mt-2">
                Uploading template...
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Template uploaded</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteTemplate}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {analyzing && (
              <p className="text-sm text-muted-foreground">
                Analyzing template placeholders...
              </p>
            )}

            {placeholders.length > 0 && (
              <div>
                <Label className="text-sm font-medium">
                  Detected Placeholders ({placeholders.length})
                </Label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {placeholders.map((placeholder, index) => (
                      <code key={index} className="text-primary">
                        {'{' + placeholder + '}'}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Label htmlFor="replace-template">Replace Template</Label>
              <div className="mt-2">
                <Input
                  id="replace-template"
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};