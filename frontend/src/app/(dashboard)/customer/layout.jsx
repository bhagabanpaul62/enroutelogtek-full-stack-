import CompanyTypeGuard from '@/shared/guards/companyTypeGuard';
import React from 'react'

function CustomerLayout({children}) {
  return (
      <div>
          <CompanyTypeGuard companyType={'customer'}> {children}</CompanyTypeGuard>
      </div>
  );
}

export default CustomerLayout