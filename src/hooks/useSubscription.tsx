  import { useState, useEffect } from 'react';
  import { supabase } from '@/integrations/supabase/client';
  import { useAuth } from './useAuth';

  interface Subscription {
    tier: string;
    created_at: string;
    updated_at: string;
  }

  export const useSubscription = () => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      const fetchSubscription = async () => {
        try {
          const { data, error } = await supabase
            .from('user_subscriptions')
            .select('tier, created_at, updated_at')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
          }

          setSubscription(data || { tier: 'free', created_at: '', updated_at: '' });
          setError(null);
        } catch (err) {
          console.error('Error fetching subscription:', err);
          setError('Failed to fetch subscription');
          setSubscription({ tier: 'free', created_at: '', updated_at: '' });
        } finally {
          setLoading(false);
        }
      };

      fetchSubscription();
    }, [user]);

    const isPro = subscription?.tier === 'pro';
    const isFree = !subscription || subscription.tier === 'free';

    return {
      subscription,
      loading,
      error,
      isPro,
      isFree,
      tier: subscription?.tier || 'free'
    };
  };