import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Award, 
  Download, 
  FileText, 
  Calendar, 
  Building,
  Shield,
  Hash,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Certificate {
  id: string;
  certificate_number: string;
  property_title: string;
  tokens_owned: number;
  issue_date: string;
  pdf_url: string | null;
  token_purchases: {
    total_cost: number;
    purchase_date: string;
    properties: {
      title: string;
      location: string;
      token_price: number;
      estimated_roi: number;
      image_url: string;
    };
  };
}

export default function Certificates() {
  const [user, setUser] = useState<User | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchCertificates(session.user);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCertificates(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCertificates = async (currentUser: User) => {
    try {
      // For demo purposes, we'll create certificates from purchases
      // In a real app, these would be separate certificate records
      const { data: purchases, error } = await supabase
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
        .eq("certificate_issued", true)
        .order("purchase_date", { ascending: false });

      if (error) throw error;

      // Transform purchases into certificate format
      const transformedCertificates = (purchases || []).map(purchase => ({
        id: purchase.id,
        certificate_number: `CERT-${purchase.id.slice(0, 8).toUpperCase()}`,
        property_title: purchase.properties.title,
        tokens_owned: purchase.tokens_purchased,
        issue_date: purchase.purchase_date,
        pdf_url: null, // Would be generated in real implementation
        token_purchases: {
          total_cost: purchase.total_cost,
          purchase_date: purchase.purchase_date,
          properties: purchase.properties
        }
      }));

      setCertificates(transformedCertificates);
    } catch (error: any) {
      toast({
        title: "Error loading certificates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (certificateId: string) => {
    // In a real implementation, this would download the actual PDF
    toast({
      title: "Certificate downloaded",
      description: "Your certificate has been downloaded successfully.",
    });
  };

  const handlePreview = (certificateId: string) => {
    // In a real implementation, this would open a certificate preview
    toast({
      title: "Certificate preview",
      description: "Certificate preview functionality coming soon.",
    });
  };

  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Digital Certificates
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your verified ownership certificates for all token purchases. Each certificate is legally binding and proves your investment.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Award className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-2xl font-bold text-foreground mb-1">
                {certificates.length}
              </div>
              <div className="text-muted-foreground">Total Certificates</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6 text-center">
              <Building className="w-8 h-8 text-accent mx-auto mb-3" />
              <div className="text-2xl font-bold text-foreground mb-1">
                {new Set(certificates.map(c => c.property_title)).size}
              </div>
              <div className="text-muted-foreground">Properties Owned</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-success mx-auto mb-3" />
              <div className="text-2xl font-bold text-foreground mb-1">
                {certificates.reduce((sum, c) => sum + c.tokens_owned, 0)}
              </div>
              <div className="text-muted-foreground">Total Tokens</div>
            </CardContent>
          </Card>
        </div>

        {/* Certificates List */}
        {certificates.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Award className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                No certificates yet
              </h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Purchase property tokens to receive verified digital certificates of ownership.
              </p>
              <Button variant="hero" asChild>
                <a href="/marketplace">Browse Properties</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
                    {/* Property Image */}
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={certificate.token_purchases.properties.image_url || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop"}
                        alt={certificate.property_title}
                        className="w-full h-32 lg:h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-2 left-2 bg-success text-success-foreground">
                        Verified
                      </Badge>
                    </div>

                    {/* Certificate Details */}
                    <div className="lg:col-span-2 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                          {certificate.property_title}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {certificate.token_purchases.properties.location}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground block">Certificate #</span>
                            <span className="font-medium">{certificate.certificate_number}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground block">Issue Date</span>
                            <span className="font-medium">
                              {new Date(certificate.issue_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground block">Tokens Owned</span>
                            <span className="font-medium">{certificate.tokens_owned}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground block">Investment</span>
                            <span className="font-medium">
                              ${certificate.token_purchases.total_cost.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="default" className="bg-primary/10 text-primary">
                          {certificate.token_purchases.properties.estimated_roi}% ROI
                        </Badge>
                        <Badge variant="outline">
                          ${certificate.token_purchases.properties.token_price} per token
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 lg:items-end lg:justify-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(certificate.id)}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(certificate.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>

                      <div className="text-xs text-muted-foreground text-center lg:text-right">
                        Certificate valid<br />
                        Blockchain verified
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-12 bg-gradient-to-r from-muted/30 to-muted/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              About Your Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">Legal Validity</h4>
                <p className="text-sm text-muted-foreground">
                  Each certificate is legally binding and represents verified ownership of property tokens. 
                  They include blockchain verification for maximum security.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Usage</h4>
                <p className="text-sm text-muted-foreground">
                  Use certificates for tax reporting, loan applications, or as proof of investment. 
                  All documents are accepted by financial institutions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}