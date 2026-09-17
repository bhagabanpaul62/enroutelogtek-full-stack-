import AboutApproach from '@/shared/ui/components/About/AboutApproach';
import AboutBeliefs from '@/shared/ui/components/About/AboutBeliefs';
import AboutBusinesses from '@/shared/ui/components/About/AboutBusinesses';
import AboutChallenge from '@/shared/ui/components/About/AboutChallenge';
import AboutHero from '@/shared/ui/components/about/AboutHero';
import AboutHorizon from '@/shared/ui/components/About/AboutHorizon';
import AboutMission from '@/shared/ui/components/About/AboutMission';
import AboutMissionStatement from '@/shared/ui/components/About/AboutMissionStatement';
import AboutOnboarding from '@/shared/ui/components/About/AboutOnboarding';
import AboutPurpose from '@/shared/ui/components/About/AboutPurpose';
import AboutRelationships from '@/shared/ui/components/About/AboutRelationships';
import AboutTrustPillars from '@/shared/ui/components/About/AboutTrustPillars';
import AboutVision from '@/shared/ui/components/About/AboutVision';

export default function AboutPage() {
    return (
        <>
            <AboutHero />
            <AboutMission />
            <AboutPurpose />
            <AboutChallenge />
            <AboutApproach />
            <AboutBusinesses />
            <AboutRelationships />
            <AboutBeliefs />
            <AboutVision />
            <AboutHorizon />
            <AboutTrustPillars />
            <AboutMissionStatement />
            <AboutOnboarding />
        </>
    );
}
