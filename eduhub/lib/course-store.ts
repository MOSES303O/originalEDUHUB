// lib/course-store.ts
import { create } from "zustand";
import { Course } from "@/types";
import { insertSelectedCourse, enrichSelectedCourse,removeSelectedCourse,removeSelectedCourseByName, fetchSelectedCourses } from "@/lib/api";

interface CourseStore {
  selectedCourses: Course[];
  isLoading: boolean;
  error: string | null;

  toggleCourseSelection: (course: Course) => Promise<void>;
  isCourseSelected: (code: string) => boolean;
  refreshFromBackend: () => Promise<void>;
  clearError: () => void;
}

export const useSelectedCourses = create<CourseStore>((set, get) => ({
  selectedCourses: [],
  isLoading: false,
  error: null,

  isCourseSelected: (identifier?: string | number) => {
    if (!identifier) return false;
    const target = String(identifier).trim().toLowerCase();
    return get().selectedCourses.some((c) => {
      const cCode = String(c.code).trim().toLowerCase();
      return cCode === target;
    });
  },
  toggleCourseSelection: async (course: Course) => {
    if (!course.code) return;
  
    const code = String(course.code);
    const wasSelected = get().isCourseSelected(code);
  
    // Optimistic
    set(state => {
      let next: Course[];
      if (wasSelected) {
        next = state.selectedCourses.filter(c => String(c.code) !== code);
      } else {
        next = [...state.selectedCourses, { ...course, is_selected: true, selectionId: 'pending' }];
      }
      return { selectedCourses: next, error: null };
    });
  
    try {
      if (wasSelected) {
         // Use course name + institution for deletion (no ID needed)
        console.log("Deselecting by name:", course.name, "institution:", course.institution);
        await removeSelectedCourseByName(course.name, course.institution || "Unknown");
        console.log("Deselect complete for:", course.name);
      } else {
        const created = await insertSelectedCourse(course.code);
        // If already exists → treat as success, no need to patch
      if (created.selectionId === "already-exists") {
        // Already selected → update store to reflect selected state
        set(state => ({
          selectedCourses: state.selectedCourses.map(c =>
            String(c.code) === code
              ? { ...c, is_selected: true }
              : c
          ),
          error: null,
        }));
        return; // success - no further action
      }
        // Debug: see what we got back
        console.log("Created object from insert:", created);
  
        // Force patch — even if created.id is missing, fallback to refresh
        set(state => {
          const updatedCourses = state.selectedCourses.map(c => {
            if (String(c.code) !== code) return c;
  
            const newId = created.selectionId || created.id;
  
            return {
              ...c,
              selectionId: newId,
              id: newId || c.id,
              is_selected: true,
            };
          });
  
          return {
            selectedCourses: updatedCourses,
            isLoading: false,
            error: null,
          };
        });
  
        // Extra safety: if still no ID, refresh whole list
        if (!created.selectionId && !created.id) {
          await get().refreshFromBackend();
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Update failed";
  
      if (msg.toLowerCase().includes("already") || msg.includes("exists")) {
        set({ error: null });
        return;
      }
  
      // Rollback on real error
      set((state) => {
        let next: Course[];
        if (wasSelected) {
          next = [...state.selectedCourses, { ...course, is_selected: true }];
        } else {
          next = state.selectedCourses.filter((c) => String(c.code) !== code);
        }
        return { selectedCourses: next, error: msg };
      });
  
      throw new Error(msg);
    }
  },

  refreshFromBackend: async () => {
    set({ isLoading: true, error: null });
    try {
      const raw = await fetchSelectedCourses();
  
      // Enrich each item with full details
      const enriched = await Promise.all(
        raw.map(async (item) => await enrichSelectedCourse(item))
      );
  
      set({
        selectedCourses: enriched,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: "Failed to load selections", isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));