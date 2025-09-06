import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PropertyCard from "@/components/PropertyCard";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  status: string;
}

export default function Marketplace() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("roi");
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    filterAndSortProperties();
  }, [properties, searchTerm, selectedType, sortBy]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading properties",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProperties = () => {
    let filtered = properties;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (property) =>
          property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter((property) => property.property_type === selectedType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "roi":
          return b.estimated_roi - a.estimated_roi;
        case "price":
          return a.token_price - b.token_price;
        case "funding":
          return (b.tokens_sold / b.total_tokens) - (a.tokens_sold / a.total_tokens);
        default:
          return 0;
      }
    });

    setFilteredProperties(filtered);
  };

  const propertyTypes = ["all", "residential", "commercial", "hospitality", "retail"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Property Marketplace
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover premium real estate investment opportunities. Start building your portfolio today.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-card/50 backdrop-blur-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter & Search Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roi">Highest ROI</SelectItem>
                  <SelectItem value="price">Lowest Price</SelectItem>
                  <SelectItem value="funding">Most Funded</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setSelectedType("all");
                setSortBy("roi");
              }}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-primary mb-2">
                {filteredProperties.length}
              </div>
              <div className="text-muted-foreground">Available Properties</div>
            </CardContent>
          </Card>

          <Card className="text-center bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-accent mb-2">
                ${filteredProperties.reduce((acc, p) => acc + (p.token_price * (p.total_tokens - p.tokens_sold)), 0).toLocaleString()}
              </div>
              <div className="text-muted-foreground">Total Investment Available</div>
            </CardContent>
          </Card>

          <Card className="text-center bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-success mb-2">
                {filteredProperties.length > 0 ? 
                  (filteredProperties.reduce((acc, p) => acc + p.estimated_roi, 0) / filteredProperties.length).toFixed(1) 
                  : 0}%
              </div>
              <div className="text-muted-foreground">Average ROI</div>
            </CardContent>
          </Card>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                No properties found matching your criteria.
              </div>
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setSelectedType("all");
              }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                title={property.title}
                location={property.location}
                tokenPrice={property.token_price}
                totalTokens={property.total_tokens}
                tokensSold={property.tokens_sold}
                estimatedRoi={property.estimated_roi}
                imageUrl={property.image_url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop"}
                propertyType={property.property_type}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}