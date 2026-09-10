import CompanyTypeGuard from '@/shared/guards/companyTypeGuard';
import React from 'react'

function CustomerLayout({children}) {
  return (
      <div className=' min-h-screen w-full'>
          <CompanyTypeGuard  companyType={'customer'}> {children}</CompanyTypeGuard>
      </div>
  );
}

export default CustomerLayout