import OperatingSystem from '@/shared/ui/components/home/OperatingSystem';
import Hero from '@/shared/ui/components/home/Hero';
import TrustedCompanies from '@/shared/ui/components/home/TrustedCompanies';
import ExecutionWorkflow from '@/shared/ui/components/home/ExecutionWorkflow';
import Industries from '@/shared/ui/components/home/Industries';
import Pricing from '@/shared/ui/components/home/Pricing';

export default function Home() {
    return (
        <>
            <Hero />
            <TrustedCompanies />
            <OperatingSystem />
            <ExecutionWorkflow />
            <Industries />
            <Pricing />
        </>
    );
}
