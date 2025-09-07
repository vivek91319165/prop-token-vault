import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  metadata: any;
  purchase_id: string | null;
  property_id: string | null;
  status: string;
  created_at: string;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWalletData = async (currentUser: User) => {
    try {
      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      setWallet(walletData);

      if (walletData) {
        // Fetch transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false });

        if (transactionsError) throw transactionsError;
        setTransactions(transactionsData || []);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWalletData(user);
    } else {
      setWallet(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user || !wallet) return;

    const walletChannel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setWallet(payload.new as Wallet);
          }
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('transaction-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `wallet_id=eq.${wallet.id}`,
        },
        (payload) => {
          setTransactions(prev => [payload.new as Transaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [user, wallet]);

  const depositToWallet = async (amount: number) => {
    try {
      const { data, error } = await supabase.rpc('deposit_to_wallet', {
        p_amount: amount
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `$${amount} deposited to your wallet`,
      });

      return data;
    } catch (error) {
      console.error('Error depositing to wallet:', error);
      toast({
        title: "Error",
        description: "Failed to deposit to wallet",
        variant: "destructive",
      });
      throw error;
    }
  };

  const purchaseTokens = async (propertyId: string, tokens: number) => {
    try {
      const { data, error } = await supabase.rpc('purchase_tokens', {
        p_property_id: propertyId,
        p_tokens: tokens
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully purchased ${tokens} tokens`,
      });

      return data;
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase tokens",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    wallet,
    transactions,
    loading,
    depositToWallet,
    purchaseTokens,
    refetch: () => user && fetchWalletData(user),
  };
};