import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Certificate, Record, ReminderRule, Store } from '../types';
import { initialCertificates, initialRecords, initialReminderRules, stores } from '../data';
import { calculateStatus, generateId } from '../utils';

interface AppState {
  certificates: Certificate[];
  records: Record[];
  reminderRules: ReminderRule[];
  stores: Store[];
  
  addCertificate: (certificate: Omit<Certificate, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  updateCertificate: (id: string, updates: Partial<Certificate>) => void;
  deleteCertificate: (id: string) => void;
  
  addRecord: (record: Omit<Record, 'id' | 'createdAt'>) => void;
  updateRecord: (id: string, updates: Partial<Record>) => void;
  
  addReminderRule: (rule: Omit<ReminderRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReminderRule: (id: string, updates: Partial<ReminderRule>) => void;
  deleteReminderRule: (id: string) => void;
  
  updateCertificatesStatus: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
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
                  status: updates.endDate ? calculateStatus(updates.endDate) : cert.status,
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
        const newRecord: Record = {
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
    }),
    {
      name: 'certificate-manager-storage',
    }
  )
);
