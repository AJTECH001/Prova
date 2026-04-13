import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsBar } from '@/components/landing/StatsBar';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { LiveFeedDemo } from '@/components/landing/LiveFeedDemo';
import { ZKPrivacyShowcase } from '@/components/landing/ZKPrivacyShowcase';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function WalletAuthPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>
        <HeroSection />
        <StatsBar />
        <FeatureGrid />        {/* bg-white */}
        <LiveFeedDemo />       {/* bg-[hsl(var(--bg-surface-alt))] */}
        <ZKPrivacyShowcase />  {/* bg-white */}
        {/* <FAQSection /> */}
      </main>
      <LandingFooter />
    </div>
  );
}
