export interface Case {
  id: string;
  caseName: string;
  caseNumber: string;
  assignedJudge: string;
  charges: string;
  defendantName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceholderMapping {
  placeholder: string;
  variable: CaseVariable;
}

export type CaseVariable =
  | "caseName"
  | "caseNumber"
  | "assignedJudge"
  | "charges"
  | "defendantName"
  | "currentDate";

export const CASE_VARIABLE_LABELS: Record<CaseVariable, string> = {
  caseName: "Case Name",
  caseNumber: "Case Number",
  assignedJudge: "Assigned Judge",
  charges: "Charges",
  defendantName: "Defendant Name",
  currentDate: "Current Date",
};

export interface Template {
  id: string;
  name: string;
  fileName: string;
  fileData: ArrayBuffer;
  placeholders: string[];
  mappings: PlaceholderMapping[];
  createdAt: string;
}
