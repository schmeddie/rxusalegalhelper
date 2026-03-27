export type CaseStatus =
  | "Pre-Filing"
  | "Filed"
  | "Pre-Trial"
  | "Discovery"
  | "Trial"
  | "Sentencing"
  | "Closed"
  | "Dismissed";

export const CASE_STATUSES: CaseStatus[] = [
  "Pre-Filing",
  "Filed",
  "Pre-Trial",
  "Discovery",
  "Trial",
  "Sentencing",
  "Closed",
  "Dismissed",
];

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  "Pre-Filing": "bg-zinc-500/15 text-zinc-400",
  Filed: "bg-blue-500/15 text-blue-400",
  "Pre-Trial": "bg-purple-500/15 text-purple-400",
  Discovery: "bg-cyan-500/15 text-cyan-400",
  Trial: "bg-amber-500/15 text-amber-400",
  Sentencing: "bg-orange-500/15 text-orange-400",
  Closed: "bg-green-500/15 text-green-400",
  Dismissed: "bg-red-500/15 text-red-400",
};

export interface Case {
  id: string;
  caseName: string;
  caseNumber: string;
  assignedJudge: string;
  charges: string;
  defendantName: string;
  status: CaseStatus;
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
  | "currentDate"
  | "evidence"
  | "information"
  | "witnesses";

export const CASE_VARIABLE_LABELS: Record<CaseVariable, string> = {
  caseName: "Case Name",
  caseNumber: "Case Number",
  assignedJudge: "Assigned Judge",
  charges: "Charges (names only)",
  defendantName: "Defendant Name",
  currentDate: "Current Date",
  evidence: "Evidence (Exhibits List)",
  information: "Information (Charges Detail)",
  witnesses: "Witness List",
};

export type OffenseClass =
  | "Class A Felony"
  | "Class B Felony"
  | "Class C Felony"
  | "Class A Misdemeanor"
  | "Class B Misdemeanor"
  | "Class C Misdemeanor"
  | "Infraction"
  | "Petty Offense";

export const OFFENSE_CLASSES: OffenseClass[] = [
  "Class A Felony",
  "Class B Felony",
  "Class C Felony",
  "Class A Misdemeanor",
  "Class B Misdemeanor",
  "Class C Misdemeanor",
  "Infraction",
  "Petty Offense",
];

export interface Charge {
  id: string;
  caseId: string;
  countNumber: number;
  chargeName: string;
  offenseClass: OffenseClass;
  description: string;
  createdAt: string;
}

export type ExhibitMediaType = "image" | "link" | "other";

export interface Exhibit {
  id: string;
  caseId: string;
  exhibitNumber: number;
  exhibitLetter: string;
  name: string;
  mediaType: ExhibitMediaType;
  source: string;
  description: string;
  imageData?: string;
  createdAt: string;
}

export interface Witness {
  id: string;
  caseId: string;
  witnessNumber: number;
  name: string;
  affiliation: string;
  expectedTestimony: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  caseId: string;
  type: "auto" | "manual";
  action: string;
  detail: string;
  createdAt: string;
}

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
