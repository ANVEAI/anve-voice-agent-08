import { ArrowRight, Volume2, MousePointer, Eye } from "lucide-react";

export function WhatItDoes() {
  const interactions = [
    {
      command: "Scroll down",
      action: "Page scrolls down",
      icon: <ArrowRight className="w-6 h-6" />
    },
    {
      command: "How can Anveai help me in my business?", 
      action: "Gives you a specific solution for your business.",
      icon: <MousePointer className="w-6 h-6" />
    },
    {
      command: "Click on watch demo",
      action: "Opens up demo on YouTube",
      icon: <Volume2 className="w-6 h-6" />
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center space-y-8 sm:space-y-12 md:space-y-16">
          {/* Header */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2">
              Talk to Your Website. It Responds.
            </h2>
          </div>

          {/* Interactions Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {interactions.map((interaction, index) => (
              <div key={index} className="bg-card border border-border rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-card hover:shadow-glow transition-all duration-300">
                <div className="space-y-4 md:space-y-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    {interaction.icon}
                  </div>
                  
                  <div className="space-y-3 md:space-y-4 text-center sm:text-left">
                    <div className="space-y-2">
                      <p className="text-base sm:text-lg font-semibold text-primary">
                        "{interaction.command}"
                      </p>
                      <div className="flex items-center justify-center sm:justify-start space-x-2 text-muted-foreground text-sm sm:text-base">
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{interaction.action}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Punchline */}
          <div className="max-w-3xl mx-auto px-2">
            <div className="bg-gradient-card border border-border rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-card">
              <div className="space-y-3 md:space-y-4">
                <p className="text-lg sm:text-xl font-semibold">
                  Not a chatbot. Not just accessibility.
                </p>
                <p className="text-xl sm:text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  It's a new category: Agentic Voice Navigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}