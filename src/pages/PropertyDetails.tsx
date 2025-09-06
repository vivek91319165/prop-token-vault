import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Building,
  Shield,
  FileText,
  Calculator
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Property {
  id: string;
  title: string;
  description: string | null;
  location: string;
  property_type: string;
  total_tokens: number;
  token_price: number;
  tokens_sold: number;
  estimated_roi: number;
  image_url: string | null;
  gallery_urls: string[] | null;
  investment_terms: string | null;
  status: string;
}

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [tokensToBuy, setTokensToBuy] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error: any) {
      toast({
        title: "Error loading property",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase tokens.",
        variant: "destructive",
      });
      return;
    }

    if (!property || tokensToBuy <= 0) return;

    const tokensAvailable = property.total_tokens - property.tokens_sold;
    if (tokensToBuy > tokensAvailable) {
      toast({
        title: "Insufficient tokens available",
        description: `Only ${tokensAvailable} tokens are available for purchase.`,
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);

    try {
      const totalCost = tokensToBuy * property.token_price;

      // Insert purchase record
      const { error: purchaseError } = await supabase
        .from("token_purchases")
        .insert({
          user_id: user.id,
          property_id: property.id,
          tokens_purchased: tokensToBuy,
          total_cost: totalCost,
          certificate_issued: true, // Auto-issue certificate for demo
        });

      if (purchaseError) throw purchaseError;

      // Update tokens sold
      const { error: updateError } = await supabase
        .from("properties")
        .update({ 
          tokens_sold: property.tokens_sold + tokensToBuy 
        })
        .eq("id", property.id);

      if (updateError) throw updateError;

      toast({
        title: "Purchase successful! 🎉",
        description: `You've successfully purchased ${tokensToBuy} tokens for $${totalCost.toLocaleString()}. Your certificate will be available shortly.`,
      });

      // Refresh property data
      fetchProperty();
      setTokensToBuy(1);
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return <Navigate to="/marketplace" replace />;
  }

  const progressPercentage = (property.tokens_sold / property.total_tokens) * 100;
  const tokensRemaining = property.total_tokens - property.tokens_sold;
  const totalCost = tokensToBuy * property.token_price;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{property.property_type}</Badge>
            <Badge variant="default" className="bg-success text-success-foreground">
              {property.estimated_roi}% ROI
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {property.title}
          </h1>
          <div className="flex items-center text-muted-foreground">
            <MapPin className="w-5 h-5 mr-2" />
            <span className="text-lg">{property.location}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Image */}
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={property.image_url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop"}
                alt={property.title}
                className="w-full h-96 object-cover"
              />
            </div>

            {/* Property Details Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="investment">Investment</TabsTrigger>
                <TabsTrigger value="terms">Terms</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Property Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {property.description || "Detailed property description coming soon."}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground mb-1">
                        ${property.token_price}
                      </div>
                      <div className="text-sm text-muted-foreground">per token</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 text-center">
                      <TrendingUp className="w-8 h-8 text-success mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground mb-1">
                        {property.estimated_roi}%
                      </div>
                      <div className="text-sm text-muted-foreground">Expected ROI</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="w-8 h-8 text-accent mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground mb-1">
                        {Math.floor(property.tokens_sold / 10)}
                      </div>
                      <div className="text-sm text-muted-foreground">Investors</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="investment" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Investment Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Funding Progress</span>
                      <span className="font-medium">
                        {property.tokens_sold.toLocaleString()} / {property.total_tokens.toLocaleString()} tokens
                      </span>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {tokensRemaining.toLocaleString()} tokens remaining
                      </span>
                      <span className="font-medium text-foreground">
                        {progressPercentage.toFixed(1)}% funded
                      </span>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Value:</span>
                        <div className="font-medium text-lg">
                          ${(property.total_tokens * property.token_price).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Raised:</span>
                        <div className="font-medium text-lg text-success">
                          ${(property.tokens_sold * property.token_price).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terms" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Investment Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">Legal Protection</p>
                          <p className="text-sm text-muted-foreground">
                            All investments are legally protected with digital certificates and ownership rights.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-accent mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">Investment Terms</p>
                          <p className="text-sm text-muted-foreground">
                            {property.investment_terms || "Standard investment terms apply. Contact support for details."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <TrendingUp className="w-5 h-5 text-success mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">Profit Distribution</p>
                          <p className="text-sm text-muted-foreground">
                            Profits are distributed proportionally based on token ownership. Distribution frequency varies by property type.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Purchase Widget */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Purchase Tokens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="tokens">Number of tokens</Label>
                  <Input
                    id="tokens"
                    type="number"
                    min="1"
                    max={tokensRemaining}
                    value={tokensToBuy}
                    onChange={(e) => setTokensToBuy(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-lg"
                  />
                  <div className="text-sm text-muted-foreground">
                    Max: {tokensRemaining.toLocaleString()} tokens available
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token price:</span>
                    <span className="font-medium">${property.token_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="font-medium">{tokensToBuy}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Total cost:</span>
                    <span className="font-bold text-primary">${totalCost.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="investment"
                    size="lg"
                    className="w-full"
                    onClick={handlePurchase}
                    disabled={purchasing || tokensRemaining === 0 || !user}
                  >
                    {purchasing ? "Processing..." : 
                     !user ? "Sign In to Purchase" :
                     tokensRemaining === 0 ? "Sold Out" : 
                     `Purchase ${tokensToBuy} Token${tokensToBuy > 1 ? 's' : ''}`}
                  </Button>

                  {!user && (
                    <p className="text-sm text-muted-foreground text-center">
                      <a href="/auth" className="text-primary hover:underline">
                        Create an account
                      </a> to start investing
                    </p>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Secure payment processing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Digital certificate included</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span className="text-muted-foreground">Profit sharing eligible</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}