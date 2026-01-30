/**
 * Data Classification Schema for CASA Compliance (Q4 & Q5)
 * 
 * This document defines protection levels for all sensitive data
 * and establishes protection requirements for each level.
 */

// =============================================================================
// PROTECTION LEVELS (Q4: Data Classification)
// =============================================================================

export enum ProtectionLevel {
  PUBLIC = "PUBLIC",           // Level 0: No restrictions
  INTERNAL = "INTERNAL",       // Level 1: Internal use only
  CONFIDENTIAL = "CONFIDENTIAL", // Level 2: Sensitive personal data
  RESTRICTED = "RESTRICTED"    // Level 3: Highest protection (credentials, keys)
}

// =============================================================================
// DATA CLASSIFICATION INVENTORY (Q4: Sensitive Data Identification)
// =============================================================================

export interface DataClassification {
  dataType: string;
  description: string;
  level: ProtectionLevel;
  examples: string[];
  storageLocation: string;
}

export const DATA_CLASSIFICATIONS: DataClassification[] = [
  // RESTRICTED (Level 3) - Highest Protection
  {
    dataType: "User Passwords",
    description: "User authentication credentials",
    level: ProtectionLevel.RESTRICTED,
    examples: ["password field in users table"],
    storageLocation: "PostgreSQL (hashed with scrypt + random salt)"
  },
  {
    dataType: "API Keys & Secrets",
    description: "Third-party service credentials",
    level: ProtectionLevel.RESTRICTED,
    examples: ["NYLAS_API_KEY", "OPENAI_API_KEY", "STRIPE_SECRET_KEY", "SESSION_SECRET"],
    storageLocation: "Environment variables (encrypted at rest by Replit)"
  },
  {
    dataType: "OAuth Tokens",
    description: "Nylas grant tokens for email access",
    level: ProtectionLevel.RESTRICTED,
    examples: ["grantId in nylas_grants table"],
    storageLocation: "PostgreSQL (encrypted connection)"
  },
  {
    dataType: "Session Tokens",
    description: "User session identifiers",
    level: ProtectionLevel.RESTRICTED,
    examples: ["connect.sid cookie", "session data in user_sessions table"],
    storageLocation: "PostgreSQL + httpOnly secure cookies"
  },
  {
    dataType: "2FA Verification Codes",
    description: "Time-limited verification codes",
    level: ProtectionLevel.RESTRICTED,
    examples: ["6-digit codes for email verification"],
    storageLocation: "PostgreSQL (auto-expired after 10 minutes)"
  },
  {
    dataType: "Payment Information",
    description: "Stripe customer and payment data",
    level: ProtectionLevel.RESTRICTED,
    examples: ["stripeCustomerId", "stripeSubscriptionId"],
    storageLocation: "PostgreSQL (Stripe handles actual card data)"
  },

  // CONFIDENTIAL (Level 2) - Sensitive Personal Data
  {
    dataType: "Email Content",
    description: "User email messages and bodies",
    level: ProtectionLevel.CONFIDENTIAL,
    examples: ["Email body text", "Email subjects", "Email attachments"],
    storageLocation: "Nylas API (not stored locally, fetched on demand)"
  },
  {
    dataType: "User Email Addresses",
    description: "Personal identifiable email addresses",
    level: ProtectionLevel.CONFIDENTIAL,
    examples: ["email field in users table", "sender/recipient addresses"],
    storageLocation: "PostgreSQL"
  },
  {
    dataType: "AI-Generated Drafts",
    description: "AI-composed email responses",
    level: ProtectionLevel.CONFIDENTIAL,
    examples: ["Draft content in drafts table"],
    storageLocation: "PostgreSQL"
  },
  {
    dataType: "Writing Style Data",
    description: "Learned user writing patterns",
    level: ProtectionLevel.CONFIDENTIAL,
    examples: ["Vocabulary, tone, phrases in learned_writing_styles table"],
    storageLocation: "PostgreSQL"
  },
  {
    dataType: "Security Audit Logs",
    description: "Logs of sensitive user actions",
    level: ProtectionLevel.CONFIDENTIAL,
    examples: ["Login attempts", "Password changes", "Email sends"],
    storageLocation: "PostgreSQL (security_audit_logs table)"
  },

  // INTERNAL (Level 1) - Internal Use Only
  {
    dataType: "User Preferences",
    description: "Application settings and preferences",
    level: ProtectionLevel.INTERNAL,
    examples: ["aiPreferences", "signatureEnabled", "theme settings"],
    storageLocation: "PostgreSQL"
  },
  {
    dataType: "Subscription Status",
    description: "User plan and billing status",
    level: ProtectionLevel.INTERNAL,
    examples: ["plan field (free/pro/business)", "subscription dates"],
    storageLocation: "PostgreSQL"
  },
  {
    dataType: "Custom Folders",
    description: "User-created email organization",
    level: ProtectionLevel.INTERNAL,
    examples: ["Folder names in custom_folders table"],
    storageLocation: "PostgreSQL"
  },
  {
    dataType: "Usage Metrics",
    description: "Daily counts and limits",
    level: ProtectionLevel.INTERNAL,
    examples: ["dailyAIDraftCount", "dailySendCount"],
    storageLocation: "PostgreSQL"
  },

  // PUBLIC (Level 0) - No Restrictions
  {
    dataType: "Application Metadata",
    description: "Non-sensitive app information",
    level: ProtectionLevel.PUBLIC,
    examples: ["App name", "Version", "Feature flags"],
    storageLocation: "Code/Configuration"
  },
  {
    dataType: "Pricing Information",
    description: "Plan pricing and features",
    level: ProtectionLevel.PUBLIC,
    examples: ["$10/month Pro", "$29/month Business"],
    storageLocation: "Frontend code"
  }
];

// =============================================================================
// PROTECTION REQUIREMENTS PER LEVEL (Q5: Protection Requirements)
// =============================================================================

export interface ProtectionRequirements {
  level: ProtectionLevel;
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    method: string;
  };
  accessControl: {
    authentication: boolean;
    authorization: boolean;
    mfa: boolean;
    sessionRequired: boolean;
  };
  logging: {
    accessLogged: boolean;
    modificationLogged: boolean;
    retentionDays: number;
  };
  dataHandling: {
    canExport: boolean;
    canDelete: boolean;
    retentionPolicy: string;
    disposalMethod: string;
  };
  transmission: {
    httpsRequired: boolean;
    apiRateLimited: boolean;
    maxRequestsPerMinute: number;
  };
}

export const PROTECTION_REQUIREMENTS: Record<ProtectionLevel, ProtectionRequirements> = {
  [ProtectionLevel.RESTRICTED]: {
    level: ProtectionLevel.RESTRICTED,
    encryption: {
      atRest: true,
      inTransit: true,
      method: "scrypt hashing (passwords), AES-256 (secrets), TLS 1.3 (transit)"
    },
    accessControl: {
      authentication: true,
      authorization: true,
      mfa: true,
      sessionRequired: true
    },
    logging: {
      accessLogged: true,
      modificationLogged: true,
      retentionDays: 365
    },
    dataHandling: {
      canExport: false,
      canDelete: true,
      retentionPolicy: "Deleted on account deletion or password change",
      disposalMethod: "Cryptographic erasure"
    },
    transmission: {
      httpsRequired: true,
      apiRateLimited: true,
      maxRequestsPerMinute: 10
    }
  },

  [ProtectionLevel.CONFIDENTIAL]: {
    level: ProtectionLevel.CONFIDENTIAL,
    encryption: {
      atRest: true,
      inTransit: true,
      method: "PostgreSQL encryption, TLS 1.3"
    },
    accessControl: {
      authentication: true,
      authorization: true,
      mfa: false,
      sessionRequired: true
    },
    logging: {
      accessLogged: true,
      modificationLogged: true,
      retentionDays: 90
    },
    dataHandling: {
      canExport: true,
      canDelete: true,
      retentionPolicy: "Retained while account active, deleted on request",
      disposalMethod: "Secure deletion from database"
    },
    transmission: {
      httpsRequired: true,
      apiRateLimited: true,
      maxRequestsPerMinute: 100
    }
  },

  [ProtectionLevel.INTERNAL]: {
    level: ProtectionLevel.INTERNAL,
    encryption: {
      atRest: true,
      inTransit: true,
      method: "PostgreSQL encryption, TLS 1.3"
    },
    accessControl: {
      authentication: true,
      authorization: true,
      mfa: false,
      sessionRequired: true
    },
    logging: {
      accessLogged: false,
      modificationLogged: true,
      retentionDays: 30
    },
    dataHandling: {
      canExport: true,
      canDelete: true,
      retentionPolicy: "Retained while account active",
      disposalMethod: "Standard database deletion"
    },
    transmission: {
      httpsRequired: true,
      apiRateLimited: true,
      maxRequestsPerMinute: 100
    }
  },

  [ProtectionLevel.PUBLIC]: {
    level: ProtectionLevel.PUBLIC,
    encryption: {
      atRest: false,
      inTransit: true,
      method: "TLS 1.3 for transit only"
    },
    accessControl: {
      authentication: false,
      authorization: false,
      mfa: false,
      sessionRequired: false
    },
    logging: {
      accessLogged: false,
      modificationLogged: false,
      retentionDays: 0
    },
    dataHandling: {
      canExport: true,
      canDelete: false,
      retentionPolicy: "No retention policy needed",
      disposalMethod: "N/A"
    },
    transmission: {
      httpsRequired: true,
      apiRateLimited: false,
      maxRequestsPerMinute: 0
    }
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getDataClassification(dataType: string): DataClassification | undefined {
  return DATA_CLASSIFICATIONS.find(d => d.dataType === dataType);
}

export function getProtectionRequirements(level: ProtectionLevel): ProtectionRequirements {
  return PROTECTION_REQUIREMENTS[level];
}

export function getDataByLevel(level: ProtectionLevel): DataClassification[] {
  return DATA_CLASSIFICATIONS.filter(d => d.level === level);
}

// =============================================================================
// COMPLIANCE SUMMARY
// =============================================================================

export const COMPLIANCE_SUMMARY = {
  casaQ4: {
    question: "Is all sensitive data identified and classified into protection levels?",
    answer: "YES",
    evidence: [
      "All data types are classified into 4 protection levels: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED",
      "Each data type has documented storage location and examples",
      "Classification schema defined in shared/data-classification.ts"
    ]
  },
  casaQ5: {
    question: "Do all protection levels have an associated set of protection requirements?",
    answer: "YES",
    evidence: [
      "Each protection level has defined requirements for: encryption, access control, logging, data handling, transmission",
      "RESTRICTED level requires MFA, encryption at rest, and 365-day audit log retention",
      "CONFIDENTIAL level requires authentication, encryption, and 90-day log retention",
      "INTERNAL level requires authentication and 30-day modification logging",
      "PUBLIC level requires HTTPS transmission only",
      "Requirements defined in PROTECTION_REQUIREMENTS object"
    ]
  }
};
