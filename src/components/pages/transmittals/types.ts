// Transmittal page types

export interface TransmittalItem {
  id: string;
  projectId: string;
  number: string;
  subject: string;
  fromId: string;
  toName: string;
  toEmail: string;
  toCompany: string;
  toPhone: string;
  deliveryMethod: string;
  status: string;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  from: { id: string; name: string; email: string } | null;
  items: TransmittalDetailItem[];
}

export interface TransmittalDetailItem {
  id: string;
  transmittalId: string;
  documentNumber: string;
  title: string;
  revision: string;
  copies: number;
  purpose: string;
  received: boolean;
  approved: boolean;
  rejected: boolean;
  needsRevision: boolean;
  replyNotes: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}
