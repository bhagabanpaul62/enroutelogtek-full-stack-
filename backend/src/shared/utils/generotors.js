// utils/generators.js

/**
 * Generate Enroute Company ID
 * Format: CUS-1001, TRN-2001, BRK-3001, FLT-4001
 */
export function generateEnrouteCompanyId(companyType) {
    const prefixes = {
        customer: 'CUS',
        transporter: 'TRN',
        broker: 'BRK',
        fleetOwner: 'FLT',
    };

    const prefix = prefixes[companyType];

    if (!prefix) {
        throw new Error(`Invalid company type: ${companyType}`);
    }

    // Generate random 4-digit number
    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    return `${prefix}-${randomNumber}`;
}
