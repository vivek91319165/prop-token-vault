import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building, Plus, Edit, Eye, DollarSign, TrendingUp, MapPin, Calendar, Upload, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  property_type: string;
  image_url: string;
  token_price: number;
  total_tokens: number;
  tokens_sold: number;
  estimated_roi: number;
  investment_terms: string;
  is_verified: boolean;
  status: string;
  created_at: string;
}

interface PropertyFormData {
  title: string;
  description: string;
  location: string;
  property_type: string;
  image_url: string;
  token_price: number;
  total_tokens: number;
  estimated_roi: number;
  investment_terms: string;
}

export default function SellerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>({
    title: "",
    description: "",
    location: "",
    property_type: "residential",
    image_url: "",
    token_price: 0,
    total_tokens: 0,
    estimated_roi: 0,
    investment_terms: ""
  });
  const [uploading, setUploading] = useState(false);
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

  const fetchProperties = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('seller_user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to load your properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProperties(user);
    } else {
      setLoading(false);
    }
  }, [user]);

  // Real-time subscription for property changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('seller-properties-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
          filter: `seller_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Property change:', payload);
          fetchProperties(user);
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Property Added",
              description: "Your property has been successfully listed",
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Property Updated",
              description: "Your property changes have been saved",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const propertyData = {
        ...formData,
        seller_user_id: user.id,
        status: 'active'
      };

      let error;
      if (editingProperty) {
        ({ error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id));
      } else {
        ({ error } = await supabase
          .from('properties')
          .insert([propertyData]));
      }

      if (error) throw error;

      setIsDialogOpen(false);
      setEditingProperty(null);
      resetForm();
      
      toast({
        title: editingProperty ? "Property Updated" : "Property Listed",
        description: editingProperty 
          ? "Your property has been updated successfully" 
          : "Your property is now live on the marketplace",
      });
    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        title: "Error",
        description: "Failed to save property. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error", 
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      property_type: "residential",
      image_url: "",
      token_price: 0,
      total_tokens: 0,
      estimated_roi: 0,
      investment_terms: ""
    });
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title,
      description: property.description || "",
      location: property.location,
      property_type: property.property_type,
      image_url: property.image_url || "",
      token_price: property.token_price,
      total_tokens: property.total_tokens,
      estimated_roi: property.estimated_roi,
      investment_terms: property.investment_terms || ""
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingProperty(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h2 className="text-xl font-semibold mb-2">Please log in</h2>
            <p className="text-muted-foreground text-center">
              You need to be logged in to access the seller dashboard.
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

  const totalRevenue = properties.reduce((sum, property) => 
    sum + (property.tokens_sold * property.token_price), 0
  );
  const totalTokensSold = properties.reduce((sum, property) => sum + property.tokens_sold, 0);
  const avgROI = properties.length > 0 
    ? properties.reduce((sum, property) => sum + property.estimated_roi, 0) / properties.length 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your property listings and track performance
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokensSold}</div>
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

      <Tabs defaultValue="properties" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="properties">My Properties</TabsTrigger>
          </TabsList>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProperty ? 'Edit Property' : 'Add New Property'}
                </DialogTitle>
                <DialogDescription>
                  {editingProperty 
                    ? 'Update your property details below.' 
                    : 'Fill in the details to list your property on the marketplace.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="title">Property Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="property_type">Property Type</Label>
                    <Select 
                      value={formData.property_type} 
                      onValueChange={(value) => setFormData({...formData, property_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Property Image</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                          id="image-upload"
                        />
                        <Label 
                          htmlFor="image-upload" 
                          className="flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-accent"
                        >
                          <Upload className="h-4 w-4" />
                          {uploading ? 'Uploading...' : 'Upload Image'}
                        </Label>
                        {formData.image_url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({...formData, image_url: ""})}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {formData.image_url && (
                        <div className="w-full h-32 border rounded-lg overflow-hidden">
                          <img
                            src={formData.image_url}
                            alt="Property preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <Input
                        placeholder="Or paste image URL"
                        value={formData.image_url}
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="token_price">Token Price ($)</Label>
                    <Input
                      id="token_price"
                      type="number"
                      step="0.01"
                      value={formData.token_price}
                      onChange={(e) => setFormData({...formData, token_price: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_tokens">Total Tokens</Label>
                    <Input
                      id="total_tokens"
                      type="number"
                      value={formData.total_tokens}
                      onChange={(e) => setFormData({...formData, total_tokens: parseInt(e.target.value) || 0})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_roi">Estimated ROI (%)</Label>
                    <Input
                      id="estimated_roi"
                      type="number"
                      step="0.1"
                      value={formData.estimated_roi}
                      onChange={(e) => setFormData({...formData, estimated_roi: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="investment_terms">Investment Terms</Label>
                  <Textarea
                    id="investment_terms"
                    value={formData.investment_terms}
                    onChange={(e) => setFormData({...formData, investment_terms: e.target.value})}
                    placeholder="Describe the investment terms and conditions..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProperty ? 'Update Property' : 'List Property'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="properties" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={property.image_url || "/placeholder.svg"}
                    alt={property.title}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant={property.is_verified ? "default" : "secondary"}>
                      {property.is_verified ? "Verified" : "Pending"}
                    </Badge>
                    <Badge variant="outline">
                      {property.estimated_roi}% ROI
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{property.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {property.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Token Price:</span>
                      <span className="font-medium">${property.token_price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tokens Sold:</span>
                      <span className="font-medium">{property.tokens_sold}/{property.total_tokens}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-medium">${(property.tokens_sold * property.token_price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{new Date(property.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleEdit(property)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      asChild
                    >
                      <a href={`/property/${property.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {properties.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Properties Listed</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start by adding your first property to the marketplace.
                </p>
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Property
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}