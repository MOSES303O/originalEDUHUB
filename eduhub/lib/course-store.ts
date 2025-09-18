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
          if (!get().isCourseSelected(course.id)) {
            const newCourse = await insertSelectedCourse(course.id);
            set((state) => ({
              selectedCourses: [...state.selectedCourses, { ...newCourse, is_selected: true }],
            }));
          }
        } catch (error: any) {
          console.error("Add course failed:", JSON.stringify(error, null, 2));
        }
      },
      toggleCourseSelection: async (course: Course) => {
        const isSelected = get().isCourseSelected(course.id);
        try {
          if (isSelected) {
            const selectedCourse = get().selectedCourses.find((c) => c.id === course.id);
            if (selectedCourse?.selectionId) {
              await removeSelectedCourse(selectedCourse.selectionId);
              set((state) => ({
                selectedCourses: state.selectedCourses.filter((c) => c.id !== course.id),
              }));
            }
          } else {
            const newCourse = await insertSelectedCourse(course.id);
            set((state) => ({
              selectedCourses: [...state.selectedCourses, { ...newCourse, is_selected: true }],
            }));
          }
        } catch (error: any) {
          console.error("Toggle course selection failed:", JSON.stringify(error, null, 2));
        }
      },
      isCourseSelected: (courseId: string) => get().selectedCourses.some((course) => course.id === courseId),
      downloadSelectedCourses: async (format = "pdf") => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            console.warn("No authentication token found in localStorage");
            return;
          }
          console.log("Sending download selected courses request to:", `${apiClient.defaults.baseURL}user/selected-courses/download/?format=${format}`);
          const response = await apiClient.get(`user/selected-courses/download/?format=${format}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
            timeout: 10000,
          });
          console.log(`Download ${format} response status: ${response.status}`);
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `selected_courses.${format}`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } catch (error: any) {
          console.error("Download selected courses failed:", JSON.stringify(error, null, 2));
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
    const courses = await fetchSelectedCourses();
    useSelectedCourses.getState().setSelectedCourses(courses.map((course) => ({ ...course, is_selected: true })));
    console.log("Selected courses initialized successfully:", JSON.stringify(courses, null, 2));
  } catch (error: any) {
    console.log("No selected courses found, 404, or empty response received, setting empty array");
    useSelectedCourses.getState().setSelectedCourses([]);
  }
}