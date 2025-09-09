import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, Clock, Check, Plus } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  status: string;
  metadata?: any;
}

export const WalletCard = () => {
  const { wallet, transactions, loading, depositToWallet } = useWallet();
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const { toast } = useToast();

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsDepositing(true);
    try {
      await depositToWallet(amount);
      setDepositAmount("");
      toast({
        title: "Deposit Processing",
        description: `$${amount} is being added to your wallet`,
      });
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsDepositing(false);
    }
  };

  const getTransactionIcon = (type: string, status: string = 'completed') => {
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-500" />;
    
    switch (type) {
      case 'deposit':
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'purchase':
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case 'profit':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <Check className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'profit':
        return 'text-green-600';
      case 'purchase':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Balance
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>}
        </CardTitle>
          <CardDescription>
            Your virtual wallet for property investments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold text-primary">
            ${wallet?.balance?.toFixed(2) || "0.00"}
          </div>
          <p className="text-sm text-muted-foreground">Available Balance</p>
          
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount to deposit"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            <Button 
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isDepositing ? "Processing..." : "Deposit"}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            * This is a demo wallet. In production, this would integrate with real payment processors.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {transactions.slice(0, 10).map((transaction: Transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type, transaction.status)}
                  <div>
                     <p className="font-medium capitalize">
                       {transaction.type === 'profit' ? 'Profit Distribution' : 
                        transaction.type === 'purchase' ? 'Token Purchase' : 
                        transaction.type}
                     </p>
                     <p className="text-sm text-muted-foreground">
                       {new Date(transaction.created_at).toLocaleString()}
                     </p>
                     {transaction.metadata?.property_title && (
                       <p className="text-xs text-muted-foreground truncate max-w-48">
                         Property: {transaction.metadata.property_title}
                       </p>
                     )}
                     {transaction.status === 'pending' && (
                       <p className="text-xs text-yellow-600">Processing...</p>
                     )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${getTransactionColor(transaction.type)}`}>
                    {transaction.type === 'purchase' ? '-' : '+'}${transaction.amount.toFixed(2)}
                  </p>
                   {transaction.metadata && transaction.metadata.tokens && (
                     <p className="text-xs text-muted-foreground">
                       {transaction.metadata.tokens} tokens
                     </p>
                   )}
                   {transaction.type === 'purchase' && transaction.metadata?.per_token && (
                     <p className="text-xs text-muted-foreground">
                       ${transaction.metadata.per_token} per token
                     </p>
                   )}
                </div>
              </div>
            ))}
            
            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};