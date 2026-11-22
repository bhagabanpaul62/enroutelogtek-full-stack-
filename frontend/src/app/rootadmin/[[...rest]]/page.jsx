import { redirect } from 'next/navigation';

// The admin area lives at /rootAdmin and URLs are case-sensitive: send the all-lowercase spelling there.
export default async function RootAdminAlias({ params }) {
    const { rest = [] } = await params;
    redirect(['/rootAdmin', ...rest].join('/'));
}
