import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, ArrowDown, ArrowUp, Play, Users, X } from "lucide-react";

interface VoiceIntroPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceIntroPopup({ isOpen, onClose }: VoiceIntroPopupProps) {
  const [currentCommand, setCurrentCommand] = useState(0);

  console.log('🎭 VoiceIntroPopup render - isOpen:', isOpen);

  const voiceCommands = [
    { icon: ArrowDown, text: "scroll down", description: "Navigate page content" },
    { icon: ArrowUp, text: "scroll up", description: "Go back up" },
    { icon: Play, text: "click on watch demo", description: "Interact with buttons" },
    { icon: Users, text: "join the waitlist", description: "Voice-activated actions" },
  ];

  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setCurrentCommand((prev) => (prev + 1) % voiceCommands.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <>
      {console.log('🎭 VoiceIntroPopup JSX render - isOpen:', isOpen)}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20 shadow-2xl">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center animate-pulse">
              <Mic className="w-8 h-8 text-primary-foreground animate-bounce" />
            </div>
            
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Say Bye to Manual Navigation
            </DialogTitle>
            
            <p className="text-muted-foreground text-sm leading-relaxed">
              Welcome to the world of <span className="text-primary font-semibold">voice-first</span> navigation. 
              Control your web experience with simple voice commands.
            </p>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Volume2 className="w-5 h-5 text-primary animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">Try saying:</span>
              </div>
              
              <div className="bg-secondary/30 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  {React.createElement(voiceCommands[currentCommand].icon, {
                    className: "w-5 h-5 text-primary animate-bounce"
                  })}
                  <span className="text-lg font-mono text-primary font-semibold">
                    "{voiceCommands[currentCommand].text}"
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {voiceCommands[currentCommand].description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {voiceCommands.map((cmd, index) => {
                const IconComponent = cmd.icon;
                return (
                  <div 
                    key={index}
                    className={`flex items-center space-x-2 p-2 rounded-md transition-all duration-300 ${
                      currentCommand === index 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-secondary/20 text-muted-foreground hover:bg-secondary/30'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span className="font-mono">"{cmd.text}"</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pt-2">
              <Button 
                onClick={onClose}
                variant="outline" 
                size="sm"
                className="bg-background/50 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
              >
                <X className="w-4 h-4 mr-2" />
                Got it!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}