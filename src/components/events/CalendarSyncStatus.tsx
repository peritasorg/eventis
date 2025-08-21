import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarSyncStatusProps {
  hasExternalId?: boolean;
  onManualSync?: () => void;
  isSyncing?: boolean;
  variant?: 'full' | 'compact';
}

export const CalendarSyncStatus: React.FC<CalendarSyncStatusProps> = ({
  hasExternalId = false,
  onManualSync,
  isSyncing = false,
  variant = 'full'
}) => {
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : hasExternalId ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isSyncing ? 'Syncing to calendar...' : 
             hasExternalId ? 'Synced to calendar' : 'Not synced to calendar'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={hasExternalId ? "default" : "secondary"}>
        <Calendar className="h-3 w-3 mr-1" />
        {hasExternalId ? 'Calendar Synced' : 'Not Synced'}
      </Badge>
      {onManualSync && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Sync to Calendar
            </>
          )}
        </Button>
      )}
    </div>
  );
};