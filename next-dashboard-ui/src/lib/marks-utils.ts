/**
 * Marks and Grades utility functions
 * Handles all calculations for marks, percentages, grades, GPA, and remarks
 */

export interface GradeScheme {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
}

// Default grading scheme: A+ (90-100), A (80-89), B (70-79), C (60-69), D (50-59), F (<50)
export const DEFAULT_GRADE_SCHEME: GradeScheme[] = [
  { grade: 'A+', minPercentage: 90, maxPercentage: 100, gradePoint: 4.0 },
  { grade: 'A', minPercentage: 80, maxPercentage: 89.99, gradePoint: 3.75 },
  { grade: 'B', minPercentage: 70, maxPercentage: 79.99, gradePoint: 3.5 },
  { grade: 'C', minPercentage: 60, maxPercentage: 69.99, gradePoint: 3.0 },
  { grade: 'D', minPercentage: 50, maxPercentage: 59.99, gradePoint: 2.0 },
  { grade: 'F', minPercentage: 0, maxPercentage: 49.99, gradePoint: 0.0 },
];

/**
 * Calculate total marks from component marks
 */
export function calculateTotalMarks(components: {
  theory?: number;
  mcq?: number;
  practical?: number;
  viva?: number;
  classTest?: number;
  attendance?: number;
}): number {
  return (
    (components.theory || 0) +
    (components.mcq || 0) +
    (components.practical || 0) +
    (components.viva || 0) +
    (components.classTest || 0) +
    (components.attendance || 0)
  );
}

/**
 * Calculate percentage from total and full marks
 */
export function calculatePercentage(totalMarks: number, fullMarks: number): number {
  if (fullMarks === 0) return 0;
  const percentage = (totalMarks / fullMarks) * 100;
  return Math.round(percentage * 100) / 100; // Round to 2 decimals
}

/**
 * Get grade based on percentage and scheme
 */
export function getGrade(
  percentage: number,
  gradeScheme: GradeScheme[] = DEFAULT_GRADE_SCHEME
): string | undefined {
  const gradeObj = gradeScheme.find(
    (g) => percentage >= g.minPercentage && percentage <= g.maxPercentage
  );
  return gradeObj?.grade;
}

/**
 * Get grade point based on percentage and scheme
 */
export function getGradePoint(
  percentage: number,
  gradeScheme: GradeScheme[] = DEFAULT_GRADE_SCHEME
): number | undefined {
  const gradeObj = gradeScheme.find(
    (g) => percentage >= g.minPercentage && percentage <= g.maxPercentage
  );
  return gradeObj?.gradePoint;
}

/**
 * Check if student passed based on percentage and pass marks
 */
export function isPassed(percentage: number, passMarks: number): boolean {
  return percentage >= passMarks;
}

/**
 * Generate automatic academic remark based on performance
 */
export function generateAcademicRemark(percentage: number): string {
  if (percentage >= 90) return 'Excellent performance';
  if (percentage >= 80) return 'Very good performance';
  if (percentage >= 70) return 'Good performance';
  if (percentage >= 60) return 'Satisfactory performance';
  if (percentage >= 50) return 'Average performance, needs improvement';
  return 'Poor performance, requires attention';
}

/**
 * Validate mark entry against full marks
 */
export function validateMarkEntry(
  marks: number,
  fullMarks: number
): { valid: boolean; error?: string } {
  if (marks < 0) return { valid: false, error: 'Marks cannot be negative' };
  if (marks > fullMarks) {
    return { valid: false, error: `Marks cannot exceed full marks (${fullMarks})` };
  }
  return { valid: true };
}

/**
 * Calculate class average percentage
 */
export function calculateClassAverage(percentages: number[]): number {
  if (percentages.length === 0) return 0;
  const sum = percentages.reduce((a, b) => a + b, 0);
  return Math.round((sum / percentages.length) * 100) / 100;
}

/**
 * Calculate GPA from multiple grades
 */
export function calculateGPA(
  gradePoints: (number | undefined)[],
  credits?: number[]
): number {
  const validGradePoints = gradePoints.filter((gp) => gp !== undefined) as number[];
  if (validGradePoints.length === 0) return 0;

  if (credits && credits.length === validGradePoints.length) {
    // Weighted GPA
    const totalCredits = credits.reduce((a, b) => a + b, 0);
    const weightedSum = validGradePoints.reduce(
      (sum, gp, i) => sum + gp * (credits[i] || 1),
      0
    );
    return Math.round((weightedSum / totalCredits) * 100) / 100;
  }

  // Simple average GPA
  const sum = validGradePoints.reduce((a, b) => a + b, 0);
  return Math.round((sum / validGradePoints.length) * 100) / 100;
}

/**
 * Rank students based on percentage
 */
export function rankStudents(
  students: Array<{ studentId: string; percentage: number }>
): Array<{ studentId: string; percentage: number; rank: number }> {
  return students
    .sort((a, b) => b.percentage - a.percentage)
    .map((student, index) => ({
      ...student,
      rank: index + 1,
    }));
}

/**
 * Check if marks entry is complete (all components must be provided or all absent)
 */
export function isMarkEntryComplete(
  components: {
    theory?: number;
    mcq?: number;
    practical?: number;
    viva?: number;
    classTest?: number;
    attendance?: number;
  },
  isAbsent: boolean,
  requiredComponents: string[]
): { complete: boolean; missingComponents?: string[] } {
  if (isAbsent) return { complete: true };

  const missing = requiredComponents.filter(
    (comp) => components[comp as keyof typeof components] === undefined || components[comp as keyof typeof components] === null
  );

  return {
    complete: missing.length === 0,
    missingComponents: missing.length > 0 ? missing : undefined,
  };
}
