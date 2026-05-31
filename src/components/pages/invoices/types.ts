export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  remaining: number;
  status: string;
  clientId: string;
  projectId: string;
  client: { id: string; name: string; company: string };
  project: { id: string; name: string; nameEn: string; number: string };
  items: InvoiceItem[];
}

export interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

export interface ClientOption {
  id: string;
  name: string;
  company: string;
}
