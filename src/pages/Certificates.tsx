import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Award, 
  Download, 
  FileText, 
  Calendar, 
  Building,
  Shield,
  Hash,
  Eye,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCertificates } from "@/hooks/useCertificates";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
}

export default function Certificates() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { certificates, loading, downloadCertificate } = useCertificates();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentUser: SupabaseUser) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', currentUser.id)
        .single();

      if (error) throw error;
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleDownload = (certificate: any) => {
    downloadCertificate(certificate);
  };

  const CertificatePreview = ({ certificate, userProfile }: { certificate: any, userProfile: Profile | null }) => (
    <div className="bg-white text-black p-8 max-w-2xl mx-auto border shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">DIGITAL PROPERTY CERTIFICATE</h1>
        <p className="text-lg text-gray-600">Certificate of Ownership</p>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Certificate Number:</label>
            <p className="text-lg font-mono">{certificate.certificate_number}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Issue Date:</label>
            <p className="text-lg">{new Date(certificate.issue_date).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-500">Property:</label>
          <p className="text-xl font-semibold text-blue-900">{certificate.property_title}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-500">Token Holder:</label>
          <p className="text-xl font-semibold">
            {userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Loading...'}
          </p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-500">Tokens Owned:</label>
          <p className="text-xl font-semibold text-green-600">{certificate.tokens_owned}</p>
        </div>
      </div>
      
      <div className="border-t pt-6 text-sm text-gray-600">
        <p className="mb-2">This certificate represents digital ownership of property tokens and is legally binding according to our terms of service.</p>
        <p>Certificate authenticated and verified through blockchain technology.</p>
      </div>
    </div>
  );

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
              <Button variant="default" asChild>
                <a href="/marketplace">Browse Properties</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Certificate Info */}
                    <div className="lg:col-span-3 space-y-4">
                      <div>
                        <h3 className="font-semibold text-xl text-foreground mb-2">
                          {certificate.property_title}
                        </h3>
                        <Badge className="bg-success text-success-foreground">
                          Verified Certificate
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                            <span className="font-medium text-green-600">{certificate.tokens_owned}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground block">Owner</span>
                            <span className="font-medium">
                              {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 lg:items-end lg:justify-center">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownload(certificate)}
                        className="flex items-center gap-2"
                        disabled={!certificate.pdf_url}
                      >
                        <Download className="w-4 h-4" />
                        {certificate.pdf_url ? 'Download PDF' : 'Generating...'}
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Certificate Preview</DialogTitle>
                          </DialogHeader>
                          <CertificatePreview certificate={certificate} userProfile={profile} />
                        </DialogContent>
                      </Dialog>

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