import RegisterPage from '@/features/auth/ui/RegisterPage';
import { pageMetadata } from '@/features/marketing/content/seo';

export const metadata = pageMetadata({
    title: 'Register your company',
    description:
        'Register a manufacturer, transporter, broker or fleet owner on EnrouteLogtek. A person approves it after checking your GST and PAN.',
    path: '/register',
});

export default RegisterPage;
