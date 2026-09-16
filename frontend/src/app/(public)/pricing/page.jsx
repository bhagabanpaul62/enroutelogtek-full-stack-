import PricingHero from '@/shared/ui/components/pricing/PricingHero';
import PricingConfigurator from '@/shared/ui/components/pricing/PricingConfigurator';
import PricingPhilosophy from '@/shared/ui/components/pricing/PricingPhilosophy';
import InfrastructureEvolution from '@/shared/ui/components/pricing/InfrastructureEvolution';
import FlexibleEnhancements from '@/shared/ui/components/pricing/FlexibleEnhancements';
import EnterpriceLogisticsInfrastructure from '@/shared/ui/components/pricing/EnterpriceLogisticsInfrastructure';
import PricingFAQ from '@/shared/ui/components/pricing/PricingFAQ';
import PricingNextMove from '@/shared/ui/components/pricing/PricingNextMove';

export default function PricingPage() {
    return (
        <>
            <PricingHero />
            <PricingConfigurator />
            <PricingPhilosophy />
            <InfrastructureEvolution />
            <FlexibleEnhancements />
            <EnterpriceLogisticsInfrastructure />
            <PricingFAQ />
            <PricingNextMove />
        </>
    );
}
