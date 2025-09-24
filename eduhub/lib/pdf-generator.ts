import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Course, KMTCCourse } from '@/types';

export function generateCoursesPDF(courses: (Course | KMTCCourse)[], studentName: string): jsPDF {
  const doc = new jsPDF();
  doc.setProperties({
    title: `EduHub Course Selection - ${studentName}`,
    author: 'EduHub',
    creator: 'EduHub',
  });
  doc.setFontSize(18);
  doc.text('EduHub Course Selection', 20, 20);
  doc.setFontSize(12);
  doc.text(`Student: ${studentName}`, 20, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);

  autoTable(doc, {
    startY: 50,
    head: [['Code', 'Name', 'Department', 'Minimum Grade', 'Campus']],
    body: courses.map(course => [
      course.code || 'UNKNOWN',
      course.name || 'Unknown Course',
      course.department || 'Unknown Department',
      (course as Course).minimum_grade || (course as KMTCCourse).required_grade || 'N/A',
      (course as Course).university_name || (course as KMTCCourse).campus_name || 'Not specified',
    ]),
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 128, 128] },
  });

  doc.save(`EduHub-Course-${studentName}.pdf`);
  return doc;
}