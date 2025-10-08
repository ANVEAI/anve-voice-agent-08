import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Rocket, Star, Github } from "lucide-react";
import heroImage from "@/assets/hero-voice-visualization.jpg";
export function Hero() {
  return <section className="relative min-h-screen flex items-center justify-center bg-gradient-glow pt-24 pb-12 md:pt-32 md:pb-16">
      {/* Background Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90"></div>
        <div className="absolute inset-0 bg-gradient-glow opacity-30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-card/50 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
            <span className="text-xs sm:text-sm text-muted-foreground">🌍 Built in India</span>
            <span className="text-xs sm:text-sm text-muted-foreground">•</span>
            <span className="text-xs sm:text-sm text-success">Open source soon</span>
            <span className="text-xs sm:text-sm">🇮🇳</span>
          </div>

          {/* Headlines */}
          <div className="space-y-4 md:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                The Future of the Web is Voice-First
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-2">
              Turn any website into a Voice OS — where users can speak, and your site will listen, talk back, and act.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-6 pt-2">
            <Button variant="hero" size="default" asChild className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
              <Link to="/waitlist" className="flex items-center justify-center space-x-2">
                <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Apply For Free Trial</span>
              </Link>
            </Button>
            
            <Button variant="outline" size="default" asChild className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
              <a href="https://youtu.be/DPgaW2vwUdg" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-2">
                <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Watch Demo</span>
              </a>
            </Button>
          </div>

          {/* Demo Preview */}
          <div className="mt-8 md:mt-16 relative">
            <div className="bg-card/30 backdrop-blur-sm border border-border rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-card">
              <div className="text-center space-y-3 md:space-y-4">
                
                <p className="text-lg sm:text-xl md:text-2xl font-semibold">
                  "No clicks. No scrolls. Just Voice."
                </p>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-2">
                  Watch users navigate your entire website with simple voice commands
                </p>
                <div className="flex justify-center">
                  <a href="https://youtu.be/DPgaW2vwUdg" target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/30 rounded-lg px-4 py-2.5 sm:px-6 sm:py-3 transition-colors group">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <span className="text-primary font-medium text-sm sm:text-base">Watch Demo</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
}