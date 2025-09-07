import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Building, DollarSign, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Property {
  id: string;
  title: string;
  description: string;
  token_price: number;
  total_tokens: number;
  tokens_sold: number;
  is_verified: boolean;
  seller_user_id: string | null;
  status: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [distributionAmount, setDistributionAmount] = useState("");
  const [distributionNotes, setDistributionNotes] = useState("");
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

  useEffect(() => {
    if (user) {
      checkAdminRole();
      fetchProperties();
    }
  }, [user]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user?.id,
        _role: 'admin'
      });

      if (error) throw error;
      setIsAdmin(data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    }
  };

  const togglePropertyVerification = async (propertyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_verified: !currentStatus })
        .eq('id', propertyId);

      if (error) throw error;

      setProperties(prev => prev.map(prop => 
        prop.id === propertyId 
          ? { ...prop, is_verified: !currentStatus }
          : prop
      ));

      toast({
        title: "Success",
        description: `Property ${!currentStatus ? 'verified' : 'unverified'} successfully`,
      });
    } catch (error) {
      console.error('Error updating property verification:', error);
      toast({
        title: "Error",
        description: "Failed to update property verification",
        variant: "destructive",
      });
    }
  };

  const distributeProfit = async () => {
    if (!selectedProperty || !distributionAmount) return;

    try {
      const { data, error } = await supabase.rpc('distribute_property_profit', {
        p_property_id: selectedProperty,
        p_total_amount: parseFloat(distributionAmount),
        p_notes: distributionNotes || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profit distributed successfully to all token holders",
      });

      setSelectedProperty("");
      setDistributionAmount("");
      setDistributionNotes("");
    } catch (error) {
      console.error('Error distributing profit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to distribute profit",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground text-center">
              Please log in to access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-center">
              You don't have admin privileges to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage properties, verify listings, and distribute profits
        </p>
      </div>

      <Tabs defaultValue="properties" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="distributions" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Distributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Management</CardTitle>
              <CardDescription>
                Verify and manage property listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {properties.map((property) => (
                  <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{property.title}</h3>
                        <Badge variant={property.is_verified ? "default" : "secondary"}>
                          {property.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        ${property.token_price} per token • {property.tokens_sold}/{property.total_tokens} sold
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {property.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={property.is_verified}
                          onCheckedChange={() => togglePropertyVerification(property.id, property.is_verified)}
                        />
                        <Label className="text-sm">Verified</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profit Distribution</CardTitle>
              <CardDescription>
                Distribute profits to token holders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="property-select">Select Property</Label>
                <select
                  id="property-select"
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Choose a property...</option>
                  {properties.filter(p => p.tokens_sold > 0).map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} ({property.tokens_sold} tokens sold)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Distribution Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount to distribute"
                  value={distributionAmount}
                  onChange={(e) => setDistributionAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this distribution"
                  value={distributionNotes}
                  onChange={(e) => setDistributionNotes(e.target.value)}
                />
              </div>

              <Button 
                onClick={distributeProfit}
                disabled={!selectedProperty || !distributionAmount || parseFloat(distributionAmount) <= 0}
                className="w-full"
              >
                Distribute Profit
              </Button>

              <p className="text-xs text-muted-foreground">
                This will distribute the specified amount proportionally to all token holders based on their ownership percentage.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}