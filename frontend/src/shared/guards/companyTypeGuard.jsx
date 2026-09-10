'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

const redirectMap = {
    customer: '/customer',
    transporter: '/transporter',
    broker: '/broker',
    fleetOwner: '/fleet-owner',
};

function CompanyTypeGuard({ companyType, children }) {
    const { user } = useSelector((state) => state.auth);
    const router = useRouter();
    useEffect(() => {
        if (user && user.companyType !== companyType) {
            router.replace(redirectMap[user.companyType]);
        }
    }, [user, companyType, router]);

    if (!user) return null;

    if (user.companyType !== companyType) {
        
        return null;
    }
    return <div>{children}</div>;
}

export default CompanyTypeGuard;
