export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  isActive: boolean;
  department?: string;
  position?: string;
}

export interface Employee {
  id: string;
  userId: string;
  department: string;
  position: string;
  salary: number;
  employmentStatus: string;
  hireDate: string | null;
  createdAt: string;
  user: EmployeeUser;
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}
