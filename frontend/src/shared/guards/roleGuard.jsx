'use client';

import { all } from 'axios';
import { useSelector } from 'react-redux';

export default function RoleGuard({ allowedRoles, children }) {
  console.log('allowedRoles ::' ,allowedRoles);
  
    const { user, isLoading } = useSelector((state) => state.auth);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    // User is not authenticated
    if (!user) {
        return null;
    }

    // User is authenticated but doesn't have permission
    if (!allowedRoles?.includes(user.role)) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="mb-4 text-5xl">🔒</div>

                    <h1 className="text-2xl font-semibold">Access Restricted</h1>

                    <p className="mt-3 text-gray-600">
                        You are not authorized to access this section. Your current account does not
                        have the required permission.
                    </p>

                    <div className="mt-6 rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
                        <p>Please contact your administrator to request access to this section.</p>
                    </div>

                    <button
                        onClick={() => window.history.back()}
                        className="mt-6 rounded-lg bg-black px-5 py-2.5 text-white"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
