import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Certificate, ProcessRecord, ReminderRule, Store } from '../types';
import { initialCertificates, initialRecords, initialReminderRules, stores } from '../data';
import { calculateStatus, generateId } from '../utils';

interface AppState {
  certificates: Certificate[];
  records: ProcessRecord[];
  reminderRules: ReminderRule[];
  stores: Store[];
  
  addCertificate: (certificate: Omit<Certificate, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateCertificate: (id: string, updates: Partial<Certificate>) => void;
  deleteCertificate: (id: string) => void;
  
  addRecord: (record: Omit<ProcessRecord, 'id' | 'createdAt'>) => void;
  updateRecord: (id: string, updates: Partial<ProcessRecord>) => void;
  deleteRecord: (id: string) => void;
  
  addReminderRule: (rule: Omit<ReminderRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReminderRule: (id: string, updates: Partial<ReminderRule>) => void;
  deleteReminderRule: (id: string) => void;
  
  updateCertificatesStatus: () => void;
  batchUpdateCertificatesStatus: (ids: string[], status: Certificate['status']) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      certificates: initialCertificates,
      records: initialRecords,
      reminderRules: initialReminderRules,
      stores: stores,

      addCertificate: (certificate) => {
        const now = new Date().toISOString();
        const newCertificate: Certificate = {
          ...certificate,
          id: generateId(),
          status: calculateStatus(certificate.endDate),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          certificates: [...state.certificates, newCertificate],
        }));
      },

      updateCertificate: (id, updates) => {
        set((state) => ({
          certificates: state.certificates.map((cert) =>
            cert.id === id
              ? {
                  ...cert,
                  ...updates,
                  status: updates.status ?? (updates.endDate ? calculateStatus(updates.endDate) : cert.status),
                  updatedAt: new Date().toISOString(),
                }
              : cert
          ),
        }));
      },

      deleteCertificate: (id) => {
        set((state) => ({
          certificates: state.certificates.filter((cert) => cert.id !== id),
        }));
      },

      addRecord: (record) => {
        const newRecord: ProcessRecord = {
          ...record,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          records: [...state.records, newRecord],
        }));
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((rec) =>
            rec.id === id ? { ...rec, ...updates } : rec
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter((rec) => rec.id !== id),
        }));
      },

      addReminderRule: (rule) => {
        const now = new Date().toISOString();
        const newRule: ReminderRule = {
          ...rule,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          reminderRules: [...state.reminderRules, newRule],
        }));
      },

      updateReminderRule: (id, updates) => {
        set((state) => ({
          reminderRules: state.reminderRules.map((rule) =>
            rule.id === id
              ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
              : rule
          ),
        }));
      },

      deleteReminderRule: (id) => {
        set((state) => ({
          reminderRules: state.reminderRules.filter((rule) => rule.id !== id),
        }));
      },

      updateCertificatesStatus: () => {
        set((state) => ({
          certificates: state.certificates.map((cert) => ({
            ...cert,
            status: calculateStatus(cert.endDate),
          })),
        }));
      },

      batchUpdateCertificatesStatus: (ids, status) => {
        set((state) => ({
          certificates: state.certificates.map((cert) =>
            ids.includes(cert.id)
              ? { ...cert, status, updatedAt: new Date().toISOString() }
              : cert
          ),
        }));
      },
    }),
    {
      name: 'certificate-manager-storage',
    }
  )
);
