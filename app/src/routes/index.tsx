import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { PartnersBar } from '@/components/landing/PartnersBar';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { LiveFeedDemo } from '@/components/landing/LiveFeedDemo';
import { ZKPrivacyShowcase } from '@/components/landing/ZKPrivacyShowcase';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function WalletAuthPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <PartnersBar />
        <FeatureGrid />
        <LiveFeedDemo />
        <ZKPrivacyShowcase />
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
