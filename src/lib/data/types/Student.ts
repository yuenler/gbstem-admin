interface Student {
  name: string;
  email: string;
  secondaryEmail: string;
  phone: string;
  grade: number;
  school: string;
  parentName?: string;
}

export type { Student as default };