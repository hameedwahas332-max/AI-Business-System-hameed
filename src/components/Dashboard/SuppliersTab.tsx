import React from 'react';
import { CustomersAndSuppliersModule } from './CustomersAndSuppliersModule';

export const SuppliersTab: React.FC = () => {
  return <CustomersAndSuppliersModule initialTab="SUPPLIERS" />;
};
