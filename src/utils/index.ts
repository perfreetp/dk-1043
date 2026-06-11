import dayjs from 'dayjs';
import type { Certificate, CertificateStatus } from '../types';

export const calculateStatus = (endDate: string): CertificateStatus => {
  const daysUntilExpiry = dayjs(endDate).diff(dayjs(), 'day');
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'normal';
};

export const getDaysUntilExpiry = (endDate: string): number => {
  return dayjs(endDate).diff(dayjs(), 'day');
};

export const formatDate = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatDateTime = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const groupBy = <T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

export const filterCertificates = (
  certificates: Certificate[],
  filters: {
    search?: string;
    type?: string;
    status?: string;
    store?: string;
  }
): Certificate[] => {
  return certificates.filter(cert => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        cert.code.toLowerCase().includes(searchLower) ||
        cert.holder.toLowerCase().includes(searchLower) ||
        cert.issuer.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    if (filters.type && cert.type !== filters.type) return false;
    if (filters.status && cert.status !== filters.status) return false;
    if (filters.store && !cert.stores.includes(filters.store)) return false;
    
    return true;
  });
};
