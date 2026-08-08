import type { CertificateStatus, NoticeStatus } from "@/types/database";

export interface JobComplianceInput {
  requiresTesting: boolean;
  hasTestRecords: boolean;
  requiresCertificate: boolean;
  certificateStatus: CertificateStatus;
  requiresNotice: boolean;
  noticeStatus: NoticeStatus;
}

export interface JobCompliance {
  testingCompleted: boolean;
  complianceComplete: boolean;
}

// testing_completed and compliance_complete are deliberately never stored
// columns -- both are derived here so they can't drift out of sync with the
// test_records/compliance_documents they depend on. A requirement that
// isn't flagged doesn't block compliance_complete at all (e.g. a job with
// no certificate or notice required can be complete from testing alone).
export function computeJobCompliance(input: JobComplianceInput): JobCompliance {
  const testingCompleted = input.hasTestRecords;

  const testingSatisfied = !input.requiresTesting || testingCompleted;
  const certificateSatisfied =
    !input.requiresCertificate || input.certificateStatus === "Issued";
  const noticeSatisfied = !input.requiresNotice || input.noticeStatus === "Lodged";

  return {
    testingCompleted,
    complianceComplete: testingSatisfied && certificateSatisfied && noticeSatisfied,
  };
}
