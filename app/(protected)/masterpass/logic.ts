import { appwriteDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USER_ID, APPWRITE_COLLECTION_CREDENTIALS_ID, APPWRITE_COLLECTION_TOTPSECRETS_ID, APPWRITE_COLLECTION_FOLDERS_ID, APPWRITE_COLLECTION_SECURITYLOGS_ID, Query } from "../../../lib/appwrite";
import type { User } from "../../../types/appwrite.d";

class MasterPassCrypto {
  encryptField(arg0: string): any {
      throw new Error("Method not implemented.");
  }
  decryptField(fieldValue: any): any {
      throw new Error("Method not implemented.");
  }
  private static instance: MasterPassCrypto;
  private masterKey: CryptoKey | null = null;
  private isUnlocked = false;
  private static readonly DEFAULT_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  static getInstance(): MasterPassCrypto {
    if (!MasterPassCrypto.instance) {
      MasterPassCrypto.instance = new MasterPassCrypto();
    }
    return MasterPassCrypto.instance;
  }

  private static readonly PBKDF2_ITERATIONS = 200000;
  private static readonly SALT_SIZE = 32;
  private static readonly IV_SIZE = 16;
  private static readonly KEY_SIZE = 256;

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: MasterPassCrypto.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: MasterPassCrypto.KEY_SIZE },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async unlock(masterPassword: string, userId: string, isFirstTime: boolean = false): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const userBytes = encoder.encode(userId);
      const userSalt = await crypto.subtle.digest('SHA-256', userBytes);
      const combinedSalt = new Uint8Array(userSalt);
      const testKey = await this.deriveKey(masterPassword, combinedSalt);

      if (isFirstTime) {
        this.masterKey = testKey;
        this.isUnlocked = true;
        sessionStorage.setItem('vault_unlocked', Date.now().toString());
        return true;
      }

      const isValidPassword = await this.verifyMasterpassCheck(testKey, userId);
      if (!isValidPassword) return false;

      this.masterKey = testKey;
      this.isUnlocked = true;
      sessionStorage.setItem('vault_unlocked', Date.now().toString());
      return true;
    } catch {
      return false;
    }
  }

  async setMasterpassCheck(userId: string): Promise<void> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal('userId', userId)]
    );
    const userDoc = response.documents[0];
    if (!userDoc) return;
    const check = await this.encryptCheckValue(userId);
    await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      userDoc.$id,
      { check }
    );
  }

  async verifyMasterpassCheck(testKey: CryptoKey, userId: string): Promise<boolean> {
    try {
      const response = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_USER_ID,
        [Query.equal('userId', userId)]
      );
      const userDoc = response.documents[0];
      if (!userDoc || !userDoc.check) return false;
      const decrypted = await this.decryptCheckValue(userDoc.check, testKey);
      return decrypted === userId;
    } catch {
      return false;
    }
  }

  async clearMasterpassCheck(userId: string): Promise<void> {
    const response = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      [Query.equal('userId', userId)]
    );
    const userDoc = response.documents[0];
    if (!userDoc) return;
    await appwriteDatabases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_USER_ID,
      userDoc.$id,
      { check: null }
    );
  }

  async encryptCheckValue(userId: string): Promise<string> {
    if (!this.masterKey) throw new Error('Vault is locked');
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(userId));
    const iv = crypto.getRandomValues(new Uint8Array(MasterPassCrypto.IV_SIZE));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.masterKey,
      plaintext
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  async decryptCheckValue(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
    const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  lock(): void {
    this.masterKey = null;
    this.isUnlocked = false;
    sessionStorage.removeItem('vault_unlocked');
  }

  isVaultUnlocked(): boolean {
    if (!this.isUnlocked || !this.masterKey) return false;
    const unlockTime = sessionStorage.getItem('vault_unlocked');
    if (unlockTime) {
      const elapsed = Date.now() - parseInt(unlockTime);
      const timeout = this.getTimeoutSetting();
      if (elapsed > timeout) {
        this.lock();
        return false;
      }
    }
    return true;
  }

  private getTimeoutSetting(): number {
    const saved = localStorage.getItem('vault_timeout_minutes');
    return saved ? parseInt(saved) * 60 * 1000 : MasterPassCrypto.DEFAULT_TIMEOUT;
  }

  static setTimeoutMinutes(minutes: number): void {
    localStorage.setItem('vault_timeout_minutes', minutes.toString());
  }

  static getTimeoutMinutes(): number {
    const saved = localStorage.getItem('vault_timeout_minutes');
    return saved ? parseInt(saved) : 10;
  }

  async encryptData(data: any): Promise<string> {
    if (!this.isVaultUnlocked()) throw new Error('Vault is locked - cannot encrypt data');
    if (data === null || data === undefined) throw new Error('Cannot encrypt null or undefined data');
    const dataToEncrypt = typeof data === 'string' ? data : String(data);
    if (dataToEncrypt.trim().length === 0) throw new Error('Cannot encrypt empty string');
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(dataToEncrypt));
    const iv = crypto.getRandomValues(new Uint8Array(MasterPassCrypto.IV_SIZE));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.masterKey!,
      plaintext
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  async decryptData(encryptedData: string): Promise<any> {
    if (!this.isVaultUnlocked()) throw new Error('Vault is locked');
    if (!encryptedData || typeof encryptedData !== 'string') throw new Error('Invalid encrypted data provided');
    if (encryptedData.trim().length === 0) throw new Error('Cannot decrypt empty string');
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    const iv = combined.slice(0, MasterPassCrypto.IV_SIZE);
    const encrypted = combined.slice(MasterPassCrypto.IV_SIZE);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.masterKey!,
      encrypted
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}

export const masterPassCrypto = MasterPassCrypto.getInstance();

export const setVaultTimeout = (minutes: number) => {
  MasterPassCrypto.setTimeoutMinutes(minutes);
};

export const getVaultTimeout = () => {
  return MasterPassCrypto.getTimeoutMinutes();
};

export const encryptField = async (value: string): Promise<string> => {
  if (value === null || value === undefined) throw new Error('Cannot encrypt null or undefined value');
  if (typeof value !== 'string') throw new Error('Can only encrypt string values');
  if (value.trim().length === 0) throw new Error('Cannot encrypt empty string');
  return masterPassCrypto.encryptData(value);
};

export const decryptField = async (encryptedValue: string): Promise<string> => {
  if (!encryptedValue || typeof encryptedValue !== 'string') throw new Error('Invalid encrypted value provided');
  if (encryptedValue.trim().length === 0) throw new Error('Cannot decrypt empty string');
  return masterPassCrypto.decryptData(encryptedValue);
};

export const updateMasterpassCheckValue = async (userId: string) => {
  const response = await appwriteDatabases.listDocuments(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_USER_ID,
    [Query.equal('userId', userId)]
  );
  const userDoc = response.documents[0];
  if (!userDoc) return;
  const check = await masterPassCrypto.encryptCheckValue(userId);
  await appwriteDatabases.updateDocument(
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_USER_ID,
    userDoc.$id,
    { check }
  );
};