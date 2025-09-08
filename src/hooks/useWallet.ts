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
    if (!user) return;

    const walletChannel = supabase
      .channel('wallet-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Wallet updated in real-time:', payload);
          setWallet(payload.new as Wallet);
          toast({
            title: "Wallet Updated",
            description: "Your wallet balance has been updated",
          });
        }
      )
      .subscribe();

    const transactionChannel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions'
        },
        async (payload) => {
          console.log('New transaction in real-time:', payload);
          // Check if this transaction belongs to current user's wallet
          if (wallet && payload.new.wallet_id === wallet.id) {
            // Add new transaction to the list
            setTransactions(prev => [payload.new as Transaction, ...prev]);
            
            // Show transaction notification
            const transaction = payload.new as Transaction;
            const isDebit = transaction.type === 'purchase';
            toast({
              title: `${transaction.type === 'deposit' ? 'Deposit' : transaction.type === 'purchase' ? 'Purchase' : 'Profit'} ${isDebit ? 'Completed' : 'Received'}`,
              description: `${isDebit ? '-' : '+'}$${transaction.amount} ${transaction.metadata?.tokens ? `• ${transaction.metadata.tokens} tokens` : ''}`,
            });
          } else if (!wallet) {
            // If wallet not loaded, check if this transaction belongs to user
            const { data: walletData } = await supabase
              .from('wallets')
              .select('user_id')
              .eq('id', payload.new.wallet_id)
              .single();
            
            if (walletData?.user_id === user.id) {
              fetchWalletData(user);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user, wallet]);

  const depositToWallet = async (amount: number) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('deposit_to_wallet', {
        p_amount: amount
      });

      if (error) throw error;

      // Optimistically update wallet balance
      if (wallet) {
        setWallet(prev => prev ? { ...prev, balance: data } : null);
      }

      return data;
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to deposit funds",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const purchaseTokens = async (propertyId: string, tokens: number) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('purchase_tokens', {
        p_property_id: propertyId,
        p_tokens: tokens
      });

      if (error) throw error;

      // The real-time subscription will handle the UI updates
      
      return data;
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase tokens",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
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