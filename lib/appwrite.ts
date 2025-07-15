import { Client, Account, Databases, ID, Query, AuthenticationFactor, AuthenticatorType } from "appwrite";
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
// ...existing code for ENCRYPTED_FIELDS, getPlaintextFields, COLLECTION_SCHEMAS...

// --- Secure CRUD Operations ---
export class AppwriteService {
  // ...existing code for createCredential, createTOTPSecret, createFolder, createSecurityLog, createUserDoc, hasMasterpass, setMasterpassFlag, getCredential, getTOTPSecret, getFolder, getUserDoc, getSecurityLog, listCredentials, listTOTPSecrets, listFolders, listSecurityLogs, updateCredential, updateTOTPSecret, updateFolder, updateUserDoc, updateSecurityLog, deleteCredential, deleteTOTPSecret, deleteFolder, deleteSecurityLog, deleteUserDoc, logSecurityEvent, encryptDocumentFields, decryptDocumentFields, shouldEncryptField, shouldDecryptField, searchCredentials, bulkCreateCredentials, exportUserData...
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
  } catch (error) {
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
  } catch (error) {
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
export async function createFolder(data: any) {
  return await AppwriteService.createFolder(data);
}
export async function createTotpSecret(data: any) {
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
    ...creds.map((c: any) => AppwriteService.deleteCredential(c.$id)),
    ...totps.map((t: any) => AppwriteService.deleteTOTPSecret(t.$id)),
    ...folders.map((f: any) => AppwriteService.deleteFolder(f.$id)),
    ...logs.map((l: any) => AppwriteService.deleteSecurityLog(l.$id)),
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
  // ...existing code for wiping user data and clearing check value...
}
export async function searchCredentials(userId: string, searchTerm: string) {
  return await AppwriteService.searchCredentials(userId, searchTerm);
}
export async function listCredentials(userId: string) {
  return await AppwriteService.listCredentials(userId);
}
export async function createCredential(data: any) {
  return await AppwriteService.createCredential(data);
}
export async function updateCredential(id: string, data: any) {
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
  } catch (error) {
    return {
      enabled: false,
      factors: { totp: false, email: false, phone: false },
      requiresSetup: false
    };
  }
}
  }
}
