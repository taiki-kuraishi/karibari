import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Selection {
  screenId: string;
  target: string;
}

// A target's top-left inside its screen, in the screen's own CSS pixels.
export interface TargetPoint {
  x: number;
  y: number;
}

interface CommentModeState {
  commentMode: boolean;
  // Per screen id, then per target selector; a target missing from its screen has no entry.
  points: Record<string, Record<string, TargetPoint>>;
  select: (selection: Selection) => void;
  selection: Selection | null;
  setPoints: (screenId: string, points: Record<string, TargetPoint>) => void;
  toggleCommentMode: () => void;
}

export const useCommentModeStore = create<CommentModeState>()(
  persist(
    (set) => ({
      commentMode: false,
      points: {},
      select: (selection) => set({ selection }),
      selection: null,
      setPoints: (screenId, points) =>
        set((state) => ({ points: { ...state.points, [screenId]: points } })),
      toggleCommentMode: () =>
        set(({ commentMode }) => ({ commentMode: !commentMode, selection: null })),
    }),
    // Only the mode survives a reload; a selection points into one page's screens.
    { name: "karibari-comment-mode", partialize: ({ commentMode }) => ({ commentMode }) },
  ),
);
