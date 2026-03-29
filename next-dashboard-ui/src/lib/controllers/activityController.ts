import { connectDB } from '../mongodb';
import { Activity } from '../models/Activity';
import { Class } from '../models/Class';

interface CreateActivityInput {
  title: string;
  description: string;
  classId: string;
  date?: Date;
}

interface UpdateActivityInput {
  title?: string;
  description?: string;
  date?: Date;
}

/**
 * Create activity
 */
export async function createActivity(input: CreateActivityInput) {
  try {
    await connectDB();

    // Verify class exists
    const classDoc = await Class.findById(input.classId);
    if (!classDoc) {
      return { success: false, message: 'Class not found', statusCode: 404 };
    }

    const activity = new Activity({
      title: input.title,
      description: input.description,
      classId: input.classId,
      date: input.date || new Date(),
    });

    await activity.save();

    return {
      success: true,
      message: 'Activity created successfully',
      data: await activity.populate('classId'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating activity:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create activity',
      statusCode: 500,
    };
  }
}

/**
 * Get activity by ID
 */
export async function getActivityById(activityId: string) {
  try {
    await connectDB();

    const activity = await Activity.findById(activityId).populate('classId');
    if (!activity) {
      return { success: false, message: 'Activity not found', statusCode: 404 };
    }

    return { success: true, data: activity, statusCode: 200 };
  } catch (error) {
    console.error('Error getting activity:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get activity',
      statusCode: 500,
    };
  }
}

/**
 * Get all activities
 */
export async function getAllActivities() {
  try {
    await connectDB();

    const activities = await Activity.find()
      .populate('classId')
      .sort({ date: -1 });

    return {
      success: true,
      data: activities,
      count: activities.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting activities:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get activities',
      statusCode: 500,
    };
  }
}

/**
 * Get activities by class ID
 */
export async function getActivitiesByClassId(classId: string) {
  try {
    await connectDB();

    const activities = await Activity.find({ classId })
      .populate('classId')
      .sort({ date: -1 });

    return {
      success: true,
      data: activities,
      count: activities.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting activities:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get activities',
      statusCode: 500,
    };
  }
}

/**
 * Get activities by date range
 */
export async function getActivitiesByDateRange(startDate: Date, endDate: Date) {
  try {
    await connectDB();

    const activities = await Activity.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('classId')
      .sort({ date: -1 });

    return {
      success: true,
      data: activities,
      count: activities.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting activities:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get activities',
      statusCode: 500,
    };
  }
}

/**
 * Update activity
 */
export async function updateActivity(activityId: string, input: UpdateActivityInput) {
  try {
    await connectDB();

    const activity = await Activity.findByIdAndUpdate(
      activityId,
      { ...input },
      { new: true }
    ).populate('classId');

    if (!activity) {
      return { success: false, message: 'Activity not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Activity updated successfully',
      data: activity,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating activity:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update activity',
      statusCode: 500,
    };
  }
}

/**
 * Delete activity
 */
export async function deleteActivity(activityId: string) {
  try {
    await connectDB();

    const activity = await Activity.findByIdAndDelete(activityId);
    if (!activity) {
      return { success: false, message: 'Activity not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Activity deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting activity:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete activity',
      statusCode: 500,
    };
  }
}

/**
 * Get recent activities
 */
export async function getRecentActivities(limit: number = 10) {
  try {
    await connectDB();

    const activities = await Activity.find()
      .populate('classId')
      .sort({ date: -1 })
      .limit(limit);

    return {
      success: true,
      data: activities,
      count: activities.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get activities',
      statusCode: 500,
    };
  }
}
