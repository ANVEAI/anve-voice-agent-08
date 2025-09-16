import { Github, Heart, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export function OpenSource() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-16">
          {/* Header */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Built for the Community, Going Open Source
            </h2>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-card border border-border rounded-2xl p-12 shadow-card">
              <div className="space-y-8">
                <p className="text-xl text-muted-foreground leading-relaxed">
                  We believe the future of the web should be open, agentic, and accessible.
                </p>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  That's why our core engine will be released open source, so developers worldwide can contribute and innovate.
                </p>

                {/* Value Proposition */}
                <div className="grid md:grid-cols-2 gap-8 mt-12">
                  <div className="bg-success/10 border border-success/20 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                        <Heart className="w-5 h-5 text-success" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-success">For the Community</h3>
                        <p className="text-sm text-muted-foreground">
                          Our core engine will be free and open source forever
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-secondary">For Enterprises</h3>
                        <p className="text-sm text-muted-foreground">
                          Our hosted platform with analytics, dashboards, and multi-site support
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <p className="text-lg font-semibold">
                    Our hosted platform (analytics, dashboards, multi-site support) will power enterprises.
                    <br />
                    But the foundation? It belongs to everyone.
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="success" size="lg" className="mt-8">
                      <Github className="w-5 h-5 mr-2" />
                      <span>Star us on GitHub</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-border">
                    <DropdownMenuItem disabled>
                      <span className="text-muted-foreground">Coming Soon</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}