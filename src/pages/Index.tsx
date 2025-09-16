import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { WhatItDoes } from "@/components/WhatItDoes";
import { WhyItMatters } from "@/components/WhyItMatters";
import { OpenSource } from "@/components/OpenSource";
import { WhoItsFor } from "@/components/WhoItsFor";
import { WaitlistCTA } from "@/components/WaitlistCTA";
import { Movement } from "@/components/Movement";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <WhatItDoes />
      <WhyItMatters />
      <OpenSource />
      <WhoItsFor />
      <WaitlistCTA />
      <Movement />
      <Footer />
    </div>
  );
};

export default Index;
