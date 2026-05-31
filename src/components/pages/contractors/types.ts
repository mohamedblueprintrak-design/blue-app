// ===== Types =====
interface ContractorItem {
  id: string;
  name: string;
  nameEn: string;
  companyName: string;
  companyEn: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  crNumber: string;
  licenseNumber: string;
  licenseExpiry: string | null;
  classification: string;
  establishmentDate: string | null;
  workerCount: number;
  engineerCount: number;
  tradeLicense: string;
  tradeLicenseExpiry: string | null;
  vatNumber: string;
  category: string;
  rating: number;
  specialties: string;
  experience: string;
  bankName: string;
  bankAccount: string;
  iban: string;
  isActive: boolean;
  notes: string;
  _count: { bids: number; evaluations: number };
}

interface ContractorDetail extends ContractorItem {
  bids: {
    id: string;
    projectId: string;
    contractorName: string;
    amount: number;
    status: string;
    createdAt: string;
    project: { id: string; name: string; nameEn: string; number: string };
  }[];
}

interface RFQItem {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  category: string;
  deadline: string;
  status: "DRAFT" | "SENT" | "IN_REVIEW" | "AWARDED" | "CANCELLED";
  createdAt: string;
  contractorIds: string[];
  responseCount: number;
}

const emptyForm = {
  name: "", nameEn: "", companyName: "", companyEn: "", contactPerson: "",
  phone: "", email: "", address: "", crNumber: "", licenseNumber: "",
  licenseExpiry: "", classification: "", establishmentDate: "", workerCount: "", engineerCount: "",
  tradeLicense: "", tradeLicenseExpiry: "", vatNumber: "", category: "CIVIL", rating: "3", specialties: "",
  experience: "", bankName: "", bankAccount: "", iban: "", isActive: true, notes: "",
};

// Demo RFQ data for initial display
const DEMO_RFQS: RFQItem[] = [
  {
    id: "rfq-001",
    title: "أعمال الحفر والأساسات - فيلا فاخرة",
    description: "طلب تسعير لأعمال الحفر وتأسيس الأساسات لمشروع فيلا فاخرة في المنطقة الأولى بدبي",
    projectId: "prj-001",
    projectName: "فيلا فاخرة - المنطقة الأولى",
    category: "CIVIL",
    deadline: "2024-06-15",
    status: "SENT",
    createdAt: "2024-05-01",
    contractorIds: ["c1", "c2"],
    responseCount: 2,
  },
  {
    id: "rfq-002",
    title: "أعمال التكييف المركزي - مبنى سكني",
    description: "طلب تسعير لتوريد وتركيب نظام التكييف المركزي للمبنى السكني متعدد الطوابق",
    projectId: "prj-002",
    projectName: "مبنى سكني متعدد الطوابق",
    category: "HVAC",
    deadline: "2024-07-01",
    status: "IN_REVIEW",
    createdAt: "2024-05-10",
    contractorIds: ["c3"],
    responseCount: 1,
  },
  {
    id: "rfq-003",
    title: "أعمال التشطيبات الداخلية - مجمع تجاري",
    description: "طلب تسعير لأعمال التشطيبات الداخلية للمجمع التجاري في المنطقة الحرة",
    projectId: "prj-003",
    projectName: "مجمع تجاري - المنطقة الحرة",
    category: "FINISHING",
    deadline: "2024-08-15",
    status: "DRAFT",
    createdAt: "2024-05-20",
    contractorIds: [],
    responseCount: 0,
  },
];

export type { ContractorItem, ContractorDetail, RFQItem };
export { emptyForm, DEMO_RFQS };
