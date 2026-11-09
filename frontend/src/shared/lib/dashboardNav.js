import { dashboardPath } from './companyType';

/**
 * Single source of truth for the dashboard: the sidebar sections, the pages each company type
 * has, and the words the placeholder and overview pages show for them. Links are built from
 * dashboardPath(), so the fleet_owner → /fleet-owner mapping lives in one place.
 */

/** Company type as the API sends it → how we name it on screen. */
export const COMPANY_TYPE_LABELS = {
    customer: 'Customer',
    transporter: 'Transporter',
    broker: 'Broker',
    fleet_owner: 'Fleet owner',
};

/** User role as the API sends it → how we name it on screen. */
export const ROLE_LABELS = {
    root_admin: 'Platform admin',
    admin: 'Admin',
    'co-admin': 'Co-admin',
    viewer: 'Viewer',
    bid_manager: 'Bid manager',
    trip_manager: 'Trip manager',
    accounts: 'Accounts',
};

// `ready` marks pages that exist today. Everything else opens the shared "coming soon" page.
const GENERAL = [
    { slug: '', icon: 'overview', name: 'Overview', description: 'Your company at a glance.', ready: true },
    { slug: 'network', icon: 'network', name: 'Network', description: 'The companies you work with: connections, requests, discovery.', ready: true },
];

const MAIN = {
    customer: [
        { slug: 'loads', icon: 'loads', name: 'Loads', description: 'Ad Hoc loads: post one, invite transporters, pick the winning bid.', ready: true },
        { slug: 'rfqs', icon: 'rfqs', name: 'RFQs', description: 'Contract RFQs: a lane or volume over a period.' },
        { slug: 'contracts', icon: 'contracts', name: 'Contracts', description: 'The awarded bids and their terms.' },
        { slug: 'trips', icon: 'trips', name: 'Trips', description: 'Every truck on your loads, from dispatch to proof of delivery.' },
    ],
    transporter: [
        { slug: 'rfqs', icon: 'rfqs', name: 'RFQs', description: 'Loads open to you from connected shippers, on a clock.' },
        { slug: 'bids', icon: 'bids', name: 'Bids', description: 'Loads you were invited to, your bids and where each one stands.', ready: true },
        { slug: 'contracts', icon: 'contracts', name: 'Contracts', description: 'What you have won and accepted.' },
        { slug: 'fleet', icon: 'fleet', name: 'Fleet', description: 'Your vehicles and their papers.' },
        { slug: 'drivers', icon: 'drivers', name: 'Drivers', description: 'Who is on which trip.' },
        { slug: 'trips', icon: 'trips', name: 'Trips', description: 'Dispatch to proof of delivery for every truck.' },
    ],
    broker: [
        { slug: 'loads', icon: 'loads', name: 'Loads', description: 'What needs moving and who you placed it with.' },
        { slug: 'transporters', icon: 'transporters', name: 'Transporters', description: 'The transporters you place loads with.' },
        { slug: 'fleet-owners', icon: 'fleet-owners', name: 'Fleet owners', description: 'Trucks you can call on.' },
        { slug: 'trips', icon: 'trips', name: 'Trips', description: 'Dispatch to proof of delivery.' },
    ],
    fleet_owner: [
        { slug: 'loads', icon: 'loads', name: 'Loads', description: 'Loads offered to your trucks. Accept or decline each one.' },
        { slug: 'vehicles', icon: 'vehicles', name: 'Vehicles', description: 'Each truck, its papers and its availability.' },
        { slug: 'drivers', icon: 'drivers', name: 'Drivers', description: 'Who is on which trip.' },
        { slug: 'trips', icon: 'trips', name: 'Trips', description: 'Dispatch to proof of delivery.' },
        { slug: 'earnings', icon: 'earnings', name: 'Earnings', description: 'Per trip and per vehicle.' },
    ],
};

const ADMINISTRATION = [
    { slug: 'reports', icon: 'reports', name: 'Reports', description: 'Across RFQs, contracts and trips.' },
    { slug: 'team', icon: 'team', name: 'Team', description: 'Seats and roles for your people.' },
    { slug: 'settings', icon: 'settings', name: 'Settings', description: 'Company profile, branches and documents.' },
];

const withLink = (basePath) => (item) => ({
    ...item,
    ready: Boolean(item.ready),
    link: item.slug ? `${basePath}/${item.slug}` : basePath,
});

/**
 * Sidebar sections for one company type, each item carrying its absolute link.
 * @param {string} companyType customer | transporter | broker | fleet_owner
 * @returns {{ name: string, items: Array<{ slug: string, icon: string, name: string, description: string, ready: boolean, link: string }> }[]}
 */
export function dashboardSections(companyType) {
    const basePath = dashboardPath(companyType);
    const link = withLink(basePath);
    return [
        { name: 'general', items: GENERAL.map(link) },
        { name: 'main', items: (MAIN[companyType] ?? []).map(link) },
        { name: 'administration', items: ADMINISTRATION.map(link) },
    ];
}

/**
 * One page of a company type's dashboard, by its URL slug ('' for the overview).
 * @returns the item with its link, or null when that type has no such page
 */
export function findDashboardPage(companyType, slug) {
    for (const section of dashboardSections(companyType)) {
        const item = section.items.find((page) => page.slug === slug);
        if (item) return item;
    }
    return null;
}
