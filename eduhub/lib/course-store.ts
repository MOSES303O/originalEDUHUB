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
              selectedCourses: [...state.selectedCourses, newCourse],
            }));
          }
        } catch (error) {
          const axiosError = error as import("axios").AxiosError<{ message?: string }>;
          console.error("Add course failed:", {
            message: axiosError.message,
            status: axiosError.response?.status,
            data: JSON.stringify(axiosError.response?.data, null, 2),
          });
          throw error;
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
              selectedCourses: [...state.selectedCourses, newCourse],
            }));
          }
        } catch (error) {
          const axiosError = error as import("axios").AxiosError<{ message?: string }>;
          console.error("Toggle course selection failed:", {
            message: axiosError.message,
            status: axiosError.response?.status,
            data: JSON.stringify(axiosError.response?.data, null, 2),
          });
          throw error;
        }
      },
      isCourseSelected: (courseId: string) => get().selectedCourses.some((course) => course.id === courseId),
      downloadSelectedCourses: async (format = "pdf") => {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No authentication token found");
        try {
          const response = await apiClient.get(`/user/selected-courses/download/?format=${format}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `selected_courses.${format}`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } catch (error) {
          const axiosError = error as import("axios").AxiosError<{ message?: string }>;
          console.error("Error downloading selected courses:", {
            message: axiosError.message,
            status: axiosError.response?.status,
            data: JSON.stringify(axiosError.response?.data, null, 2),
          });
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
    const courses = await fetchSelectedCourses();
    const stringCourses = courses.map((course) => String(course)); // Ensure all values are strings
    useSelectedCourses.getState().setSelectedCourses(stringCourses);
  } catch (error) {
    const axiosError = error as import("axios").AxiosError<{ message?: string }>;
    console.error("Failed to initialize selected courses:", {
      message: axiosError.message,
      status: axiosError.response?.status,
      data: JSON.stringify(axiosError.response?.data, null, 2),
    });
    throw error;
  }
}