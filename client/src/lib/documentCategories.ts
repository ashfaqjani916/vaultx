export type CredentialField = {
  key: string;
  label: string;
  type: "text" | "date" | "select";
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type DocumentCategory = {
  id: string;
  name: string;
  description: string;
  fields: CredentialField[];
};

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: "aadhaar",
    name: "Aadhaar Card",
    description: "Unique Identity issued by UIDAI",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "uid", label: "Aadhaar Number (UID)", type: "text", required: true, placeholder: "XXXX XXXX XXXX" },
      { key: "dob", label: "Date of Birth", type: "date", required: true },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"], required: true },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "residency", label: "State of Residency", type: "text", required: true },
    ],
  },
  {
    id: "pan",
    name: "PAN Card",
    description: "Permanent Account Number for tax identity",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "pan", label: "PAN Number", type: "text", required: true, placeholder: "ABCDE1234F" },
      { key: "taxpayerStatus", label: "Taxpayer Status", type: "select", options: ["Individual", "HUF", "Company", "Firm", "Trust"], required: true },
    ],
  },
  {
    id: "passport",
    name: "Passport",
    description: "Travel document issued by Government of India",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "passportNumber", label: "Passport Number", type: "text", required: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true },
      { key: "nationality", label: "Nationality", type: "text", required: true },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "expiryDate", label: "Expiry Date", type: "date", required: true },
    ],
  },
  {
    id: "driving_license",
    name: "Driving License",
    description: "License to operate motor vehicles",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "licenseNumber", label: "License Number", type: "text", required: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true },
      { key: "vehicleClasses", label: "Vehicle Classes", type: "text", required: true, placeholder: "LMV, MCWG, etc." },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "expiryDate", label: "Expiry Date", type: "date", required: true },
    ],
  },
  {
    id: "voter_id",
    name: "Voter ID",
    description: "Electoral Photo Identity Card (EPIC)",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "epicNumber", label: "EPIC Number", type: "text", required: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "constituency", label: "Constituency", type: "text", required: true },
    ],
  },
  {
    id: "birth_certificate",
    name: "Birth Certificate",
    description: "Official record of birth",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true },
      { key: "placeOfBirth", label: "Place of Birth", type: "text", required: true },
      { key: "fatherName", label: "Father's Name", type: "text", required: true },
      { key: "motherName", label: "Mother's Name", type: "text", required: true },
    ],
  },
  {
    id: "ration_card",
    name: "Ration Card",
    description: "Document for public distribution system",
    fields: [
      { key: "name", label: "Head of Family", type: "text", required: true },
      { key: "cardNumber", label: "Ration Card Number", type: "text", required: true },
      { key: "category", label: "Category", type: "select", options: ["APL", "BPL", "AAY", "PHH"], required: true },
      { key: "familyMembers", label: "Number of Family Members", type: "text", required: true },
      { key: "address", label: "Address", type: "text", required: true },
    ],
  },
  {
    id: "income_certificate",
    name: "Income Certificate",
    description: "Certificate of annual income",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "annualIncome", label: "Annual Income (INR)", type: "text", required: true },
      { key: "incomeBracket", label: "Income Bracket", type: "select", options: ["Below 1 Lakh", "1-2.5 Lakhs", "2.5-5 Lakhs", "5-10 Lakhs", "Above 10 Lakhs"], required: true },
      { key: "economicStatus", label: "Economic Status", type: "select", options: ["EWS", "BPL", "APL"], required: true },
    ],
  },
  {
    id: "caste_certificate",
    name: "Caste Certificate",
    description: "Certificate of caste category",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "casteCategory", label: "Caste Category", type: "select", options: ["General", "OBC", "SC", "ST"], required: true },
      { key: "caste", label: "Caste/Tribe Name", type: "text", required: true },
      { key: "issuingAuthority", label: "Issuing Authority", type: "text", required: true },
    ],
  },
  {
    id: "domicile_certificate",
    name: "Domicile Certificate",
    description: "Proof of state residency",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "state", label: "State", type: "text", required: true },
      { key: "district", label: "District", type: "text", required: true },
      { key: "residenceSince", label: "Resident Since", type: "date", required: true },
    ],
  },
  {
    id: "education_certificate",
    name: "Education Certificate",
    description: "Academic qualification certificate",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "qualification", label: "Qualification", type: "select", options: ["10th", "12th", "Diploma", "Bachelors", "Masters", "PhD"], required: true },
      { key: "institution", label: "Institution Name", type: "text", required: true },
      { key: "yearOfPassing", label: "Year of Passing", type: "text", required: true },
      { key: "grade", label: "Grade/Percentage", type: "text" },
    ],
  },
  {
    id: "employment_certificate",
    name: "Employment Certificate",
    description: "Proof of employment and work experience",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "organization", label: "Organization", type: "text", required: true },
      { key: "role", label: "Designation/Role", type: "text", required: true },
      { key: "employmentStatus", label: "Employment Status", type: "select", options: ["Active", "Former", "Contract"], required: true },
      { key: "experience", label: "Years of Experience", type: "text" },
    ],
  },
];

export function getCategoryByClaimType(claimType: string): DocumentCategory | undefined {
  const lower = claimType.toLowerCase().trim();
  return DOCUMENT_CATEGORIES.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      c.id === lower ||
      lower.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(lower)
  );
}
