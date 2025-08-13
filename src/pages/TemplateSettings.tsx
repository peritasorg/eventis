import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateUpload } from '@/components/settings/TemplateUpload';
import { FileText } from 'lucide-react';

export const TemplateSettings = () => {
  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <FileText className="h-8 w-8" />
          Document Templates
        </h1>
        <p className="text-muted-foreground">
          Upload and manage Word document templates for generating professional invoices and quotes
        </p>
      </div>

      <div className="max-w-4xl space-y-6">
        <TemplateUpload />
        
        <Card>
          <CardHeader>
            <CardTitle>Template Guidelines</CardTitle>
            <CardDescription>
              Follow these guidelines to create effective Word templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Supported Placeholders:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Business Information:</strong>
                  <ul className="list-disc list-inside ml-4 text-muted-foreground">
                    <li>{'{business_name}'}</li>
                    <li>{'{business_address}'}</li>
                    <li>{'{business_phone}'}</li>
                    <li>{'{business_email}'}</li>
                  </ul>
                </div>
                <div>
                  <strong>Customer Information:</strong>
                  <ul className="list-disc list-inside ml-4 text-muted-foreground">
                    <li>{'{customer_name}'}</li>
                    <li>{'{customer_address}'}</li>
                    <li>{'{customer_phone}'}</li>
                    <li>{'{customer_email}'}</li>
                  </ul>
                </div>
                <div>
                  <strong>Event Details:</strong>
                  <ul className="list-disc list-inside ml-4 text-muted-foreground">
                    <li>{'{event_name}'}</li>
                    <li>{'{event_date}'}</li>
                    <li>{'{event_time}'}</li>
                    <li>{'{guest_count}'}</li>
                  </ul>
                </div>
                <div>
                  <strong>Financial Information:</strong>
                  <ul className="list-disc list-inside ml-4 text-muted-foreground">
                    <li>{'{subtotal}'}</li>
                    <li>{'{total}'}</li>
                    <li>{'{deposit_amount}'}</li>
                    <li>{'{balance_due}'}</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Line Items Table:</h4>
              <p className="text-sm text-muted-foreground mb-2">
                For repeating line items, create a table with these content controls:
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono">
                {'{#line_items}'}<br/>
                {'{quantity}'} | {'{description}'} | {'{price}'}<br/>
                {'{/line_items}'}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Pro Tip:</h4>
              <p className="text-sm text-blue-800">
                Use Word's Developer tab to insert Content Controls for your placeholders. 
                This ensures proper formatting and makes your template more professional.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};