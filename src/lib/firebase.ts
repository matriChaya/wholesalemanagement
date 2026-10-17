import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  enableNetwork,
  disableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export { firebaseConfig };

// Initialize Firebase App instance
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Silence noisy internal connection warnings when client operates offline or in iframe sandbox
try {
  setLogLevel('silent');
} catch {
  // Ignore if already set
}

// Initialize Firestore strictly targeting ONLY the single (default) database
// This eliminates Starter tier quota exhaustion and multi-database crashes.
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: 50 * 1024 * 1024, // 50MB IndexedDB limit to prevent browser crash and memory overflow
      }),
    });
  } catch (err) {
    try {
      return initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      try {
        return getFirestore(app);
      } catch (fallbackErr) {
        console.warn('Firestore fallback initialization notice:', fallbackErr);
        return getFirestore(app);
      }
    }
  }
})();

// Error Handling Definition
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn(`[Firestore Safe Logger] ${operationType.toUpperCase()} on ${path || 'unknown'}:`, errorMessage);
  return errInfo;
}

// Test Connection Helper - Uses standard getDoc to avoid forced 10s server blocking
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const healthDoc = await getDoc(doc(db, 'system', 'connection_health'));
    return !healthDoc.metadata.fromCache;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore operating in offline cache mode.');
    }
    return false;
  }
}

// Firestore Collection Names
export const COLLECTIONS = {
  ACTIVITY_LOGS: 'activityLogs',
  CASH_TRANSFERS: 'cashTransfers',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  RETAILERS: 'retailers',
  SUPPLIERS: 'suppliers',
  SUPPLIER_LEDGER: 'supplierLedger',
  CAPITAL_TRANSACTIONS: 'capitalTransactions',
  REPLACEMENTS: 'replacements',
  COMPANY_RETURNS: 'companyReturns',
  USERS: 'users',
  EXPENSES: 'expenses',
  SETTINGS: 'settings',
} as const;

// Firestore network simulation helpers for testing offline resilience
export const simulateGoOffline = async () => {
  try {
    await disableNetwork(db);
  } catch (err) {
    console.warn('Error disabling Firestore network:', err);
  }
};

export const simulateGoOnline = async () => {
  try {
    await enableNetwork(db);
  } catch (err) {
    console.warn('Error enabling Firestore network:', err);
  }
};
