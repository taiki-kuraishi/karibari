import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Selection {
  screenId: string;
  target: string;
}

interface CommentModeState {
  commentMode: boolean;
  select: (selection: Selection) => void;
  selection: Selection | null;
  toggleCommentMode: () => void;
}

export const useCommentModeStore = create<CommentModeState>()(
  persist(
    (set) => ({
      commentMode: false,
      select: (selection) => set({ selection }),
      selection: null,
      toggleCommentMode: () =>
        set(({ commentMode }) => ({ commentMode: !commentMode, selection: null })),
    }),
    // Only the mode survives a reload; a selection points into one page's screens.
    { name: "karibari-comment-mode", partialize: ({ commentMode }) => ({ commentMode }) },
  ),
);
