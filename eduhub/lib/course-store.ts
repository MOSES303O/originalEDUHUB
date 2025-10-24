import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Course } from "@/types";
import apiClient from "@/lib/api";
import { fetchSelectedCourses, insertSelectedCourse, removeSelectedCourse } from "./api";

interface CourseStore {
  selectedCourses: Course[];
  setSelectedCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => Promise<void>;
  toggleCourseSelection: (course: Course) => Promise<void>;
  isCourseSelected: (courseId: string) => boolean;
  downloadSelectedCourses: (format?: "pdf" | "csv") => Promise<void>;
}

export const useSelectedCourses = create<CourseStore>()(
  persist(
    (set, get) => ({
      selectedCourses: [],
      setSelectedCourses: (courses: Course[]) => set({ selectedCourses: courses }),
      addCourse: async (course: Course) => {
        try {
          if (!course.id) {
            console.error("[CourseStore] Invalid course ID:", course);
            throw new Error("Invalid course ID");
          }
          if (!get().isCourseSelected(course.id)) {
            console.log("[CourseStore] Adding course:", course.id, course.name);
            const newCourse = await insertSelectedCourse(course.id);
            set((state) => ({
              selectedCourses: [...state.selectedCourses, { ...newCourse, is_selected: true }],
            }));
          } else {
            console.log("[CourseStore] Course already selected:", course.id);
          }
        } catch (error: any) {
          console.error("[CourseStore] Add course failed:", JSON.stringify(error, null, 2));
          throw error;
        }
      },
      toggleCourseSelection: async (course: Course) => {
        try {
          if (!course.code) {
            console.error("[CourseStore] Invalid course code:", course);
            throw new Error("Invalid course code");
          }
          const isSelected = get().isCourseSelected(course.id);
          if (isSelected) {
            const selectedCourse = get().selectedCourses.find((c) => c.id === course.id);
            if (selectedCourse?.selectionId) {
              console.log("[CourseStore] Deselecting course:", course.id, course.code, course.name);
              await removeSelectedCourse(selectedCourse.selectionId);
              set((state) => ({
                selectedCourses: state.selectedCourses.filter((c) => c.id !== course.id),
              }));
            } else {
              console.error("[CourseStore] No selectionId for course:", course.id, course.code);
              throw new Error("Missing selection ID for deselection");
            }
          } else {
            console.log("[CourseStore] Selecting course:", course.id, course.code, course.name);
            const newCourse = await insertSelectedCourse(course.code);
            set((state) => ({
              selectedCourses: [...state.selectedCourses, { ...newCourse, is_selected: true }],
            }));
          }
        } catch (error: any) {
          console.error("[CourseStore] Toggle course selection failed:", JSON.stringify(error, null, 2));
          throw error;
        }
      },
      isCourseSelected: (courseId: string) => get().selectedCourses.some((course) => course.id === courseId),
      downloadSelectedCourses: async (format = "pdf") => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            console.warn("[CourseStore] No authentication token found");
            throw new Error("No authentication token");
          }
          console.log("[CourseStore] Downloading selected courses in format:", format);
          const response = await apiClient.get(`user/selected-courses/download/?format=${format}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
            timeout: 10000,
          });
          console.log(`[CourseStore] Download ${format} response status: ${response.status}`);
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `selected_courses.${format}`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } catch (error: any) {
          console.error("[CourseStore] Download selected courses failed:", JSON.stringify(error, null, 2));
          throw error;
        }
      },
    }),
    {
      name: "selected-courses",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export async function initializeSelectedCourses() {
  try {
    console.log("[CourseStore] Initializing selected courses");
    const courses = await fetchSelectedCourses();
    useSelectedCourses.getState().setSelectedCourses(courses.map((course) => ({ ...course, is_selected: true })));
    console.log("[CourseStore] Selected courses initialized:", JSON.stringify(courses, null, 2));
  } catch (error: any) {
    console.log("[CourseStore] No selected courses found or error occurred, setting empty array");
    useSelectedCourses.getState().setSelectedCourses([]);
  }
}