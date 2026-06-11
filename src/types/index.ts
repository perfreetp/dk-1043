export type CertificateType = 'business_license' | 'qualification' | 'inspection';
export type CertificateStatus = 'normal' | 'expiring' | 'expired';
export type ProcessType = 'new' | 'renewal' | 'change' | 'cancel';
export type ProcessResult = 'processing' | 'approved' | 'rejected';

export interface Certificate {
  id: string;
  code: string;
  type: CertificateType;
  holder: string;
  issuer: string;
  startDate: string;
  endDate: string;
  stores: string[];
  attachment?: string;
  status: CertificateStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Record {
  id: string;
  certificateId: string;
  processType: ProcessType;
  materials: string[];
  acceptTime: string;
  fee: number;
  result: ProcessResult;
  completeTime?: string;
  remark?: string;
  createdAt: string;
}

export interface ReminderRule {
  id: string;
  advanceDays: number;
  handler: string;
  popupEnabled: boolean;
  notificationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  contact: string;
  phone: string;
  createdAt: string;
}

export interface Statistics {
  total: number;
  normal: number;
  expiring: number;
  expired: number;
  byType: Record<string, number>;
  byStore: Record<string, number>;
  byMonth: Record<string, number>;
}

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  business_license: '营业执照',
  qualification: '人员资格证',
  inspection: '设备检验证',
};

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  normal: '正常',
  expiring: '即将到期',
  expired: '已过期',
};

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  new: '新办',
  renewal: '续期',
  change: '变更',
  cancel: '注销',
};

export const PROCESS_RESULT_LABELS: Record<ProcessResult, string> = {
  processing: '受理中',
  approved: '已通过',
  rejected: '未通过',
};
