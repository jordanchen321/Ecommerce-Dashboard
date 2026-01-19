import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import getFirestoreInstance, { isFirebaseConfigured } from "@/lib/firebase"

// Disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = session.user.email
    const firebaseConfigured = isFirebaseConfigured()
    
    let firestoreConnected = false
    let firestoreError: string | null = null
    let productCount = 0
    let lastUpdated: Date | null = null

    if (firebaseConfigured) {
      try {
        const db = getFirestoreInstance()
        if (db) {
          // Test connection by trying to read a document
          const docId = userEmail.replace(/[^a-zA-Z0-9]/g, '_')
          const userDocRef = db.collection('users').doc(docId)
          const userDoc = await userDocRef.get()
          
          firestoreConnected = true

          // Get user's product count
          if (userDoc.exists) {
            const userData = userDoc.data()
            productCount = Array.isArray(userData?.products) ? userData.products.length : 0
            lastUpdated = userData?.updatedAt?.toDate() || null
          }
        }
      } catch (error: any) {
        firestoreError = error.message || String(error)
        console.error("[Status] Firestore connection error:", error)
      }
    }

    return NextResponse.json({
      userEmail,
      firestore: {
        configured: firebaseConfigured,
        connected: firestoreConnected,
        error: firestoreError,
      },
      products: {
        count: productCount,
        lastUpdated,
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}