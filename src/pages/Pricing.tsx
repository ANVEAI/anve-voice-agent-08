import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Zap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  const tiers = [
    {
      name: "Community",
      icon: <Zap className="w-8 h-8" />,
      price: "Free",
      description: "Perfect for individuals and small projects",
      gradient: "bg-success/10 border-success/20"
    },
    {
      name: "Pro",
      icon: <Crown className="w-8 h-8" />,
      price: "Coming Soon",
      description: "For growing businesses and advanced features",
      gradient: "bg-primary/10 border-primary/20"
    },
    {
      name: "Enterprise",
      icon: <Building2 className="w-8 h-8" />,
      price: "Contact Us",
      description: "For large organizations with custom needs",
      gradient: "bg-secondary/10 border-secondary/20"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="pt-8 pb-4 border-b border-border">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-24">
        <div className="text-center space-y-8 mb-16">
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Pricing — Coming Soon
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're working on transparent pricing that makes voice-first web accessible for everyone
          </p>
          
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center space-x-2 bg-card border border-border rounded-full px-6 py-3">
            <span className="text-lg">🚧</span>
            <span className="text-muted-foreground">Pricing details coming soon!</span>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <div 
              key={index}
              className={`bg-card border rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-300 ${tier.gradient}`}
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto text-primary-foreground">
                    {tier.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{tier.name}</h3>
                    <p className="text-muted-foreground">{tier.description}</p>
                  </div>
                  <div className="text-3xl font-bold">{tier.price}</div>
                </div>


                {/* CTA */}
                <div className="pt-6">
                  {tier.name === "Community" ? (
                    <Button variant="success" className="w-full" disabled>
                      Open Source Soon
                    </Button>
                  ) : tier.name === "Enterprise" ? (
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:info@anveai.com">Contact Sales</a>
                    </Button>
                  ) : (
                    <Button variant="glow" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-card border border-border rounded-2xl p-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Ready to Get Started?</h3>
              <p className="text-muted-foreground">
                Join our waitlist to be notified when pricing is available and get early access
              </p>
              <Button variant="hero" size="lg" asChild>
                <Link to="/waitlist">Join the Waitlist</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}