'use client';

import { useState } from 'react';
import PricingRoleSelector from './PricingRoleSelector';
import PricingCards from './PricingCards';
import { pricingData } from './pricingdata/pricingData';

export default function PricingConfigurator() {
    const [activeRole, setActiveRole] = useState('customers');
    const [billing, setBilling] = useState('monthly');

    const selectedPricing = pricingData[activeRole];

    return (
        <>
            <PricingRoleSelector
                activeRole={activeRole}
                setActiveRole={setActiveRole}
                billing={billing}
                setBilling={setBilling}
            />

            <PricingCards role={activeRole} billing={billing} pricing={selectedPricing} />
        </>
    );
}
