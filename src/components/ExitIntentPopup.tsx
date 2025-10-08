import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

export default function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if popup has been shown this session
    const shownThisSession = sessionStorage.getItem("exitIntentShown");
    if (shownThisSession) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from top of viewport
      if (e.clientY <= 0 && !hasShown) {
        setIsOpen(true);
        setHasShown(true);
        sessionStorage.setItem("exitIntentShown", "true");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [hasShown]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        <div className="text-center space-y-6 py-4">
          <h2 className="text-4xl font-bold text-foreground">WAIT!</h2>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Try AI VoiceBot for Free
            </h3>
            <p className="text-sm text-muted-foreground">
              No credit card required | Upgrade when you're ready
            </p>
          </div>

          <Link to="/waitlist">
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              Apply For Free Trial
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
