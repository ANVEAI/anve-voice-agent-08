import { MessageCircle, Accessibility, Zap } from "lucide-react";

export function WhyItMatters() {
  const comparisons = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Chatbots",
      description: "only answer",
      color: "text-muted-foreground"
    },
    {
      icon: <Accessibility className="w-8 h-8" />,
      title: "Accessibility tools", 
      description: "only assist",
      color: "text-muted-foreground"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Our voice agent",
      description: "acts — navigates, scrolls, highlights, and talks back",
      color: "text-primary"
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center space-y-8 sm:space-y-12 md:space-y-16">
          {/* Header */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2">
              Introducing: Voice OS for Websites
            </h2>
          </div>

          {/* Comparison Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {comparisons.map((item, index) => (
              <div 
                key={index} 
                className={`bg-card border border-border rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-card transition-all duration-300 ${
                  item.color === "text-primary" ? "ring-2 ring-primary/20 shadow-primary" : ""
                }`}
              >
                <div className="space-y-4 md:space-y-6 text-center">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto ${
                    item.color === "text-primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {item.icon}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className={`text-lg sm:text-xl font-bold ${item.color}`}>
                      {item.title}
                    </h3>
                    <p className={`text-sm sm:text-base md:text-lg ${item.color} leading-relaxed`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Message */}
          <div className="max-w-4xl mx-auto px-2">
            <div className="bg-gradient-card border border-border rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-card">
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                This is the next leap in web interaction — and you can be among the first to bring it to your users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}