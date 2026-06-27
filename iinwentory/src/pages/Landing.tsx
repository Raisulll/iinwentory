import { useEffect } from 'react';
import '../components/landing/landing.css';
import { useReveal } from '../components/landing/useReveal';
import MarketingNav from '../components/landing/MarketingNav';
import HeroSection from '../components/landing/HeroSection';
import LogoStrip from '../components/landing/LogoStrip';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorks from '../components/landing/HowItWorks';
import MobileAppSection from '../components/landing/MobileAppSection';
import PricingSection from '../components/landing/PricingSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import FaqSection from '../components/landing/FaqSection';
import CtaSection from '../components/landing/CtaSection';
import MarketingFooter from '../components/landing/MarketingFooter';

export default function Landing() {
  useReveal();

  useEffect(() => {
    document.title = 'iinwentory — Smart Inventory Management for Modern Businesses';
  }, []);

  return (
    <div className="landing-page min-h-screen">
      <MarketingNav />
      <main>
        <HeroSection />
        <LogoStrip />
        <FeaturesSection />
        <HowItWorks />
        <MobileAppSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
