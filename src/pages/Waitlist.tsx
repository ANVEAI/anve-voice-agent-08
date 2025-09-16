import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Zap, Users, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the actual value from the form input to handle voice-filled values
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const emailValue = formData.get('email') as string || email;
    
    if (!emailValue || !emailValue.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Google Form submission
      const googleFormData = new FormData();
      googleFormData.append('entry.1769329851', emailValue);
      
      const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSekuHBWYzmRhcbQ6Qhh-3xCzl6Ti-FFDS3Wz_THm54qEodnRw/formResponse';
      
      await fetch(googleFormUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: googleFormData
      });

      toast({
        title: "✅ You're on the waitlist. We'll send early access invites soon.",
        description: "",
      });
      
      // Use setTimeout to delay clearing the email to prevent race conditions with voice commands
      setTimeout(() => {
        setEmail("");
      }, 100);
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again or contact us directly",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Free Early Access",
      description: "Get the voice OS embed for free during early access period"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Priority Support",
      description: "Direct line to our team for feature requests and support"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-glow">
      {/* Header */}
      <header className="pt-8 pb-4">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-8 mb-12">
            {/* Logo */}
            <div className="flex justify-center">
              <img src="/lovable-uploads/62a734f2-b4b5-42d8-867e-6d9ecaf81a24.png" alt="ANVEAI Logo" className="h-16" />
            </div>

            {/* Headlines */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Join the Voice-First Revolution
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Be among the first 200 websites to experience the future of web interaction
              </p>
            </div>

            {/* Stats */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">200</div>
                  <div className="text-sm text-muted-foreground">Early Access Spots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">🇮🇳</div>
                  <div className="text-sm text-muted-foreground">Built in India</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">Open</div>
                  <div className="text-sm text-muted-foreground">Source Soon</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-card mb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Joining..." : "Join the Waitlist"}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              No spam. We'll only email you when early access is ready.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">What You'll Get</h2>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      {benefit.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Message */}
          <div className="text-center mt-12 p-6 bg-gradient-card border border-border rounded-xl">
            <p className="text-muted-foreground">
              Questions? Reach out to us at{" "}
              <a href="mailto:info@anveai.com" className="text-primary hover:underline">
                info@anveai.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}