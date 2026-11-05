// One place for the site's search-engine facts. Each public page builds its metadata from here so
// the canonical URL, Open Graph card and Twitter card are never missing on one of them.
export const SITE_URL = 'https://enroutelogtek.in';
export const SITE_NAME = 'EnrouteLogtek';

export const OG_IMAGE = {
    url: '/opengraph-image',
    width: 1200,
    height: 630,
    alt: 'EnrouteLogtek: put every load out to bid',
};

/**
 * Metadata for one public page.
 * @param {object} o
 * @param {string} o.title       the <title> (the root layout adds " | EnrouteLogtek" unless absolute)
 * @param {string} o.description one sentence, about 150 characters
 * @param {string} o.path        the canonical path, e.g. "/pricing"
 * @param {string} [o.ogTitle]   a shorter title for the share card
 * @param {boolean} [o.absoluteTitle] use the title as-is, without the template
 */
export function pageMetadata({ title, description, path, ogTitle, absoluteTitle = false }) {
    const shareTitle = ogTitle ?? title;
    return {
        title: absoluteTitle ? { absolute: title } : title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: 'website',
            siteName: SITE_NAME,
            locale: 'en_IN',
            url: path,
            title: shareTitle,
            description,
            images: [OG_IMAGE],
        },
        twitter: {
            card: 'summary_large_image',
            title: shareTitle,
            description,
            images: [OG_IMAGE.url],
        },
    };
}
