import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Shield, FileText, TrendingUp, Users, Building, Award } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            🏢 Real Estate Investment Platform
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Invest in Real Estate
            <br />
            with Tokens
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Access premium real estate investments with as little as $50. 
            Own verified tokens, receive digital certificates, and earn from property profits.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button variant="hero" size="xl" asChild>
              <Link to="/marketplace">Start Investing</Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/auth">Learn More</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">$2.4M+</div>
              <div className="text-muted-foreground">Total Investment Volume</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">500+</div>
              <div className="text-muted-foreground">Active Investors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-success mb-2">12.3%</div>
              <div className="text-muted-foreground">Average ROI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose PropToken?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of real estate investment with our secure, transparent, and accessible platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Secure Purchase</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Bank-level security with blockchain verification. Every transaction is encrypted and permanently recorded.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-accent to-success rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Legal Certificate</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Receive official digital certificates for every token purchase. Legally binding ownership documents.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-success to-primary rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">Profit Sharing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Earn regular dividends from rental income and property appreciation. Transparent profit distribution.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start investing in real estate in just a few simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: Users,
                title: "Create Account",
                description: "Sign up in minutes with just your email and verify your identity."
              },
              {
                step: "2", 
                icon: Building,
                title: "Browse Properties",
                description: "Explore our curated selection of premium real estate investments."
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Purchase Tokens",
                description: "Buy property tokens starting from just $50 with secure payment."
              },
              {
                step: "4",
                icon: Award,
                title: "Earn Returns",
                description: "Receive your certificate and start earning from property profits."
              }
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-xl">
                  {item.step}
                </div>
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
                
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-accent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Start Your Real Estate Journey?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of investors who are already building wealth through tokenized real estate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/marketplace">Explore Properties</Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/auth">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}