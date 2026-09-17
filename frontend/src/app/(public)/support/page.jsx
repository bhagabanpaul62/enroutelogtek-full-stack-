import SupportContact from '@/shared/ui/components/support/SupportContact';
import SupportCTA from '@/shared/ui/components/support/SupportCTA';
import SupportFAQ from '@/shared/ui/components/support/SupportFAQ';
import SupportHero from '@/shared/ui/components/support/SupportHero';

export default function SupportPage() {
    return (
        <>
            <SupportHero />
            <SupportFAQ />
            <SupportContact />
            <SupportCTA />
        </>
    );
}
