import { create } from "zustand";
import { Course } from "@/types";
import { fetchSelectedCourses, insertSelectedCourse, removeSelectedCourse } from "@/lib/api";

export * from "@/types"; // Re-export Course type

interface CourseStore {
  selectedCourses: Course[];
  setSelectedCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => Promise<void>;
  toggleCourseSelection: (course: Course) => Promise<void>;
  isCourseSelected: (courseId: string | number) => boolean;
}

export const useSelectedCourses = create<CourseStore>((set, get) => ({
  selectedCourses: [],
  setSelectedCourses: (courses: Course[]) => set({ selectedCourses: courses }),
  addCourse: async (course: Course) => {
    try {
      if (!get().isCourseSelected(course.id)) {
        const newCourse = await insertSelectedCourse(course.id);
        set((state) => ({
          selectedCourses: [...state.selectedCourses, newCourse],
        }));
      }
    } catch (error: unknown) {
      console.error("Add course failed:", JSON.stringify(error, null, 2));
      throw error; // Propagate to caller
    }
  },
  toggleCourseSelection: async (course: Course) => {
    const isSelected = get().isCourseSelected(course.id);
    try {
      if (isSelected) {
        if (course.selectionId) {
          await removeSelectedCourse(course.selectionId);
          set((state) => ({
            selectedCourses: state.selectedCourses.filter((c) => c.id !== course.id),
          }));
        }
      } else {
        const newCourse = await insertSelectedCourse(course.id);
        set((state) => ({
          selectedCourses: [...state.selectedCourses, newCourse],
        }));
      }
    } catch (error: unknown) {
      console.error("Toggle course selection failed:", JSON.stringify(error, null, 2));
      throw error; // Propagate to caller
    }
  },
  isCourseSelected: (courseId: string | number) =>
    get().selectedCourses.some((course) => course.id === courseId),
}));

export async function initializeSelectedCourses() {
  try {
    const courses = await fetchSelectedCourses();
    useSelectedCourses.getState().setSelectedCourses(courses);
  } catch (error: unknown) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error || "Unknown error"),
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error("Failed to initialize selected courses:", errorDetails);
    throw error; // Propagate to CoursesPage
  }
}