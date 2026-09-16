export const pricingData = {
    customers: {
        badge: 'SELECTED ROLE: CUSTOMERS',
        heading: 'Pricing for customers',
        description:
            'Tools to manage transportation demand, discover verified providers, compare RFQ bids side-by-side, and coordinate execution.',

        plans: {
            start: {
                name: 'START',
                label: 'FOUNDATION',
                description: 'For businesses beginning to digitize their transportation workflows.',
                button: 'TALK TO SALES',
                config: 'DEPLOY-READY',
                tier: 'CORE TIER',
                pricingNote: 'Tailored to your operational requirements',
                features: [
                    'Company profile & Enroute ID',
                    'Business network access',
                    'Transportation requirements publishing',
                    'Basic RFQ management',
                    'Partner discovery & verification',
                    'Basic activity visibility',
                ],
            },

            grow: {
                name: 'GROW',
                label: 'MOST POPULAR',
                description:
                    'For growing businesses managing recurring transportation relationships and workflows.',
                button: 'GET STARTED',
                config: 'OPTIMAL RUNTIME',
                tier: 'GROWTH TIER',
                pricingNote: 'Structured around operational volume',
                features: [
                    'Everything in Start',
                    'Advanced RFQs & lane configurations',
                    'Bid comparison matrix',
                    'Contract workflows & SLA protection',
                    'Trip management & tracking',
                    'Network relationships & invitations',
                    'Operational reporting & freight audit',
                ],
            },

            scale: {
                name: 'SCALE',
                label: 'ENTERPRISE SCALE',
                description:
                    'For larger logistics operations requiring broader workflow and operational capabilities.',
                button: 'CONTACT SALES',
                config: 'MULTI-FACILITY',
                tier: 'SCALE TIER',
                pricingNote: 'Engineered for large-scale logistics',
                features: [
                    'Everything in Grow',
                    'Advanced operational workflows',
                    'Expanded team & multi-branch capabilities',
                    'Advanced reporting & BI exports',
                    'Scalable business relationships',
                    'Fleet/capacity coordination',
                    'Enterprise dedicated support',
                ],
            },
        },
    },

    transporters: {
        badge: 'SELECTED ROLE: TRANSPORTERS',
        heading: 'Pricing for transporters',
        description:
            'Build customer relationships, discover transportation opportunities, win contracts, and manage execution.',

        plans: {
            start: {
                name: 'START',
                label: 'FOUNDATION',
                description:
                    'For regional carriers beginning to discover shipper opportunities and digitize bids.',
                button: 'TALK TO SALES',
                config: 'DEPLOY-READY',
                tier: 'CORE TIER',
                pricingNote: 'Tailored to your operational requirements',
                features: [
                    'Business network profile',
                    'Customer discovery & connection requests',
                    'RFQ marketplace notifications',
                    'Standard bidding submission',
                    'Fleet registration (Core)',
                    'Basic trip execution visibility',
                ],
            },

            grow: {
                name: 'GROW',
                label: 'MOST POPULAR',
                description:
                    'For established freight carriers actively competing, winning contracts, and optimizing fleet utilization.',
                button: 'GET STARTED',
                config: 'OPTIMAL RUNTIME',
                tier: 'GROWTH TIER',
                pricingNote: 'Structured around operational volume',
                features: [
                    'Everything in Start',
                    'Priority RFQ alerts across corridors',
                    'Multi-lane bid management',
                    'Won contract digital administration',
                    'Vehicle & driver roster assignment',
                    'Milestone trip execution & status updates',
                    'Earnings & performance visibility',
                ],
            },

            scale: {
                name: 'SCALE',
                label: 'ENTERPRISE SCALE',
                description:
                    'For large logistics carriers coordinating large fleets, multiple terminals, and elastic capacity.',
                button: 'CONTACT SALES',
                config: 'MULTI-FACILITY',
                tier: 'SCALE TIER',
                pricingNote: 'Engineered for large-scale logistics',
                features: [
                    'Everything in Grow',
                    'Enterprise contract compliance engine',
                    'Multi-terminal fleet management',
                    'Driver performance & compliance tracking',
                    'Fleet-owner secondary capacity matching',
                    'Full operational visibility & audit reports',
                    'Dedicated carrier account manager',
                ],
            },
        },
    },

    brokers: {
        badge: 'SELECTED ROLE: BROKERS',
        heading: 'Pricing for brokers',
        description:
            'Coordinate demand and capacity across the logistics ecosystem with maximum market liquidity.',

        plans: {
            start: {
                name: 'START',
                label: 'FOUNDATION',
                description:
                    'For independent brokers connecting shippers with reliable transport capacity.',
                button: 'TALK TO SALES',
                config: 'DEPLOY-READY',
                tier: 'CORE TIER',
                pricingNote: 'Tailored to your operational requirements',
                features: [
                    'Network access & business profile',
                    'Load coordination queue',
                    'Direct transporter relationships',
                    'Basic trip visibility',
                    'Standard margin tracking',
                    'Basic operational reporting',
                ],
            },

            grow: {
                name: 'GROW',
                label: 'MOST POPULAR',
                description:
                    'For active brokerage firms accelerating multi-party load matching and recurring lane fulfillment.',
                button: 'GET STARTED',
                config: 'OPTIMAL RUNTIME',
                tier: 'GROWTH TIER',
                pricingNote: 'Structured around operational volume',
                features: [
                    'Everything in Start',
                    'Advanced load-matching queue',
                    'Transporter & fleet-owner relationships',
                    'Real-time transportation opportunities',
                    'End-to-end trip coordination & POD logs',
                    'Brokerage business visibility & analytics',
                    'Commission & margin reporting',
                ],
            },

            scale: {
                name: 'SCALE',
                label: 'ENTERPRISE SCALE',
                description:
                    'For enterprise brokerage networks orchestrating nationwide freight liquidity and high load volumes.',
                button: 'CONTACT SALES',
                config: 'MULTI-FACILITY',
                tier: 'SCALE TIER',
                pricingNote: 'Engineered for large-scale logistics',
                features: [
                    'Everything in Grow',
                    'Automated multi-party network balancing',
                    'Multi-agent team permissions & routing',
                    'Deep capacity matching intelligence',
                    'Automated contract & payment milestone logs',
                    'Custom enterprise analytics',
                    '24/7 dedicated enterprise assistance',
                ],
            },
        },
    },

    'fleet-owners': {
        badge: 'SELECTED ROLE: FLEET OWNERS',
        heading: 'Pricing for fleet owners',
        description:
            'Connect your vehicles and drivers with transportation opportunities and put your capacity to work.',

        plans: {
            start: {
                name: 'START',
                label: 'FOUNDATION',
                description:
                    'For vehicle asset owners looking to register trucks and connect with verified freight coordinators.',
                button: 'TALK TO SALES',
                config: 'DEPLOY-READY',
                tier: 'CORE TIER',
                pricingNote: 'Tailored to your operational requirements',
                features: [
                    'Business network profile',
                    'Vehicle & asset management',
                    'Driver profile registration',
                    'Basic load availability viewing',
                    'Trip execution status',
                    'Basic earnings visibility',
                ],
            },

            grow: {
                name: 'GROW',
                label: 'MOST POPULAR',
                description:
                    'For fleet operators keeping multiple commercial trucks dispatched and earning consistently.',
                button: 'GET STARTED',
                config: 'OPTIMAL RUNTIME',
                tier: 'GROWTH TIER',
                pricingNote: 'Structured around operational volume',
                features: [
                    'Everything in Start',
                    'Direct transporter & broker connection requests',
                    'Transportation opportunity reception',
                    'Load assignment dispatch',
                    'Driver readiness & status tracking',
                    'Trip execution & delivery logs',
                    'Detailed earnings & payout visibility',
                ],
            },

            scale: {
                name: 'SCALE',
                label: 'ENTERPRISE SCALE',
                description:
                    'For large commercial fleet companies managing large vehicle rosters across major industrial corridors.',
                button: 'CONTACT SALES',
                config: 'MULTI-FACILITY',
                tier: 'SCALE TIER',
                pricingNote: 'Engineered for large-scale logistics',
                features: [
                    'Everything in Grow',
                    'Comprehensive multi-depot fleet management',
                    'Driver rosters, compliance, and license tracking',
                    'Dedicated lane pre-allocation',
                    'Live fleet readiness & maintenance logs',
                    'Consolidated multi-vehicle earnings reporting',
                    'Dedicated fleet support desk',
                ],
            },
        },
    },
};
