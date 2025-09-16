import { Link } from "react-router-dom";
import { Github, Mail } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export function Footer() {
  return <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col space-y-8">
          {/* Logo and Tagline */}
          <div className="text-center space-y-4">
            <Link to="/" className="inline-flex items-center space-x-2">
              
              <img src="/lovable-uploads/62a734f2-b4b5-42d8-867e-6d9ecaf81a24.png" alt="ANVEAI Logo" className="h-8" />
            </Link>
            <p className="text-muted-foreground">
              ⚡ Voice OS for Websites — Agentic, Open, Built in India.
            </p>
          </div>


          {/* Social Links */}
          <div className="flex justify-center space-x-6">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground">Coming Soon</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <a href="mailto:info@anveai.com" className="text-muted-foreground hover:text-primary transition-colors">
              <Mail className="w-5 h-5" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              © 2024 ANVE VOICE. Built with ❤️ in India.
            </p>
          </div>
        </div>
      </div>
    </footer>;
}