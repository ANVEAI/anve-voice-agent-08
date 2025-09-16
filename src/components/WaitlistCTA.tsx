import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Badge, HeadphonesIcon, Zap } from "lucide-react";

export function WaitlistCTA() {
  const benefits = [
    {
      icon: <Zap className="w-5 h-5" />,
      text: "Free early access embed"
    },
    {
      icon: <HeadphonesIcon className="w-5 h-5" />,
      text: "Priority support & feature requests"
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center space-y-8 sm:space-y-12 md:space-y-16">
          {/* Header */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold px-2 leading-tight">
              Be Among the First 200 Sites to Get Early Access
            </h2>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-card border border-border rounded-xl md:rounded-2xl p-6 sm:p-8 md:p-12 shadow-card">
              <div className="space-y-6 md:space-y-8">
                <p className="text-lg sm:text-xl text-muted-foreground">
                  Early adopters will receive:
                </p>

                {/* Benefits List */}
                <div className="space-y-3 md:space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center justify-center space-x-3 text-base sm:text-lg">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-success/20 rounded-lg flex items-center justify-center text-success">
                        {benefit.icon}
                      </div>
                      <span className="text-foreground">{benefit.text}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-6 md:pt-8">
                  <p className="text-lg sm:text-xl font-semibold mb-6 md:mb-8 px-2">
                    Don't just use the future of the web. Shape it.
                  </p>

                  <Button variant="hero" size="default" asChild className="text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-6 w-full sm:w-auto">
                    <Link to="/waitlist" className="flex items-center justify-center space-x-2">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>Be the first to voice-enable your site</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}