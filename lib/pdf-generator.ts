// frontend/lib/generateCoursesPDF.ts
"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Course } from "@/types";

// Function to generate a PDF from selected courses
export const generateCoursesPDF = (courses: Course[], userName = "Student") => {
  // Create a new PDF document
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.setTextColor(39, 174, 96); // Green color
  doc.text("EduPathway - Selected Courses", 14, 22);

  // Add subtitle with date
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const today = new Date().toLocaleDateString();
  doc.text(`Generated for: ${userName} | Date: ${today}`, 14, 30);

  // Add description
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "This document contains your selected university courses based on your academic profile and interests.",
    14,
    38,
  );

  // Create table header and data
  const tableColumn = ["Course Code", "Title", "University", "Points", "Description"];
  const tableRows = courses.map((course) => [
    course.code,
    course.name,
    course.university_name,
    course.minimum_grade,
    course.description.substring(0, 60) + (course.description.length > 60 ? "..." : ""),
  ]);

  // Generate the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [39, 174, 96], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 45 },
  });

  // Add course details section
  let yPos = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(39, 174, 96);
  doc.text("Course Details", 14, yPos);

  yPos += 8;

  // Add detailed information for each course
  courses.forEach((course, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`${index + 1}. ${course.name} (${course.code})`, 14, yPos);

    yPos += 6;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`University: ${course.university_name}`, 18, yPos);

    yPos += 5;

    doc.text(`Required Points: ${course.minimum_grade}`, 18, yPos);

    yPos += 5;

    // Split long descriptions into multiple lines
    const descLines = doc.splitTextToSize(course.description, 170);
    doc.text(descLines, 18, yPos);

    yPos += descLines.length * 5 + 8;

    // Add additional course details
    if (course.duration_years) {
      doc.text(`Duration: ${course.duration_years} years`, 18, yPos);
      yPos += 5;
    }

    if (course.applicationDeadline) {
      doc.text(`Application Deadline: ${course.applicationDeadline}`, 18, yPos);
      yPos += 5;
    }

    if (course.required_subjects && course.required_subjects.length > 0) {
      const subjects = course.required_subjects.map((s) => s.subject.name).join(", ");
      doc.text(`Required Subjects: ${subjects}`, 18, yPos);
      yPos += 5;
    }

    if (course.career_prospects) {
      doc.text(`Career Paths: ${course.career_prospects}`, 18, yPos);
      yPos += 5;
    }

    // Add some space between courses
    yPos += 8;
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "EduPathway - Find your perfect university course | www.edupathway.co.ke",
      14,
      doc.internal.pageSize.height - 10,
    );
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  doc.save("EduPathway-Selected-Courses.pdf");
};