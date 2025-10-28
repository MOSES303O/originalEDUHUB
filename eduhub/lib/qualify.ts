// qualify.ts
// SINGLE FILE – Exportable, TypeScript, Reusable
// Supports: 7–9 subjects, A=12 → E=1, AND/OR logic, min average, detailed reasons

// === GRADE TO POINTS MAPPING ===
type GradeKey =
  | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "D-" | "E";

const GRADE_POINTS: Record<GradeKey, number> = {
  "A": 12, "A-": 11,
  "B+": 10, "B": 9, "B-": 8,
  "C+": 7, "C": 6, "C-": 5,
  "D+": 4, "D": 3, "D-": 2,
  "E": 1,
};

// === TYPES ===
export type StudentGrades = Record<string, GradeKey>; // e.g. { MATH: "B", ENGLISH: "A-" }

export type RequirementNode =
  | { type: "SUBJECT"; subject: string; minGrade: GradeKey }
  | { type: "ANY"; nodes: RequirementNode[] }   // OR
  | { type: "ALL"; nodes: RequirementNode[] };  // AND

export interface CourseSpec {
  id: string;
  title: string;
  minAveragePoints?: number;
  requirement?: RequirementNode;
}
export interface QualificationResult {
  qualified: boolean;
  average: number;
  reasons: string[];
}

// === UTILS ===
function gradeToPoints(g?: string): number {
  if (!g) return 0;
  const key = g.toUpperCase() as GradeKey;
  return GRADE_POINTS[key] ?? 0;
}

function computeAveragePoints(student: StudentGrades): number {
  const grades = Object.values(student);
  if (grades.length < 7 || grades.length > 9) {
    throw new Error("Student must have 7 to 9 subjects.");
  }
  const sum = grades.reduce((s, g) => s + gradeToPoints(g), 0);
  return sum / grades.length;
}

// === EVALUATE LOGIC TREE ===
function evaluateRequirement(student: StudentGrades, node?: RequirementNode): { ok: boolean; reasons: string[] } {
  if (!node) return { ok: true, reasons: ["No subject requirement"] };

  if (node.type === "SUBJECT") {
    const grade = student[node.subject];
    if (!grade) {
      return { ok: false, reasons: [`Missing subject: ${node.subject} (needs >= ${node.minGrade})`] };
    }
    const studentPts = gradeToPoints(grade);
    const reqPts = gradeToPoints(node.minGrade);
    if (studentPts >= reqPts) {
      return { ok: true, reasons: [`${node.subject}: ${grade} meets >= ${node.minGrade}`] };
    } else {
      return { ok: false, reasons: [`${node.subject}: ${grade} < ${node.minGrade}`] };
    }
  }

  if (node.type === "ALL") {
    const reasons: string[] = [];
    for (const child of node.nodes) {
      const res = evaluateRequirement(student, child);
      reasons.push(...res.reasons);
      if (!res.ok) return { ok: false, reasons };
    }
    return { ok: true, reasons };
  }

  if (node.type === "ANY") {
    const reasons: string[] = [];
    for (const child of node.nodes) {
      const res = evaluateRequirement(student, child);
      reasons.push(...res.reasons);
      if (res.ok) {
        return { ok: true, reasons: [`Passed via: ${res.reasons.join("; ")}`] };
      }
    }
    return { ok: false, reasons: [`Failed all options. Details: ${reasons.join("; ")}`] };
  }

  return { ok: false, reasons: ["Invalid requirement"] };
}

// === MAIN FUNCTION ===
export function checkQualification(student: StudentGrades, course: CourseSpec): QualificationResult {
  const avg = computeAveragePoints(student);
  const avgOk = course.minAveragePoints === undefined || avg >= course.minAveragePoints;
  const reqRes = evaluateRequirement(student, course.requirement);

  const qualified = avgOk && reqRes.ok;
  const reasons: string[] = [];

  reasons.push(
    `Average: ${avg.toFixed(2)} points ` +
    `(required ${course.minAveragePoints ?? "N/A"}) → ${avgOk ? "Pass" : "Fail"}`
  );
  reasons.push(...reqRes.reasons);

  return { qualified, average: avg, reasons };
}

// === EXPORT DEFAULT (for easy import) ===
export default checkQualification;

// In your React component
//import checkQualification from '@/lib/qualify';

//const result = checkQualification(userGrades, selectedCourse);
//if (result.qualified) { /* show success */ }