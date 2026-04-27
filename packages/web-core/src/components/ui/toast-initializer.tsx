import { useEffect } from 'react';
import { useToast } from './use-toast';
import { setGlobalToast } from '../../inertia';

export function ToastInitializer() {
  const { toast } = useToast();

  useEffect(() => {
    // Set the global toast function when component mounts
    setGlobalToast(toast);
  }, [toast]);

  // This component doesn't render anything
  return null;
}
