
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSupabaseQuery = (key: string[], queryFn: () => Promise<any>) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: key,
    queryFn,
    enabled: !!user,
  });
};

export const useSupabaseMutation = (mutationFn: (variables: any) => Promise<any>, options?: any) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((key: string[]) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      toast.error(error.message || 'An error occurred');
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};
