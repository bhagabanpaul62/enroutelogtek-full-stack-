import CompanyTypeGuard from '@/shared/guards/companyTypeGuard';
import React from 'react'

function TransporterLayout({children}) {
  return (
      <div>
          <CompanyTypeGuard companyType={'transporter'}> {children}</CompanyTypeGuard>
      </div>
  );
}

export default TransporterLayout