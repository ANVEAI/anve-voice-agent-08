import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Github, Star, Settings, Bell, Search, HelpCircle, Archive, Bookmark, Calendar, Database, FileText, Globe, Heart, Home, Key, Layout, MessageSquare, Palette, Shield, Smartphone, Tablet, Trash, Users2, Wrench, Zap } from "lucide-react";
import { VoiceIntroPopup } from "./VoiceIntroPopup";
export function Header() {
  const [vanishingTabs, setVanishingTabs] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [animationStep, setAnimationStep] = useState(0); // New: track animation progress

  console.log('🎭 Header render - step:', animationStep, 'showPopup:', showPopup);

  // Fake tabs that will vanish
  const fakeNavItems = [{
    name: "Dashboard",
    icon: Layout
  }, {
    name: "Analytics",
    icon: Database
  }, {
    name: "Settings",
    icon: Settings
  }, {
    name: "Notifications",
    icon: Bell
  }, {
    name: "Search",
    icon: Search
  }, {
    name: "Help",
    icon: HelpCircle
  }, {
    name: "Archive",
    icon: Archive
  }, {
    name: "Bookmarks",
    icon: Bookmark
  }, {
    name: "Calendar",
    icon: Calendar
  }, {
    name: "Files",
    icon: FileText
  }, {
    name: "Global",
    icon: Globe
  }, {
    name: "Favorites",
    icon: Heart
  }, {
    name: "Keys",
    icon: Key
  }, {
    name: "Messages",
    icon: MessageSquare
  }, {
    name: "Themes",
    icon: Palette
  }, {
    name: "Security",
    icon: Shield
  }, {
    name: "Mobile",
    icon: Smartphone
  }, {
    name: "Tablet",
    icon: Tablet
  }];
  useEffect(() => {
    console.log('🎭 Starting animation effect');

    // Simple interval-based approach - more reliable
    const startAnimation = setTimeout(() => {
      console.log('🎭 Animation started');
      setAnimationStep(1); // Start the animation
    }, 1000);
    return () => clearTimeout(startAnimation);
  }, []);

  // Separate effect to handle the step-by-step vanishing
  useEffect(() => {
    if (animationStep === 0) return;
    console.log('🎭 Animation step:', animationStep);
    if (animationStep <= fakeNavItems.length) {
      // Add one more item to vanishing list
      const itemToVanish = fakeNavItems[animationStep - 1].name;
      console.log(`🎭 Vanishing: ${itemToVanish} (${animationStep}/${fakeNavItems.length})`);
      setVanishingTabs(prev => [...prev, itemToVanish]);

      // Schedule next step
      const nextStep = setTimeout(() => {
        setAnimationStep(animationStep + 1);
      }, 200);
      return () => clearTimeout(nextStep);
    } else {
      // All items vanished, show popup after delay
      console.log('🎭 All vanished, showing popup soon...');
      setAnimationComplete(true);
      const showPopupTimer = setTimeout(() => {
        console.log('🎭 SHOWING POPUP NOW!');
        setShowPopup(true);
      }, 500);
      return () => clearTimeout(showPopupTimer);
    }
  }, [animationStep, fakeNavItems.length]);
  return <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/lovable-uploads/62a734f2-b4b5-42d8-867e-6d9ecaf81a24.png" alt="ANVEAI Logo" className="h-10" />
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center space-x-8">
            {/* Fake navigation items that will vanish */}
            {!animationComplete && fakeNavItems.map((item, index) => {
            const IconComponent = item.icon;
            const isVanishing = vanishingTabs.includes(item.name);
            return <div key={item.name} className={`flex items-center space-x-1 text-sm transition-all duration-500 ${isVanishing ? 'opacity-0 scale-0 -translate-y-8 rotate-180 blur-sm' : 'opacity-100 scale-100 translate-y-0 rotate-0'}`} style={{
              transitionDelay: `${index * 50}ms`,
              background: isVanishing ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)' : '',
              backgroundSize: isVanishing ? '300% 300%' : '',
              animation: isVanishing ? 'gradient-shift 0.3s ease-in-out, sparkle 0.4s ease-in-out' : '',
              filter: isVanishing ? 'drop-shadow(0 0 10px rgba(255, 107, 107, 0.8)) brightness(1.5)' : ''
            }}>
                  <IconComponent className={`w-4 h-4 ${isVanishing ? 'animate-spin' : ''}`} />
                  <span className="whitespace-nowrap">{item.name}</span>
                </div>;
          })}

            {/* Separator between fake and real items */}
            {!animationComplete && <div className="w-px h-6 bg-border/50 mx-2"></div>}

            {/* Real navigation items (always visible for voice commands) */}
            <div className={`flex items-center space-x-8 ml-40 transition-opacity duration-500 ${!animationComplete ? 'opacity-30' : 'opacity-100'}`}>
              <Link to="/" className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors">
                <span>Home</span>
              </Link>

              <Link to="/pricing" className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors">
                <span>Pricing</span>
              </Link>

              <Link to="/feedback" className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors">
                <span>Resources</span>
              </Link>
            </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center space-x-2 overflow-hidden">
            {/* Fake mobile navigation items that will vanish */}
            {!animationComplete && fakeNavItems.slice(0, 6).map((item, index) => {
            const IconComponent = item.icon;
            const isVanishing = vanishingTabs.includes(item.name);
            return <div key={item.name} className={`flex flex-col items-center text-xs transition-all duration-500 ${isVanishing ? 'opacity-0 scale-0 -translate-y-8 rotate-180 blur-sm' : 'opacity-100 scale-100 translate-y-0 rotate-0'}`} style={{
              transitionDelay: `${index * 50}ms`,
              background: isVanishing ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)' : '',
              backgroundSize: isVanishing ? '300% 300%' : '',
              animation: isVanishing ? 'gradient-shift 0.3s ease-in-out, sparkle 0.4s ease-in-out' : '',
              filter: isVanishing ? 'drop-shadow(0 0 10px rgba(255, 107, 107, 0.8)) brightness(1.5)' : ''
            }}>
                  <IconComponent className={`w-4 h-4 ${isVanishing ? 'animate-spin' : ''}`} />
                  <span className="whitespace-nowrap">{item.name}</span>
                </div>;
          })}

            {/* Real mobile navigation items (always visible for voice commands) */}
            <div className={`flex items-center space-x-2 transition-opacity duration-500 ${!animationComplete ? 'opacity-30' : 'opacity-100'}`}>
                <Link to="/" className="flex flex-col items-center text-xs text-foreground hover:text-primary transition-colors">
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </Link>
                <Link to="/pricing" className="flex flex-col items-center text-xs text-foreground hover:text-primary transition-colors">
                  <span>Pricing</span>
                </Link>
                <Link to="/feedback" className="flex flex-col items-center text-xs text-foreground hover:text-primary transition-colors">
                  <span>Resources</span>
                </Link>
              </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <a href="https://youtu.be/DPgaW2vwUdg" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <Star className="w-4 h-4 mr-2" />
                <span>Watch Demo</span>
              </Button>
            </a>
            <Button variant="hero" size="sm" asChild>
              <Link to="/waitlist">Apply For Free Trial</Link>
            </Button>
          </div>
        </nav>
      </div>

      {/* Voice Introduction Popup */}
      <VoiceIntroPopup isOpen={showPopup} onClose={() => {
      console.log('🎭 Closing popup');
      setShowPopup(false);
    }} />

      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes sparkle {
          0%, 100% { 
            filter: drop-shadow(0 0 5px rgba(255, 107, 107, 0.4)) brightness(1);
          }
          25% { 
            filter: drop-shadow(0 0 15px rgba(78, 205, 196, 0.8)) brightness(1.8);
          }
          50% { 
            filter: drop-shadow(0 0 20px rgba(69, 183, 209, 0.9)) brightness(2);
          }
          75% { 
            filter: drop-shadow(0 0 18px rgba(150, 206, 180, 0.7)) brightness(1.6);
          }
        }
      `}</style>
    </header>;
}