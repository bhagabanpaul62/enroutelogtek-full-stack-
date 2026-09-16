import BrokerSolution from '@/shared/ui/components/solution/BrokerSolution';
import ConnectedEcosystem from '@/shared/ui/components/solution/ConnectedEcosystem';
import CustomerSolution from '@/shared/ui/components/solution/CustomerSolution';
import EcosystemTopology from '@/shared/ui/components/solution/EcosystemTopology';
import EnrouteWorkflow from '@/shared/ui/components/solution/EnrouteWorkflow';
import EnterpriseIntegrity from '@/shared/ui/components/solution/EnterpriseIntegrity';
import FleetOwnerSolution from '@/shared/ui/components/solution/FleetOwnerSolution';
import OnboardingCTA from '@/shared/ui/components/solution/OnboardingCTA';
import SolutionHero from '@/shared/ui/components/solution/SolutionHero';
import StrategicExpansion from '@/shared/ui/components/solution/StrategicExpansion';
import SystemArchitecture from '@/shared/ui/components/solution/SystemArchitecture';
import TransporterSolution from '@/shared/ui/components/solution/TransporterSolution';

export default function SolutionPage() {
    return (
        <>
            <SolutionHero />
            <ConnectedEcosystem />
            <CustomerSolution />
            <TransporterSolution />
            <BrokerSolution />
            <FleetOwnerSolution />
            <EcosystemTopology />
            <EnrouteWorkflow />
            <StrategicExpansion />
            <SystemArchitecture />
            <EnterpriseIntegrity />
            <OnboardingCTA />
        </>
    );
}
