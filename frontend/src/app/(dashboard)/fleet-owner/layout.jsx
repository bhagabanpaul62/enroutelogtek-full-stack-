import CompanyTypeGuard from '@/shared/guards/companyTypeGuard';
import React from 'react'

function FleetOwnerLayout({children}) {
  return (
      <div>
          <CompanyTypeGuard companyType={'fleet-owner'}> {children}</CompanyTypeGuard>
      </div>
  );
}

export default FleetOwnerLayout