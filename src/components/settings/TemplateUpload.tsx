import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Trash2, Download, FileX } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WordTemplateGenerator } from '@/utils/wordTemplateGenerator';
import { generateEnhancedQuotePDF, generateEnhancedInvoicePDF } from '@/utils/enhancedPdfGenerator';

interface TemplateUploadProps {
  onTemplateUploaded?: () => void;
  templateType?: 'quote' | 'specification';
}

// Add tenantData prop interface
interface TenantData {
  business_name?: string;
}

export const TemplateUpload: React.FC<TemplateUploadProps> = ({ onTemplateUploaded, templateType = 'quote' }) => {
  const { currentTenant, user } = useAuth();
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'word' | 'pdf'>('word');
  const [isGenerating, setIsGenerating] = useState(false);

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
      const fileName = templateType === 'specification' 
        ? `${currentTenant.id}-specification-template.docx`
        : `${currentTenant.id}-template.docx`;
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


  const downloadTemplate = async () => {
    if (!currentTemplate || !currentTenant) return;

    if (outputFormat === 'word') {
      // Download original Word template
      try {
        const { data, error } = await supabase.storage
          .from('word-templates')
          .download(currentTemplate);

        if (error) throw error;

        // Create a download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tenantData?.business_name || 'template'}-document-template.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Word template downloaded successfully');
      } catch (error: any) {
        console.error('Error downloading template:', error);
        toast.error('Failed to download template');
      }
    } else {
      // Generate sample PDF using enhanced PDF generator
      await generateSamplePDF();
    }
  };

  const generateSamplePDF = async () => {
    if (!currentTenant) return;

    try {
      setIsGenerating(true);

      // Create sample data for PDF preview
      const sampleEventData = {
        id: 'sample-event-id',
        event_name: 'Sample Event Name',
        event_type: 'Wedding Reception',
        event_start_date: new Date().toISOString(),
        start_time: '18:00',
        end_time: '23:00',
        estimated_guests: 100,
        total_guests: 100,
        total_amount: 5000,
        deposit_amount: 1500,
        form_total: 3000,
        customers: {
          name: 'Sample Customer',
          email: 'customer@example.com',
          phone: '+44 1234 567890'
        }
      };

      const tenantData = {
        business_name: currentTenant.business_name || 'Your Business Name',
        address_line1: currentTenant.address_line1 || 'Business Address',
        address_line2: currentTenant.address_line2,
        city: currentTenant.city || 'City',
        postal_code: currentTenant.postal_code || 'Postal Code',
        country: currentTenant.country || 'GB',
        contact_email: currentTenant.contact_email || 'contact@business.com',
        contact_phone: currentTenant.contact_phone || 'Phone Number'
      };

      // Generate PDF sample
      await generateEnhancedQuotePDF(sampleEventData, tenantData, currentTenant.id);
      toast.success('Sample PDF generated successfully');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF sample');
    } finally {
      setIsGenerating(false);
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
      toast.success('Template deleted successfully');
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Check if there's an existing template and load tenant data
  React.useEffect(() => {
    const checkExistingTemplate = async () => {
      if (!currentTenant) return;
      
      const fileName = templateType === 'specification' 
        ? `${currentTenant.id}-specification-template.docx`
        : `${currentTenant.id}-template.docx`;
      const { data } = await supabase.storage
        .from('word-templates')
        .list('', {
          search: fileName
        });
      
      if (data && data.length > 0) {
        setCurrentTemplate(fileName);
      }
    };

    const loadTenantData = async () => {
      if (!currentTenant?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('business_name')
          .eq('id', currentTenant.id)
          .single();
        
        if (!error && data) {
          setTenantData(data);
        }
      } catch (error) {
        console.error('Error loading tenant data:', error);
      }
    };

    checkExistingTemplate();
    loadTenantData();
  }, [currentTenant]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {templateType === 'specification' ? 'Specification Template' : 'Invoice/Quote Template'}
        </CardTitle>
        <CardDescription>
          {templateType === 'specification' 
            ? 'Upload a Word document (.docx) for generating kitchen specifications. Use placeholders like {title}, {ethnicity}, {line_items} etc.'
            : 'Upload a Word document (.docx) with content controls for generating invoices and quotes. Use placeholders like {business_name}, {customer_name}, {line_items} etc.'
          }
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteTemplate}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Output Format Selection */}
            <div className="space-y-2">
              <Label>Download Format</Label>
              <Select value={outputFormat} onValueChange={(value: 'word' | 'pdf') => setOutputFormat(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select output format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Word Document (.docx)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileX className="h-4 w-4" />
                      PDF Document (.pdf)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Download Button */}
            <Button
              onClick={downloadTemplate}
              disabled={isGenerating}
              className="w-full flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating {outputFormat === 'word' ? 'Word' : 'PDF'}...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download as {outputFormat === 'word' ? 'Word' : 'PDF'}
                </>
              )}
            </Button>


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