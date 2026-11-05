import SupportPage from '@/features/marketing/ui/SupportPage';
import { pageMetadata } from '@/features/marketing/content/seo';

export const metadata = pageMetadata({
    title: 'Support: questions, documents and how to reach us',
    ogTitle: 'EnrouteLogtek support',
    description:
        'Answers about registering on EnrouteLogtek, the documents each company type needs (GST and PAN), how approval works, seats and logins, and the address to write to.',
    path: '/support',
});

export default SupportPage;
