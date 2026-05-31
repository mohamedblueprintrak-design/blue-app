// Contract page types

export interface ContractItem {
  id: string;
  number: string;
  title: string;
  value: number;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  clientId: string;
  projectId: string;
  client: { id: string; name: string; company: string };
  project: { id: string; name: string; nameEn: string; number: string };
  _count: { amendments: number };
}

export interface ContractDetail extends ContractItem {
  amendments: Amendment[];
  client: { id: string; name: string; company: string; email: string; phone: string };
  project: { id: string; name: string; nameEn: string; number: string; status: string; type: string };
}

export interface Amendment {
  id: string;
  number: string;
  description: string;
  date: string;
  status: string;
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
