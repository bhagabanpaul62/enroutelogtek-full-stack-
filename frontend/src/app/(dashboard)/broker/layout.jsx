import CompanyTypeGuard from '@/shared/guards/companyTypeGuard'
import React from 'react'

function BrokerLayout({children}) {
  return (
      <div>
          <CompanyTypeGuard companyType={'broker'} > {children}</CompanyTypeGuard>
      </div>
  );
}

export default BrokerLayout