import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes. Copier .env.example en .env et renseigner les valeurs.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ─── Helpers Storage ──────────────────────────────────────────────────────────

/** Retourne l'URL publique d'une photo d'article */
export function getArticlePhotoUrl(path: string): string {
  const { data } = supabase.storage.from('catalogue').getPublicUrl(path)
  return data.publicUrl
}

/** Retourne une URL signée (60 min) pour un document archivé */
export async function getDocumentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 3600)

  if (error || !data) throw new Error('Impossible de générer le lien du document')
  return data.signedUrl
}

/** Upload une photo d'article, retourne le path Storage */
export async function uploadArticlePhoto(
  file: File,
  articleId: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `articles/${articleId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('catalogue')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) throw new Error(`Upload échoué : ${error.message}`)
  return path
}

/** Upload un document généré (PDF blob), retourne le path Storage */
export async function uploadDocument(
  blob: Blob,
  type: string,
  reference: string,
  annee: number,
  filialeCode: string
): Promise<string> {
  const path = `${annee}/${filialeCode}/${type}/${reference}.pdf`

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, blob, { upsert: true, contentType: 'application/pdf' })

  if (error) throw new Error(`Archivage document échoué : ${error.message}`)
  return path
}
