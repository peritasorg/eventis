
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone, Mail, User, Building, Clock, MapPin, Edit, Save, X } from 'lucide-react';
import { useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LeadDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  onUpdate: () => void;
}

export const LeadDetailsDialog: React.FC<LeadDetailsDialogProps> = ({
  open,
  onOpenChange,
  lead,
  onUpdate
}) => {
  const { currentTenant } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // Initialize form data when lead changes or dialog opens
  useEffect(() => {
    if (lead && open) {
      console.log('Lead data received:', lead);
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        event_type: lead.event_type || '',
        event_date: lead.event_date || '',
        estimated_guests: lead.estimated_guests || '',
        estimated_budget: lead.estimated_budget || '',
        status: lead.status || 'new',
        source: lead.source || 'website',
        notes: lead.notes || ''
      });
    }
  }, [lead, open]);

  const updateLeadMutation = useSupabaseMutation(
    async (updatedData: any) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updatedData)
        .eq('id', lead.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      successMessage: 'Lead updated successfully!',
      onSuccess: () => {
        setIsEditing(false);
        onUpdate();
      }
    }
  );

  const handleSave = () => {
    const updateData = {
      ...formData,
      event_date: formData.event_date || null,
      estimated_guests: formData.estimated_guests ? parseInt(formData.estimated_guests.toString()) : null,
      estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget.toString()) : null,
    };
    
    updateLeadMutation.mutate(updateData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'converted': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-12">
            <span>Lead Details</span>
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(formData.status as string)}>
                {(formData.status as string)?.charAt(0).toUpperCase() + (formData.status as string)?.slice(1)}
              </Badge>
              {!isEditing ? (
                <Button size="sm" onClick={() => setIsEditing(true)} className="flex items-center gap-1">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={updateLeadMutation.isPending} className="flex items-center gap-1">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: lead.name || '',
                      email: lead.email || '',
                      phone: lead.phone || '',
                      company: lead.company || '',
                      event_type: lead.event_type || '',
                      event_date: lead.event_date || '',
                      estimated_guests: lead.estimated_guests || '',
                      estimated_budget: lead.estimated_budget || '',
                      status: lead.status || 'new',
                      source: lead.source || 'website',
                      notes: lead.notes || ''
                    });
                  }} className="flex items-center gap-1">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type</Label>
                <Select
                  value={formData.event_type as string || ''}
                  onValueChange={(value) => setFormData({...formData, event_type: value})}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="corporate">Corporate Event</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_date">Event Date</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date as string || ''}
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_guests">Estimated Guests</Label>
                <Input
                  id="estimated_guests"
                  type="number"
                  value={formData.estimated_guests || ''}
                  onChange={(e) => setFormData({...formData, estimated_guests: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_budget">Estimated Budget (£)</Label>
                <Input
                  id="estimated_budget"
                  type="number"
                  step="0.01"
                  value={formData.estimated_budget || ''}
                  onChange={(e) => setFormData({...formData, estimated_budget: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* Lead Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lead Management</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status as string || ''}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source as string || ''}
                  onValueChange={(value) => setFormData({...formData, source: value})}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk_in">Walk In</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes as string || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                disabled={!isEditing}
                rows={4}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2 text-sm text-gray-600">
            <p>Created: {new Date(lead.created_at).toLocaleDateString()}</p>
            {lead.updated_at && (
              <p>Last Updated: {new Date(lead.updated_at).toLocaleDateString()}</p>
            )}
            {lead.last_contacted_at && (
              <p>Last Contacted: {new Date(lead.last_contacted_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
