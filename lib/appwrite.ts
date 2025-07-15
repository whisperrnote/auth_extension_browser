import { Client, Account, Databases, ID, Query, AuthenticationFactor, AuthenticatorType } from "appwrite"; // Add this line
import type { Credentials, TotpSecrets, Folders, SecurityLogs, User } from "../types/appwrite.d";
import { updateMasterpassCheckValue, masterPassCrypto } from "../app/(protected)/masterpass/logic";
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_CREDENTIALS_ID,
  APPWRITE_COLLECTION_TOTPSECRETS_ID,
  APPWRITE_COLLECTION_FOLDERS_ID,
  APPWRITE_COLLECTION_SECURITYLOGS_ID,
  APPWRITE_COLLECTION_USER_ID,
} from "./constants";

// --- Appwrite Client Setup ---
const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const appwriteAccount = new Account(appwriteClient);
const appwriteDatabases = new Databases(appwriteClient);

// --- Collection Structure & Field Mappings ---
const ENCRYPTED_FIELDS = {
  credentials: ['username', 'password', 'notes', 'customFields'],
  totpSecrets: ['secretKey'],
  folders: [],
  securityLogs: [],
  user: [],
} as const;

function getPlaintextFields<T>(allFields: (keyof T)[], encrypted: readonly string[]): string[] {
  return allFields.filter(f => !encrypted.includes(f as string)).map(f => f as string);
}

export const COLLECTION_SCHEMAS = {
  credentials: {
    encrypted: ENCRYPTED_FIELDS.credentials,
    plaintext: getPlaintextFields<Credentials>(
      [
        'userId', 'name', 'url', 'username', 'notes', 'folderId', 'tags', 'customFields',
        'faviconUrl', 'createdAt', 'updatedAt', 'password', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.credentials
    ),
  },
  totpSecrets: {
    encrypted: ENCRYPTED_FIELDS.totpSecrets,
    plaintext: getPlaintextFields<TotpSecrets>(
      [
        'userId', 'issuer', 'accountName', 'secretKey', 'algorithm', 'digits', 'period',
        'folderId', 'createdAt', 'updatedAt', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.totpSecrets
    ),
  },
  folders: {
    encrypted: ENCRYPTED_FIELDS.folders,
    plaintext: getPlaintextFields<Folders>(
      [
        'userId', 'name', 'parentFolderId', 'createdAt', 'updatedAt', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.folders
    ),
  },
  securityLogs: {
    encrypted: ENCRYPTED_FIELDS.securityLogs,
    plaintext: getPlaintextFields<SecurityLogs>(
      [
        'userId', 'eventType', 'ipAddress', 'userAgent', 'details', 'timestamp',
        '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.securityLogs
    ),
  },
  user: {
    encrypted: ENCRYPTED_FIELDS.user,
    plaintext: getPlaintextFields<User>(
      [
        'userId', 'email', 'masterpass', 'twofa', 'check', '$id', '$createdAt', '$updatedAt'
      ],
      ENCRYPTED_FIELDS.user
    ),
  }
};

// --- Secure CRUD Operations ---
export class AppwriteService {
  static async createCredential(data: Omit<Credentials, '$id' | '$createdAt' | '$updatedAt'>): Promise<Credentials> {
    const encryptedData = await this.encryptDocumentFields(data, 'credentials');
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      ID.unique(),
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async createTOTPSecret(data: Omit<TotpSecrets, '$id' | '$createdAt' | '$updatedAt'>): Promise<TotpSecrets> {
    const encryptedData = await this.encryptDocumentFields(data, 'totpSecrets');
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      ID.unique(),
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async createFolder(data: Omit<Folders, '$id' | '$createdAt' | '$updatedAt'>): Promise<Folders> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      ID.unique(),
      data
    );
    return doc as Folders;
  }

  static async createSecurityLog(data: Omit<SecurityLogs, '$id'>): Promise<SecurityLogs> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      ID.unique(),
      data
    );
    return doc as SecurityLogs;
  }

  static async createUserDoc(data: Omit<User, '$id'>): Promise<User> {
    const doc = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      ID.unique(),
      data
    );
    return doc as User;
  }

  static async hasMasterpass(userId: string): Promise<boolean> {
    const userDoc = await this.getUserDoc(userId);
    return !!(userDoc && userDoc.masterpass === true);
  }

  static async setMasterpassFlag(userId: string, email: string): Promise<void> {
    const userDoc = await this.getUserDoc(userId);
    if (userDoc && userDoc.$id) {
      await appwriteDatabases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, userDoc.$id, { masterpass: true });
    } else {
      await appwriteDatabases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, ID.unique(), {
        userId,
        email,
        masterpass: true,
      });
    }
    await masterPassCrypto.setMasterpassCheck(userId);
  }

  static async getCredential(id: string): Promise<Credentials> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async getTOTPSecret(id: string): Promise<TotpSecrets> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async getFolder(id: string): Promise<Folders> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id
    );
    return doc as Folders;
  }

  static async getUserDoc(userId: string): Promise<User | null> {
    try {
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal('userId', userId)]
      );
      const doc = response.documents[0];
      if (!doc) return null;
      return doc as User;
    } catch {
      return null;
    }
  }

  static async getSecurityLog(id: string): Promise<SecurityLogs> {
    const doc = await appwriteDatabases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id
    );
    return doc as SecurityLogs;
  }

  static async listCredentials(userId: string, queries: string[] = []): Promise<Credentials[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      [Query.equal('userId', userId), ...queries]
    );

    return await Promise.all(
      response.documents.map((doc: any) => this.decryptDocumentFields(doc, 'credentials'))
    );
  }

  static async listTOTPSecrets(userId: string, queries: string[] = []): Promise<TotpSecrets[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    return await Promise.all(
      response.documents.map((doc: any) => this.decryptDocumentFields(doc, 'totpSecrets'))
    );
  }

  static async listFolders(userId: string, queries: string[] = []): Promise<Folders[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      [Query.equal('userId', userId), ...queries]
    );
    return response.documents as Folders[];
  }

  static async listSecurityLogs(userId: string, queries: string[] = []): Promise<SecurityLogs[]> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      [Query.equal('userId', userId), Query.orderDesc('timestamp'), ...queries]
    );
    return response.documents as SecurityLogs[];
  }

  static async updateCredential(id: string, data: Partial<Credentials>): Promise<Credentials> {
    const encryptedData = await this.encryptDocumentFields(data, 'credentials');
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id,
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'credentials');
  }

  static async updateTOTPSecret(id: string, data: Partial<TotpSecrets>): Promise<TotpSecrets> {
    const encryptedData = await this.encryptDocumentFields(data, 'totpSecrets');
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id,
      encryptedData
    );
    return await this.decryptDocumentFields(doc, 'totpSecrets');
  }

  static async updateFolder(id: string, data: Partial<Folders>): Promise<Folders> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id,
      data
    );
    return doc as Folders;
  }

  static async updateUserDoc(id: string, data: Partial<User>): Promise<User> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      id,
      data
    );
    return doc as User;
  }

  static async updateSecurityLog(id: string, data: Partial<SecurityLogs>): Promise<SecurityLogs> {
    const doc = await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id,
      data
    );
    return doc as SecurityLogs;
  }

  static async deleteCredential(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      id
    );
  }

  static async deleteTOTPSecret(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      id
    );
  }

  static async deleteFolder(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      id
    );
  }

  static async deleteSecurityLog(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      id
    );
  }

  static async deleteUserDoc(id: string): Promise<void> {
    await appwriteDatabases.deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      id
    );
  }

  static async logSecurityEvent(
    userId: string,
    eventType: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createSecurityLog({
      userId,
      eventType,
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      timestamp: new Date().toISOString()
    });
  }

  private static async encryptDocumentFields(data: any, collectionType: keyof typeof COLLECTION_SCHEMAS): Promise<any> {
    const schema = COLLECTION_SCHEMAS[collectionType];
    const result = { ...data };

    if (!masterPassCrypto.isVaultUnlocked()) {
      throw new Error('Vault is locked - cannot encrypt data');
    }

    for (const field of schema.encrypted) {
      const fieldValue = result[field];
      if (this.shouldEncryptField(fieldValue)) {
        try {
          result[field] = await masterPassCrypto.encryptField(String(fieldValue));
        } catch (error) {
          throw new Error(`Encryption failed for ${field}: ${error}`);
        }
      } else {
        delete result[field];
      }
    }
    return result;
  }

  private static async decryptDocumentFields(doc: any, collectionType: keyof typeof COLLECTION_SCHEMAS): Promise<any> {
    const schema = COLLECTION_SCHEMAS[collectionType];
    const result = { ...doc };

    if (!masterPassCrypto.isVaultUnlocked()) {
      return result;
    }

    for (const field of schema.encrypted) {
      const fieldValue = result[field];
      if (this.shouldDecryptField(fieldValue)) {
        try {
          result[field] = await masterPassCrypto.decryptField(fieldValue);
        } catch {
          result[field] = '[DECRYPTION_FAILED]';
        }
      } else {
        result[field] = fieldValue === null ? null : (fieldValue === undefined ? null : fieldValue);
      }
    }
    return result;
  }

  private static shouldEncryptField(value: any): boolean {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'string' &&
      value.trim().length > 0
    );
  }

  private static shouldDecryptField(value: any): boolean {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'string' &&
      value.length > 20 &&
      /^[A-Za-z0-9+/]+=*$/.test(value)
    );
  }

  static async searchCredentials(userId: string, searchTerm: string): Promise<Credentials[]> {
    const allCredentials = await this.listCredentials(userId);
    const term = searchTerm.toLowerCase();
    return allCredentials.filter(cred =>
      cred.name?.toLowerCase().includes(term) ||
      cred.username?.toLowerCase().includes(term) ||
      (cred.url && cred.url.toLowerCase().includes(term))
    );
  }

  static async bulkCreateCredentials(credentials: Omit<Credentials, '$id' | '$createdAt' | '$updatedAt'>[]): Promise<Credentials[]> {
    return await Promise.all(credentials.map(cred => this.createCredential(cred)));
  }

  static async exportUserData(userId: string): Promise<{
    credentials: Credentials[];
    totpSecrets: TotpSecrets[];
    folders: Folders[];
  }> {
    const [credentials, totpSecrets, folders] = await Promise.all([
      this.listCredentials(userId),
      this.listTOTPSecrets(userId),
      this.listFolders(userId)
    ]);
    return { credentials, totpSecrets, folders };
  }
}

// --- 2FA / MFA Helpers ---
export async function generateRecoveryCodes() {
  return await appwriteAccount.createMfaRecoveryCodes();
}
export async function listMfaFactors() {
  return await appwriteAccount.listMfaFactors();
}
export async function updateMfaStatus(enabled: boolean) {
  return await appwriteAccount.updateMFA(enabled);
}
export async function addTotpFactor() {
  const result = await appwriteAccount.createMfaAuthenticator(AuthenticatorType.Totp);
  return {
    qrUrl: result.uri || "",
    secret: result.secret
  };
}
export async function removeTotpFactor() {
  await appwriteAccount.deleteMfaAuthenticator(AuthenticatorType.Totp);
}
export async function verifyTotpFactor(otp: string) {
  try {
    const challenge = await appwriteAccount.createMfaChallenge(AuthenticationFactor.Totp);
    await appwriteAccount.updateMfaChallenge(challenge.$id, otp);
    return true;
  } catch {
    return false;
  }
}
export async function createMfaChallenge(factor: "totp" | "email" | "phone" | "recoverycode") {
  return await appwriteAccount.createMfaChallenge(AuthenticationFactor.Totp);
}
export async function completeMfaChallenge(challengeId: string, code: string) {
  return await appwriteAccount.updateMfaChallenge(challengeId, code);
}
export async function checkMfaRequired() {
  return await appwriteAccount.get();
}
export async function addEmailFactor(email: string, password?: string) {
  try {
    const factors = await listMfaFactors();
    if (factors.email) {
      return { email };
    }
    if (password) {
      await appwriteAccount.updateEmail(email, password);
    }
    await appwriteAccount.createVerification(window.location.origin + "/verify-email");
    return { email };
  } catch {
    return { email };
  }
}
export async function completeEmailVerification(userId: string, secret: string) {
  await appwriteAccount.updateVerification(userId, secret);
}
export async function createPasswordRecovery(email: string, redirectUrl: string) {
  return await appwriteAccount.createRecovery(email, redirectUrl);
}
export async function updatePasswordRecovery(userId: string, secret: string, password: string) {
  return await appwriteAccount.updateRecovery(userId, secret, password);
}

// --- Email/password login/register ---
export async function loginWithEmailPassword(email: string, password: string) {
  return await appwriteAccount.createEmailPasswordSession(email, password);
}
export async function registerWithEmailPassword(email: string, password: string, name?: string) {
  return await appwriteAccount.create(ID.unique(), email, password, name);
}
export async function sendEmailOtp(email: string, enablePhrase = false) {
  return await appwriteAccount.createEmailToken(ID.unique(), email, enablePhrase);
}
export async function completeEmailOtp(userId: string, otp: string) {
  return await appwriteAccount.createSession(userId, otp);
}
export async function sendMagicUrl(email: string, redirectUrl: string) {
  return await appwriteAccount.createMagicURLToken(ID.unique(), email, redirectUrl);
}
export async function completeMagicUrl(userId: string, secret: string) {
  return await appwriteAccount.createSession(userId, secret);
}

// --- Export everything ---
export {
  appwriteClient,
  appwriteAccount,
  appwriteDatabases,
  ID,
  Query,
};

// --- Helper functions for extension context ---
export async function listTotpSecrets(userId: string) {
  return await AppwriteService.listTOTPSecrets(userId);
}
export async function createFolder(data: Omit<Folders, '$id' | '$createdAt' | '$updatedAt'>) {
  return await AppwriteService.createFolder(data);
}
export async function createTotpSecret(data: Omit<TotpSecrets, '$id' | '$createdAt' | '$updatedAt'>) {
  return await AppwriteService.createTOTPSecret(data);
}
export async function deleteTotpSecret(id: string) {
  return await AppwriteService.deleteTOTPSecret(id);
}
export async function updateUserProfile(userId: string, data: { name?: string; email?: string }) {
  if (data.name) await appwriteAccount.updateName(data.name);
  if (data.email) await appwriteAccount.updateEmail(data.email, ""); // Password required if changing email
  const userDoc = await AppwriteService.getUserDoc(userId);
  if (userDoc && userDoc.$id) {
    await AppwriteService.updateUserDoc(userDoc.$id, data);
  }
}
export async function exportAllUserData(userId: string) {
  return await AppwriteService.exportUserData(userId);
}
export async function deleteUserAccount(userId: string) {
  const userDoc = await AppwriteService.getUserDoc(userId);
  if (userDoc && userDoc.$id) {
    await AppwriteService.deleteUserDoc(userDoc.$id);
  }
  const [creds, totps, folders, logs] = await Promise.all([
    AppwriteService.listCredentials(userId),
    AppwriteService.listTOTPSecrets(userId),
    AppwriteService.listFolders(userId),
    AppwriteService.listSecurityLogs(userId),
  ]);
  await Promise.all([
    ...creds.map((c) => AppwriteService.deleteCredential(c.$id)),
    ...totps.map((t) => AppwriteService.deleteTOTPSecret(t.$id)),
    ...folders.map((f) => AppwriteService.deleteFolder(f.$id)),
    ...logs.map((l) => AppwriteService.deleteSecurityLog(l.$id)),
  ]);
  await appwriteAccount.deleteSession("current");
  // Optionally, delete Appwrite account
  // await appwriteAccount.delete();
}
export async function hasMasterpass(userId: string): Promise<boolean> {
  return await AppwriteService.hasMasterpass(userId);
}
export async function setMasterpassFlag(userId: string, email: string): Promise<void> {
  return await AppwriteService.setMasterpassFlag(userId, email);
}
export async function resetMasterpassAndWipe(userId: string): Promise<void> {
  // Use raw Appwrite database API to avoid decryption
  // Delete user doc
  try {
    const userDocs = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of userDocs.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, doc.$id);
    }
  } catch {}

  // Delete credentials
  try {
    const creds = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_CREDENTIALS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of creds.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_CREDENTIALS_ID, doc.$id);
    }
  } catch {}

  // Delete totp secrets
  try {
    const totps = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_TOTPSECRETS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of totps.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_TOTPSECRETS_ID, doc.$id);
    }
  } catch {}

  // Delete folders
  try {
    const folders = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_FOLDERS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of folders.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_FOLDERS_ID, doc.$id);
    }
  } catch {}

  // Delete security logs
  try {
    const logs = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_SECURITYLOGS_ID,
      [Query.equal('userId', userId)]
    );
    for (const doc of logs.documents) {
      await appwriteDatabases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_SECURITYLOGS_ID, doc.$id);
    }
  } catch {}

  // After reset, clear the check value
  await masterPassCrypto.clearMasterpassCheck(userId);
}
export async function searchCredentials(userId: string, searchTerm: string) {
  return await AppwriteService.searchCredentials(userId, searchTerm);
}
export async function listCredentials(userId: string) {
  return await AppwriteService.listCredentials(userId);
}
export async function createCredential(data: Omit<Credentials, '$id' | '$createdAt' | '$updatedAt'>) {
  return await AppwriteService.createCredential(data);
}
export async function updateCredential(id: string, data: Partial<Credentials>) {
  return await AppwriteService.updateCredential(id, data);
}
export async function deleteCredential(id: string) {
  return await AppwriteService.deleteCredential(id);
}
export async function logoutAppwrite() {
  try {
    await appwriteAccount.deleteSession("current");
  } catch {}
  if (typeof window !== "undefined") {
    sessionStorage.clear();
    localStorage.removeItem("vault_timeout_minutes");
  }
}
export async function removeMfaFactor(factorType: 'totp' | 'email' | 'phone'): Promise<void> {
  if (factorType === 'totp') {
    await removeTotpFactor();
  }
  // Add handling for other factor types as needed
}
export async function getMfaStatus(): Promise<{
  enabled: boolean;
  factors: { totp: boolean; email: boolean; phone: boolean };
  requiresSetup: boolean;
}> {
  try {
    const factors = await listMfaFactors();
    const hasAnyFactor = factors.totp || factors.email || factors.phone;
    let mfaEnabled = false;
    try {
      await checkMfaRequired();
      mfaEnabled = false;
    } catch (error: any) {
      if (error.type === 'user_more_factors_required') {
        mfaEnabled = true;
      }
    }
    return {
      enabled: mfaEnabled,
      factors,
      requiresSetup: hasAnyFactor && !mfaEnabled
    };
  } catch {
    return {
      enabled: false,
      factors: { totp: false, email: false, phone: false },
      requiresSetup: false
    };
  }
}