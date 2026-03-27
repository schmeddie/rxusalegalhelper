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

export interface CaseTranscript {
  id: string;
  caseId: string;
  fileName: string;
  rawText: string;
  createdAt: string;
}

export interface MessageNote {
  id: string;
  caseId: string;
  transcriptId: string;
  messageId: number;
  text: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  fileName: string;
  fileData: ArrayBuffer;
  placeholders: string[];
  mappings: PlaceholderMapping[];
  createdAt: string;
}
