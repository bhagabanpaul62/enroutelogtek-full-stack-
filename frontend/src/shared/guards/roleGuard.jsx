'use client';

import { useSelector } from 'react-redux';

/**
 * Renders children only for users whose role is in allowedRoles. Shows a restricted notice to
 * signed-in users with another role; renders nothing while the session is loading or absent
 * (AuthGuard handles the redirect to login).
 */
export default function RoleGuard({ allowedRoles, children }) {
    const { user, isLoading } = useSelector((state) => state.auth);

    if (isLoading) {
        return <div className="p-6 text-muted-foreground">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    if (!allowedRoles?.includes(user.role)) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <h1 className="text-2xl font-semibold">Access restricted</h1>
                    <p className="mt-3 text-muted-foreground">
                        Your account does not have permission for this section. Ask your company
                        admin if you think it should.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="mt-6 rounded-[4px] bg-primary px-5 py-2.5 text-primary-foreground"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
