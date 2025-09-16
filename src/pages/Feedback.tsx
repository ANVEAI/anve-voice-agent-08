import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, FileText, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Feedback() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [issueForm, setIssueForm] = useState({
    name: "",
    email: "",
    subject: "",
    description: "",
    screenshot: null as File | null
  });

  const [ideaForm, setIdeaForm] = useState({
    name: "",
    email: "",
    subject: "",
    description: "",
    screenshot: null as File | null
  });

  const validateForm = (form: typeof issueForm) => {
    const errors: string[] = [];
    if (!form.email.trim()) errors.push("Email is required");
    if (!form.subject.trim()) errors.push("Subject is required");
    if (!form.description.trim()) errors.push("Description is required");
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errors.push("Valid email is required");
    return errors;
  };

  const handleSubmit = async (formData: typeof issueForm, type: "issue" | "idea") => {
    const errors = validateForm(formData);
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Create mailto link
    const subject = encodeURIComponent(`[${type === "issue" ? "Issue" : "Idea"}] ${formData.subject}`);
    const body = encodeURIComponent(`
Name: ${formData.name || "Not provided"}
Email: ${formData.email}
Type: ${type === "issue" ? "Report an Issue" : "Suggest an Idea"}

Description:
${formData.description}
    `);
    
    const mailtoLink = `mailto:info@anveai.com?subject=${subject}&body=${body}`;
    
    // Open mailto link
    window.location.href = mailtoLink;
    
    // Show success message
    toast({
      title: "Feedback Submitted",
      description: `Your ${type === "issue" ? "issue report" : "idea suggestion"} has been submitted successfully!`,
    });

    // Reset form
    if (type === "issue") {
      setIssueForm({ name: "", email: "", subject: "", description: "", screenshot: null });
    } else {
      setIdeaForm({ name: "", email: "", subject: "", description: "", screenshot: null });
    }

    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "issue" | "idea") => {
    const file = e.target.files?.[0] || null;
    if (type === "issue") {
      setIssueForm(prev => ({ ...prev, screenshot: file }));
    } else {
      setIdeaForm(prev => ({ ...prev, screenshot: file }));
    }
  };

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
              Feedback
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Help us improve ANVEAI by reporting issues or suggesting new ideas
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Tabs defaultValue="issue" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="issue" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Report an Issue</span>
              </TabsTrigger>
              <TabsTrigger value="idea" className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4" />
                <span>Suggest an Idea</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="issue">
              <Card>
                <CardHeader>
                  <CardTitle>Report an Issue</CardTitle>
                  <CardDescription>
                    Found a bug or experiencing a problem? Let us know so we can fix it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issue-name">Name (Optional)</Label>
                      <Input
                        id="issue-name"
                        name="issue-name"
                        value={issueForm.name}
                        onChange={(e) => setIssueForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="issue-email">Email *</Label>
                      <Input
                        id="issue-email"
                        name="issue-email"
                        type="email"
                        required
                        value={issueForm.email}
                        onChange={(e) => setIssueForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="issue-subject">Subject *</Label>
                    <Input
                      id="issue-subject"
                      name="issue-subject"
                      required
                      value={issueForm.subject}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief description of the issue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issue-description">Description *</Label>
                    <Textarea
                      id="issue-description"
                      name="issue-description"
                      required
                      value={issueForm.description}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please describe the issue in detail, including steps to reproduce it..."
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issue-screenshot">Attach Screenshot (Optional)</Label>
                    <Input
                      id="issue-screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "issue")}
                    />
                    {issueForm.screenshot && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {issueForm.screenshot.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleSubmit(issueForm, "issue")}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Issue Report"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="idea">
              <Card>
                <CardHeader>
                  <CardTitle>Suggest an Idea</CardTitle>
                  <CardDescription>
                    Have an idea for a new feature or improvement? We'd love to hear it!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="idea-name">Name (Optional)</Label>
                      <Input
                        id="idea-name"
                        name="idea-name"
                        value={ideaForm.name}
                        onChange={(e) => setIdeaForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idea-email">Email *</Label>
                      <Input
                        id="idea-email"
                        name="idea-email"
                        type="email"
                        required
                        value={ideaForm.email}
                        onChange={(e) => setIdeaForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="idea-subject">Subject *</Label>
                    <Input
                      id="idea-subject"
                      name="idea-subject"
                      required
                      value={ideaForm.subject}
                      onChange={(e) => setIdeaForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief summary of your idea"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idea-description">Description *</Label>
                    <Textarea
                      id="idea-description"
                      name="idea-description"
                      required
                      value={ideaForm.description}
                      onChange={(e) => setIdeaForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please describe your idea in detail. What problem would it solve? How would it work?"
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idea-screenshot">Attach Screenshot/Mockup (Optional)</Label>
                    <Input
                      id="idea-screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "idea")}
                    />
                    {ideaForm.screenshot && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {ideaForm.screenshot.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleSubmit(ideaForm, "idea")}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Idea"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}