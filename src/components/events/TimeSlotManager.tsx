import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit3, Check, X } from 'lucide-react';
import { useEventTimeSlots, EventTimeSlot } from '@/hooks/useEventTimeSlots';

export const TimeSlotManager: React.FC = () => {
  const { timeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot, isCreating, isUpdating, isDeleting } = useEventTimeSlots();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({
    label: '',
    start_time: '',
    end_time: ''
  });
  const [editSlot, setEditSlot] = useState<Partial<EventTimeSlot>>({});

  const handleCreateSlot = () => {
    if (!newSlot.label || !newSlot.start_time || !newSlot.end_time) {
      return;
    }

    const nextSortOrder = Math.max(...(timeSlots?.map(slot => slot.sort_order) || [0])) + 1;
    
    createTimeSlot({
      label: newSlot.label,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      sort_order: nextSortOrder
    });

    setNewSlot({ label: '', start_time: '', end_time: '' });
    setIsAddingNew(false);
  };

  const handleUpdateSlot = (id: string) => {
    updateTimeSlot({
      id,
      ...editSlot
    });
    setEditingSlot(null);
    setEditSlot({});
  };

  const startEditing = (slot: EventTimeSlot) => {
    setEditingSlot(slot.id);
    setEditSlot({
      label: slot.label,
      start_time: slot.start_time,
      end_time: slot.end_time
    });
  };

  const cancelEditing = () => {
    setEditingSlot(null);
    setEditSlot({});
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Time Slot Management</CardTitle>
          <Button 
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Time Slot
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add New Time Slot Form */}
        {isAddingNew && (
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_label">Label</Label>
                  <Input
                    id="new_label"
                    value={newSlot.label}
                    onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
                    placeholder="e.g., Morning"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_start_time">Start Time</Label>
                  <Input
                    id="new_start_time"
                    type="time"
                    value={newSlot.start_time}
                    onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_end_time">End Time</Label>
                  <Input
                    id="new_end_time"
                    type="time"
                    value={newSlot.end_time}
                    onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button 
                  onClick={handleCreateSlot}
                  disabled={isCreating || !newSlot.label || !newSlot.start_time || !newSlot.end_time}
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewSlot({ label: '', start_time: '', end_time: '' });
                  }}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Time Slots */}
        <div className="space-y-3">
          {timeSlots?.map((slot) => (
            <Card key={slot.id} className="relative">
              <CardContent className="p-4">
                {editingSlot === slot.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={editSlot.label || ''}
                        onChange={(e) => setEditSlot({ ...editSlot, label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={editSlot.start_time || ''}
                        onChange={(e) => setEditSlot({ ...editSlot, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={editSlot.end_time || ''}
                        onChange={(e) => setEditSlot({ ...editSlot, end_time: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2 md:col-span-3">
                      <Button 
                        onClick={() => handleUpdateSlot(slot.id)}
                        disabled={isUpdating}
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {isUpdating ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={cancelEditing}
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary" className="text-sm">
                        {slot.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(slot)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTimeSlot(slot.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {(!timeSlots || timeSlots.length === 0) && !isAddingNew && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No time slots configured yet.</p>
            <p className="text-sm">Click "Add Time Slot" to create your first time slot.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
