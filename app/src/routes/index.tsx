import { LandingNavbar } from '@/components/landing/landing-navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { FeatureGrid } from '@/components/landing/feature-grid';
import { LiveFeedDemo } from '@/components/landing/live-feed-demo';
import { ZKPrivacyShowcase } from '@/components/landing/zk-privacy-showcase';
import { PartnersBar } from '@/components/landing/partners-bar';
import { FAQSection } from '@/components/landing/faq-section';
import { CTASection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/landing-footer';

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
