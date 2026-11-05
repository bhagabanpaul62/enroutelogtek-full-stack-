const SITE = 'https://enroutelogtek.in';

export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // Signed-in app screens and the middle of the registration flow.
                disallow: [
                    '/customer/',
                    '/transporter/',
                    '/broker/',
                    '/fleet-owner/',
                    '/rootAdmin/',
                    '/register/register-form',
                    '/verify-otp',
                    '/forgot-password/',
                    '/waiting-approval',
                ],
            },
        ],
        sitemap: `${SITE}/sitemap.xml`,
    };
}
