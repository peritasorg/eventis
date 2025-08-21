import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, User, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  postcode?: string;
  notes?: string;
}

interface QuickViewCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export const QuickViewCustomerDialog: React.FC<QuickViewCustomerDialogProps> = ({
  open,
  onOpenChange,
  customer
}) => {
  const navigate = useNavigate();

  if (!customer) return null;

  const fullName = `${customer.first_name} ${customer.last_name}`;

  const handleViewFullProfile = () => {
    onOpenChange(false);
    navigate(`/customers/${customer.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Name */}
          <div className="text-center pb-4 border-b">
            <h2 className="text-xl font-semibold">{fullName}</h2>
          </div>
          
          {/* Contact Information */}
          <div className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm break-all">{customer.email}</span>
              </div>
            )}
            
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{customer.phone}</span>
              </div>
            )}
            
            {(customer.address || customer.postcode) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  {customer.address && <div>{customer.address}</div>}
                  {customer.postcode && <div>{customer.postcode}</div>}
                </div>
              </div>
            )}
          </div>
          
          {/* Notes */}
          {customer.notes && (
            <div className="pt-3 border-t">
              <h3 className="font-medium text-sm mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground">{customer.notes}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleViewFullProfile}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};