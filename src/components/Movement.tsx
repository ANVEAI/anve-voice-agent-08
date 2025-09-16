import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Github, Users, Globe } from "lucide-react";

export function Movement() {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-gradient-glow">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center space-y-8 sm:space-y-12 md:space-y-16">
          {/* Header */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2">
              Let's Make the Web Agentic. Together.
            </h2>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto px-2">
            <div className="space-y-6 md:space-y-8">
              <div className="space-y-4 md:space-y-6">
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                  This isn't another chatbot widget.
                </p>
                <p className="text-xl sm:text-2xl font-semibold leading-relaxed">
                  It's the beginning of a movement — to make websites voice-first, agentic, and open.
                </p>
                <p className="text-lg sm:text-xl leading-relaxed">
                  <span className="bg-gradient-hero bg-clip-text text-transparent font-semibold">
                    Proudly built in 🇮🇳, for the world.
                  </span>
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-6 pt-6 md:pt-8">
                <Button variant="hero" size="default" asChild className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                  <Link to="/waitlist" className="flex items-center justify-center space-x-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Join the Waitlist</span>
                  </Link>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                      <Github className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span>Follow on GitHub</span>
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