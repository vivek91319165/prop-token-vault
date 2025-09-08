import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, FileText, Download, DollarSign, TrendingUp, PieChart, Wallet } from "lucide-react";
import { WalletCard } from "@/components/WalletCard";
import { useCertificates } from "@/hooks/useCertificates";
import type { User } from "@supabase/supabase-js";

interface Purchase {
  id: string;
  tokens_purchased: number;
  total_cost: number;
  purchase_date: string;
  certificate_issued: boolean;
  properties: {
    title: string;
    location: string;
    token_price: number;
    estimated_roi: number;
    image_url: string;
  };
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { certificates, downloadCertificate } = useCertificates();
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

  const fetchUserData = async (currentUser: User) => {
    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      setProfile(profileData);

      // Fetch purchases with property data
      const { data: purchasesData, error } = await supabase
        .from('token_purchases')
        .select(`
          *,
          properties (
            title,
            location,
            token_price,
            estimated_roi,
            image_url
          )
        `)
        .eq('user_id', currentUser.id)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setPurchases(purchasesData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData(user);
    } else {
      setLoading(false);
    }
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const purchasesChannel = supabase
      .channel('purchases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'token_purchases',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUserData(user);
        }
      )
      .subscribe();

    const certificatesChannel = supabase
      .channel('certificates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'certificates',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUserData(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(purchasesChannel);
      supabase.removeChannel(certificatesChannel);
    };
  }, [user]);

  // Real-time wallet tracking
  useEffect(() => {
    if (!user) return;

    const walletChannel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          toast({
            title: "Wallet Updated",
            description: "Your wallet balance has been updated",
          });
          fetchUserData(user);
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions'
        },
        (payload) => {
          // Check if this transaction belongs to the current user's wallet
          supabase
            .from('wallets')
            .select('user_id')
            .eq('id', payload.new.wallet_id)
            .single()
            .then(({ data }) => {
              if (data?.user_id === user.id) {
                const transactionType = payload.new.type;
                const amount = payload.new.amount;
                
                toast({
                  title: `${transactionType === 'deposit' ? 'Deposit' : transactionType === 'purchase' ? 'Purchase' : 'Profit'} Completed`,
                  description: `${transactionType === 'purchase' ? '-' : '+'}$${amount}`,
                });
                fetchUserData(user);
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [user, toast]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-2">Please log in</h2>
            <p className="text-muted-foreground text-center">
              You need to be logged in to view your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Calculate portfolio metrics
  const totalInvestment = purchases.reduce((sum, purchase) => sum + purchase.total_cost, 0);
  const totalTokens = purchases.reduce((sum, purchase) => sum + purchase.tokens_purchased, 0);
  const uniqueProperties = [...new Set(purchases.map(p => p.properties?.title))].filter(Boolean);
  const avgROI = purchases.length > 0 
    ? purchases.reduce((sum, purchase) => sum + (purchase.properties?.estimated_roi || 0), 0) / purchases.length 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {profile?.first_name || 'Investor'}!
        </h1>
        <p className="text-muted-foreground">
          Track your property investments and manage your portfolio
        </p>
      </div>

      {/* Portfolio Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalInvestment.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueProperties.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgROI.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="portfolio" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="space-y-6">
          <WalletCard />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={purchase.properties?.image_url || "/placeholder.svg"}
                    alt={purchase.properties?.title || "Property"}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">
                      {purchase.properties?.estimated_roi}% ROI
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{purchase.properties?.title}</CardTitle>
                  <CardDescription>{purchase.properties?.location}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tokens Owned:</span>
                      <span className="font-medium">{purchase.tokens_purchased}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Investment:</span>
                      <span className="font-medium">${purchase.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Token Price:</span>
                      <span className="font-medium">${purchase.properties?.token_price}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {purchases.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start building your property portfolio by investing in tokenized real estate.
                </p>
                <Button asChild>
                  <a href="/marketplace">Explore Properties</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Your complete investment transaction history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{purchase.properties?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {purchase.tokens_purchased} tokens • {new Date(purchase.purchase_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${purchase.total_cost.toFixed(2)}</p>
                      <Badge variant={purchase.certificate_issued ? "default" : "secondary"}>
                        {purchase.certificate_issued ? "Certificate Issued" : "Processing"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{certificate.property_title}</CardTitle>
                  <CardDescription>
                    Certificate #{certificate.certificate_number}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tokens Owned:</span>
                      <span className="font-medium">{certificate.tokens_owned}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Issue Date:</span>
                      <span className="font-medium">
                        {new Date(certificate.issue_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={certificate.pdf_url ? "default" : "secondary"}>
                        {certificate.pdf_url ? "Ready" : "Generating..."}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => downloadCertificate(certificate)}
                      disabled={!certificate.pdf_url}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {certificates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Purchase property tokens to receive your digital certificates.
                </p>
                <Button asChild>
                  <a href="/marketplace">Browse Properties</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}