import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, User, Phone, Globe, Zap, Users, Building2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Waitlist() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    company: "",
    comments: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get values from form to handle voice-filled values
    const form = e.currentTarget as HTMLFormElement;
    const formDataObj = new FormData(form);
    
    const submissionData = {
      name: (formDataObj.get('name') as string) || formData.name,
      email: (formDataObj.get('email') as string) || formData.email,
      phone: (formDataObj.get('phone') as string) || formData.phone,
      website: (formDataObj.get('website') as string) || formData.website,
      company: (formDataObj.get('company') as string) || formData.company,
      comments: (formDataObj.get('comments') as string) || formData.comments
    };
    
    // Validation
    if (!submissionData.name.trim() || !submissionData.email.trim() || 
        !submissionData.phone.trim() || !submissionData.website.trim()) {
      toast({
        title: "All fields required",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submissionData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    // Phone validation
    const phoneRegex = /^[\d\s\+\-\(\)]{10,15}$/;
    if (!phoneRegex.test(submissionData.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    // Website validation - accepts domain with or without protocol
    const websitePattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/.*)?$/i;
    if (!websitePattern.test(submissionData.website.trim())) {
      toast({
        title: "Invalid website",
        description: "Please enter a valid website (e.g., google.com or https://google.com)",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for Google Forms submission
      const googleFormData = new FormData();
      googleFormData.append('entry.715009405', submissionData.name);
      googleFormData.append('entry.1706641438', submissionData.email);
      googleFormData.append('entry.772060020', submissionData.phone);
      googleFormData.append('entry.143944321', submissionData.company);
      googleFormData.append('entry.986452663', submissionData.website);
      googleFormData.append('entry.189219768', submissionData.comments);

      // Submit to Google Forms
      const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdfqXW44dR3sgIHWmAYWMZ2OSc2e9aR40r7MNyhi8QCg0UnXg/formResponse';
      
      await fetch(formUrl, {
        method: 'POST',
        body: googleFormData,
        mode: 'no-cors'
      });

      toast({
        title: "✅ Application submitted!",
        description: "We'll contact you within 24 hours.",
      });
      
      // Clear form
      setTimeout(() => {
        setFormData({ name: "", email: "", phone: "", website: "", company: "", comments: "" });
      }, 100);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact us at info@anveai.com",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Free Trial Access",
      description: "Get full access to the voice OS embed during your trial period"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Priority Support",
      description: "Direct line to our team for setup and integration support"
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
              <h1 className="text-3xl md:text-4xl font-bold">
                Apply for Free Trial and
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Try AI VoiceBot for Free
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                No credit card required | Upgrade when you're ready
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-12 h-12"
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
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
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-12 h-12"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-foreground">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-12 h-12"
                      required
                    />
                  </div>
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <label htmlFor="website" className="text-sm font-medium text-foreground">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      placeholder="https://yoursite.com"
                      value={formData.website}
                      onChange={handleChange}
                      className="pl-12 h-12"
                      required
                    />
                  </div>
                </div>

                {/* Company */}
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-medium text-foreground">
                    Company <span className="text-muted-foreground">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Your Company Name"
                      value={formData.company}
                      onChange={handleChange}
                      className="pl-12 h-12"
                    />
                  </div>
                </div>
              </div>

              {/* Comments/Feedback */}
              <div className="space-y-2">
                <label htmlFor="comments" className="text-sm font-medium text-foreground">
                  Any comments/Feedback? <span className="text-muted-foreground">(Optional)</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Textarea
                    id="comments"
                    name="comments"
                    placeholder="Any specific requirements or questions?"
                    value={formData.comments}
                    onChange={handleChange}
                    className="pl-12 min-h-[100px]"
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
                {isSubmitting ? "Submitting..." : "Apply Now"}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              We'll review your application and get back to you within 24 hours.
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