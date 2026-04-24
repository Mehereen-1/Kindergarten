import { connectDB } from '../mongodb';
import Observation from '../models/Observation';
import Student from '../models/Student';

type ObservationCategory = 'BEHAVIOR' | 'SOCIAL' | 'LANGUAGE' | 'MOTOR_SKILLS' | 'EMOTIONAL';

interface CreateObservationInput {
  studentId: string;
  note: string;
  category: ObservationCategory;
  date?: Date;
}

interface UpdateObservationInput {
  note?: string;
  category?: ObservationCategory;
}

/**
 * Create observation record
 */
export async function createObservation(input: CreateObservationInput) {
  try {
    await connectDB();

    // Verify student exists
    const student = await Student.findById(input.studentId);
    if (!student) {
      return { success: false, message: 'Student not found', statusCode: 404 };
    }

    const observation = new Observation({
      studentId: input.studentId,
      note: input.note,
      category: input.category,
      date: input.date || new Date(),
    });

    await observation.save();

    return {
      success: true,
      message: 'Observation created successfully',
      data: await observation.populate('studentId'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating observation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create observation',
      statusCode: 500,
    };
  }
}

/**
 * Get observation by ID
 */
export async function getObservationById(observationId: string) {
  try {
    await connectDB();

    const observation = await Observation.findById(observationId).populate('studentId');
    if (!observation) {
      return { success: false, message: 'Observation not found', statusCode: 404 };
    }

    return { success: true, data: observation, statusCode: 200 };
  } catch (error) {
    console.error('Error getting observation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get observation',
      statusCode: 500,
    };
  }
}

/**
 * Get observations by student ID
 */
export async function getObservationsByStudentId(studentId: string) {
  try {
    await connectDB();

    const observations = await Observation.find({ studentId })
      .populate('studentId')
      .sort({ date: -1 });

    return {
      success: true,
      data: observations,
      count: observations.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting observations:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get observations',
      statusCode: 500,
    };
  }
}

/**
 * Get observations by category
 */
export async function getObservationsByCategory(
  studentId: string,
  category: ObservationCategory
) {
  try {
    await connectDB();

    const observations = await Observation.find({ studentId, category })
      .populate('studentId')
      .sort({ date: -1 });

    return {
      success: true,
      data: observations,
      count: observations.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting observations:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get observations',
      statusCode: 500,
    };
  }
}

/**
 * Get all observations
 */
export async function getAllObservations() {
  try {
    await connectDB();

    const observations = await Observation.find()
      .populate('studentId')
      .sort({ date: -1 });

    return {
      success: true,
      data: observations,
      count: observations.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting observations:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get observations',
      statusCode: 500,
    };
  }
}

/**
 * Update observation
 */
export async function updateObservation(observationId: string, input: UpdateObservationInput) {
  try {
    await connectDB();

    const observation = await Observation.findByIdAndUpdate(
      observationId,
      { ...input },
      { new: true }
    ).populate('studentId');

    if (!observation) {
      return { success: false, message: 'Observation not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Observation updated successfully',
      data: observation,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating observation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update observation',
      statusCode: 500,
    };
  }
}

/**
 * Delete observation
 */
export async function deleteObservation(observationId: string) {
  try {
    await connectDB();

    const observation = await Observation.findByIdAndDelete(observationId);
    if (!observation) {
      return { success: false, message: 'Observation not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Observation deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting observation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete observation',
      statusCode: 500,
    };
  }
}

/**
 * Get observation summary by student
 */
export async function getObservationSummary(studentId: string) {
  try {
    await connectDB();

    const categories: ObservationCategory[] = [
      'BEHAVIOR',
      'SOCIAL',
      'LANGUAGE',
      'MOTOR_SKILLS',
      'EMOTIONAL',
    ];

    const summary: any = {
      studentId,
      categories: {},
    };

    for (const category of categories) {
      const count = await Observation.countDocuments({ studentId, category });
      summary.categories[category] = count;
    }

    const total = await Observation.countDocuments({ studentId });
    summary.total = total;

    return {
      success: true,
      data: summary,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting observation summary:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get summary',
      statusCode: 500,
    };
  }
}
