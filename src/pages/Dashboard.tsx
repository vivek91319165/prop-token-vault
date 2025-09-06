import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Wallet, 
  Building, 
  FileText, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  Award
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface Profile {
  first_name: string | null;
  last_name: string | null;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (currentUser: User) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", currentUser.id)
        .single();

      setProfile(profileData);

      // Fetch purchases with property details
      const { data: purchasesData, error } = await supabase
        .from("token_purchases")
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
        .eq("user_id", currentUser.id)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      setPurchases(purchasesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate portfolio metrics
  const totalInvestment = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const totalTokens = purchases.reduce((sum, p) => sum + p.tokens_purchased, 0);
  const uniqueProperties = new Set(purchases.map(p => p.properties.title)).size;
  const averageROI = purchases.length > 0 
    ? purchases.reduce((sum, p) => sum + p.properties.estimated_roi, 0) / purchases.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back, {profile?.first_name || user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your real estate investment portfolio.
          </p>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Investment</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalInvestment.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Tokens</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalTokens.toLocaleString()}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Properties</p>
                  <p className="text-2xl font-bold text-foreground">
                    {uniqueProperties}
                  </p>
                </div>
                <Building className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Avg. ROI</p>
                  <p className="text-2xl font-bold text-foreground">
                    {averageROI.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            {purchases.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No investments yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Start building your real estate portfolio today.
                  </p>
                  <Button variant="hero" asChild>
                    <a href="/marketplace">Browse Properties</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from(new Map(purchases.map(p => [p.properties.title, p])).values()).map((purchase) => (
                  <Card key={purchase.id} className="group hover:shadow-lg transition-all duration-300">
                    <div className="relative overflow-hidden rounded-t-lg">
                      <img
                        src={purchase.properties.image_url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop"}
                        alt={purchase.properties.title}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-2 right-2 bg-success text-success-foreground">
                        {purchase.properties.estimated_roi}% ROI
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                        {purchase.properties.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {purchase.properties.location}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Your tokens:</span>
                          <span className="font-medium">{purchase.tokens_purchased}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Investment:</span>
                          <span className="font-medium">${purchase.total_cost.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {purchases.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No transactions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {purchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                            <Building className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{purchase.properties.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(purchase.purchase_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            {purchase.tokens_purchased} tokens
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${purchase.total_cost.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Digital Certificates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {purchases.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No certificates available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {purchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-accent to-success rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{purchase.properties.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Certificate #{purchase.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={purchase.certificate_issued ? "default" : "secondary"}>
                            {purchase.certificate_issued ? "Issued" : "Pending"}
                          </Badge>
                          <Button variant="outline" size="sm" disabled={!purchase.certificate_issued}>
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}