import { Rocket, ShoppingCart, GraduationCap, Accessibility } from "lucide-react";

export function WhoItsFor() {
  const targets = [
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Founders & SaaS Builders",
      description: "Differentiate with next-gen UX",
      gradient: "bg-primary/10 text-primary"
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "E-Commerce Stores",
      description: '"Show me sneakers under ₹2,000" — instant navigation',
      gradient: "bg-secondary/10 text-secondary"
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "Universities & Colleges",
      description: "Make admissions and program info voice-first",
      gradient: "bg-success/10 text-success"
    },
    {
      icon: <Accessibility className="w-8 h-8" />,
      title: "Accessibility-First Organizations",
      description: "A natural, voice-powered web experience",
      gradient: "bg-primary/10 text-primary"
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center space-y-8 sm:space-y-12 md:space-y-16">
          {/* Header */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2">
              Who Can Use It?
            </h2>
          </div>

          {/* Targets Grid */}
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            {targets.map((target, index) => (
              <div 
                key={index} 
                className="bg-card border border-border rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-card hover:shadow-glow transition-all duration-300"
              >
                <div className="space-y-4 md:space-y-6">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center ${target.gradient}`}>
                    {target.icon}
                  </div>
                  
                  <div className="space-y-2 md:space-y-3 text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      {target.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {target.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}