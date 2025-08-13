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
    if (!file || !currentTenant) {
      if (!currentTenant) {
        toast.error('Authentication required. Please refresh and try again.');
        console.error('Upload failed: No currentTenant available');
      }
      return;
    }

    if (!file.name.endsWith('.docx')) {
      toast.error('Please upload a .docx file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    
    // Enhanced logging for debugging
    console.log('=== UPLOAD DEBUG INFO ===');
    console.log('Current tenant:', currentTenant);
    console.log('User ID from auth:', supabase.auth.getUser());
    console.log('Session info:', supabase.auth.getSession());
    
    try {
      // Upload to Supabase storage
      const fileName = `${currentTenant.id}-template.docx`;
      console.log('Attempting upload with filename:', fileName);
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const { data, error } = await supabase.storage
        .from('word-templates')
        .upload(fileName, file, {
          upsert: true,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (error) {
        console.error('=== STORAGE UPLOAD ERROR ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        
        // More specific error handling
        if (error.message?.includes('row level security')) {
          toast.error('Security policy violation. Please contact support.');
          console.error('RLS Policy failed - filename pattern may not match policy requirements');
        } else if (error.message?.includes('denied')) {
          toast.error('Permission denied. Please check your account status.');
        } else if (error.message?.includes('network')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
        }
        return;
      }

      console.log('=== UPLOAD SUCCESSFUL ===');
      console.log('Upload response:', data);
      setCurrentTemplate(fileName);
      toast.success('✅ Template uploaded successfully!');
      
      // Analyze the template for placeholders
      await analyzeTemplate(fileName);
      
      onTemplateUploaded?.();
    } catch (error: any) {
      console.error('=== UNEXPECTED ERROR ===');
      console.error('Error object:', error);
      console.error('Error stack:', error.stack);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const analyzeTemplate = async (templateName: string) => {
    setAnalyzing(true);
    try {
      console.log('Analyzing template:', templateName);
      const foundPlaceholders = await WordTemplateGenerator.analyzeTemplate(templateName);
      setPlaceholders(foundPlaceholders);
      
      if (foundPlaceholders.length > 0) {
        toast.success(`✅ Found ${foundPlaceholders.length} placeholders in template`);
        console.log('Placeholders found:', foundPlaceholders);
      } else {
        toast.info('No placeholders detected. Make sure your template uses {placeholder} format.');
      }
    } catch (error: any) {
      console.error('Error analyzing template:', error);
      toast.error(`Failed to analyze template: ${error.message || 'Unknown error'}`);
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
              <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-700">
                  Uploading template... Please wait.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">✅ Template uploaded successfully</span>
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
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm text-blue-700">
                  Analyzing template placeholders...
                </p>
              </div>
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