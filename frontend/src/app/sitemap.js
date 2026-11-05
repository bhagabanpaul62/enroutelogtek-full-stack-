const SITE = 'https://enroutelogtek.in';

// Only the public pages. App screens are blocked in robots.js and marked noindex in their layouts.
export default function sitemap() {
    const lastModified = new Date();
    return [
        { url: SITE, lastModified, changeFrequency: 'weekly', priority: 1 },
        { url: `${SITE}/solution`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${SITE}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${SITE}/register`, lastModified, changeFrequency: 'yearly', priority: 0.7 },
        { url: `${SITE}/about`, lastModified, changeFrequency: 'yearly', priority: 0.6 },
        { url: `${SITE}/support`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${SITE}/login`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    ];
}
