import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  metadata?: any;
}

export const WalletCard = () => {
  const { wallet, transactions, loading, depositToWallet } = useWallet();
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (amount <= 0) return;

    setIsDepositing(true);
    try {
      await depositToWallet(amount);
      setDepositAmount("");
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsDepositing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'purchase':
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case 'profit':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <Wallet className="h-4 w-4 text-gray-500" />;
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
          </CardTitle>
          <CardDescription>
            Your virtual wallet for property investments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold text-primary">
            ${wallet?.balance?.toFixed(2) || "0.00"}
          </div>
          
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
              {isDepositing ? "Depositing..." : "Deposit"}
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
          <CardDescription>
            Your latest wallet activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction: Transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium capitalize">{transaction.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-medium ${
                    transaction.type === 'deposit' || transaction.type === 'profit' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {transaction.type === 'deposit' || transaction.type === 'profit' ? '+' : '-'}
                    ${transaction.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};