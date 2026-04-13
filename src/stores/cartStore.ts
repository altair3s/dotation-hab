import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Article, CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  pts_total: number

  addItem: (article: Article, taille: string, quantite?: number) => void
  removeItem: (articleId: string, taille: string) => void
  updateQuantite: (articleId: string, taille: string, quantite: number) => void
  clear: () => void
  itemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      pts_total: 0,

      addItem: (article, taille, quantite = 1) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.article.id === article.id && i.taille === taille
          )

          let items: CartItem[]
          if (existing) {
            items = state.items.map((i) =>
              i.article.id === article.id && i.taille === taille
                ? {
                    ...i,
                    quantite: i.quantite + quantite,
                    pts_total: (i.quantite + quantite) * article.pts_cout,
                  }
                : i
            )
          } else {
            items = [
              ...state.items,
              {
                article,
                taille,
                quantite,
                pts_total: quantite * article.pts_cout,
              },
            ]
          }

          return {
            items,
            pts_total: items.reduce((acc, i) => acc + i.pts_total, 0),
          }
        })
      },

      removeItem: (articleId, taille) => {
        set((state) => {
          const items = state.items.filter(
            (i) => !(i.article.id === articleId && i.taille === taille)
          )
          return { items, pts_total: items.reduce((acc, i) => acc + i.pts_total, 0) }
        })
      },

      updateQuantite: (articleId, taille, quantite) => {
        set((state) => {
          if (quantite <= 0) {
            const items = state.items.filter(
              (i) => !(i.article.id === articleId && i.taille === taille)
            )
            return { items, pts_total: items.reduce((acc, i) => acc + i.pts_total, 0) }
          }

          const items = state.items.map((i) =>
            i.article.id === articleId && i.taille === taille
              ? { ...i, quantite, pts_total: quantite * i.article.pts_cout }
              : i
          )
          return { items, pts_total: items.reduce((acc, i) => acc + i.pts_total, 0) }
        })
      },

      clear: () => set({ items: [], pts_total: 0 }),

      itemCount: () => get().items.reduce((acc, i) => acc + i.quantite, 0),
    }),
    {
      name: 'cart-storage',
    }
  )
)
