import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

/**
 * Firebase Admin initialization for serverless environments (Vercel)
 * 
 * Uses service account credentials from environment variables.
 * Follows best practices for serverless: singleton pattern with module-level caching.
 */

let firestoreInstance: Firestore | null = null
let appInstance: App | null = null

// Helper function to check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  const hasProjectId = !!process.env.FIREBASE_PROJECT_ID
  const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY
  const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL
  
  if (!hasProjectId || !hasPrivateKey || !hasClientEmail) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Firebase] ⚠ Firebase credentials not fully configured')
      console.warn('[Firebase] Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL')
    }
    return false
  }
  
  return true
}

// Initialize Firebase Admin (singleton pattern)
export function getFirestoreInstance(): Firestore | null {
  // Return cached instance if available
  if (firestoreInstance) {
    return firestoreInstance
  }

  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Firebase] ⚠ Firebase not configured - data will be saved to memory only')
    }
    return null
  }

  try {
    // Check if app already exists (prevents re-initialization)
    const existingApps = getApps()
    if (existingApps.length > 0) {
      appInstance = existingApps[0]
      firestoreInstance = getFirestore(appInstance)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Firebase] ✓ Using existing Firebase app instance')
      }
      return firestoreInstance
    }

    // Initialize new app
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    
    if (!privateKey) {
      console.error('[Firebase] ❌ FIREBASE_PRIVATE_KEY is missing or invalid')
      return null
    }

    appInstance = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    })

    firestoreInstance = getFirestore(appInstance)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase] ✓✓✓ Firebase Admin initialized successfully')
      console.log('[Firebase] ✓ Firestore instance created')
    }

    return firestoreInstance
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Firebase] ❌ Failed to initialize Firebase:', errorMessage)
    
    if (errorMessage.includes('private_key')) {
      console.error('[Firebase] Check FIREBASE_PRIVATE_KEY format - should include \\n characters')
    }
    if (errorMessage.includes('project_id')) {
      console.error('[Firebase] Check FIREBASE_PROJECT_ID is correct')
    }
    if (errorMessage.includes('client_email')) {
      console.error('[Firebase] Check FIREBASE_CLIENT_EMAIL is correct')
    }
    
    return null
  }
}

// Export Firestore instance getter
export default getFirestoreInstance
