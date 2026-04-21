import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { LiveFeedDemo } from '@/components/landing/LiveFeedDemo';
import { ZKPrivacyShowcase } from '@/components/landing/ZKPrivacyShowcase';
import { PartnersBar } from '@/components/landing/PartnersBar';
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
        <FeatureGrid />        {/* bg-white */}
        <LiveFeedDemo />       {/* bg-[hsl(var(--bg-surface-alt))] */}
        <ZKPrivacyShowcase />  {/* bg-white */}
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
