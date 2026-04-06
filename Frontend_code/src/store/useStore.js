// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'

// // ── Single global store — simple, flat, no splitting ─────────────────────────
// export const useStore = create(
//   persist(
//     (set) => ({
//       // Auth
//       token:     null,
//       user:      null,
//       setAuth:   (token, user) => set({ token, user }),
//       logout:    ()            => set({ token: null, user: null, sessionId: null, slots: [] }),

//       // Video session
//       sessionId:    null,
//       videoMode:    'upload',       // 'upload' | 'live'
//       setSessionId: (id)   => set({ sessionId: id }),
//       setVideoMode: (mode) => set({ videoMode: mode }),

//       // Parking slots  [{ x, y, w, h }, ...]
//       slots:     [],
//       setSlots:  (slots) => set({ slots }),
//       addSlot:   (slot)  => set((s) => ({ slots: [...s.slots, slot] })),
//       removeSlot:(idx)   => set((s) => ({ slots: s.slots.filter((_, i) => i !== idx) })),
//       clearSlots:()      => set({ slots: [] }),
//     }),
//     {
//       name: 'parkit-store',
//       partialize: (s) => ({ token: s.token, user: s.user }), // only persist auth
//     }
//   )
// )
// ── ADD these lines to your existing useStore.js ─────────────────────────────
//
// Inside the create() call, alongside your existing state fields, add:
//
//   frameSnap:    null,           // { dataURL: string, width: number, height: number } | null
//   setFrameSnap: (snap) => set({ frameSnap: snap }),
//
// Full example (merge with your existing store):

// import { create } from 'zustand'

// export const useStore = create((set) => ({
//   // ── existing fields (keep yours) ──────────────────────────────────────────
//   sessionId:    null,
//   videoMode:    'upload',
//   slots:        [],

//   setSessionId: (id)   => set({ sessionId: id }),
//   setVideoMode: (mode) => set({ videoMode: mode }),

//   addSlot:    (slot) => set((s) => ({ slots: [...s.slots, slot] })),
//   removeSlot: (idx)  => set((s) => ({ slots: s.slots.filter((_, i) => i !== idx) })),
//   clearSlots: ()     => set({ slots: [] }),

//   // ── NEW: video frame snapshot for MarkCoordsPage ──────────────────────────
//   // Populated by UploadPage after extractSnapshot() succeeds.
//   // Shape: { dataURL: string, width: number, height: number } | null
//   frameSnap:    null,
//   setFrameSnap: (snap) => set({ frameSnap: snap }),
// }))


import { create } from 'zustand'

export const useStore = create((set) => ({
  // ─────────────────────────────────────────
  // 🎯 SESSION / VIDEO STATE
  // ─────────────────────────────────────────
  sessionId: null,
  videoMode: 'upload', // 'upload' | 'live'

  setSessionId: (id) => set({ sessionId: id }),
  setVideoMode: (mode) => set({ videoMode: mode }),

  // ─────────────────────────────────────────
  // 🚗 PARKING SLOTS
  // ─────────────────────────────────────────
  // [{ x, y, w, h }, ...]
  slots: [],

  setSlots: (slots) => set({ slots }),

  addSlot: (slot) =>
    set((state) => ({
      slots: [...state.slots, slot],
    })),

  removeSlot: (idx) =>
    set((state) => ({
      slots: state.slots.filter((_, i) => i !== idx),
    })),

  clearSlots: () => set({ slots: [] }),

  // ─────────────────────────────────────────
  // 🖼️ FRAME SNAPSHOT (Upload → MarkCoords)
  // ─────────────────────────────────────────
  // { dataURL, width, height }
  frameSnap: null,

  setFrameSnap: (snap) => set({ frameSnap: snap }),
}))