import { connectDB } from '../mongodb';
import { Announcement } from '../models/Announcement';

interface CreateAnnouncementInput {
  title: string;
  message: string;
  classId?: string;
}

interface UpdateAnnouncementInput {
  title?: string;
  message?: string;
}

/**
 * Create announcement
 */
export async function createAnnouncement(input: CreateAnnouncementInput) {
  try {
    await connectDB();

    const announcement = new Announcement({
      title: input.title,
      message: input.message,
      classId: input.classId || null,
    });

    await announcement.save();

    return {
      success: true,
      message: 'Announcement created successfully',
      data: await announcement.populate('classId'),
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating announcement:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create announcement',
      statusCode: 500,
    };
  }
}

/**
 * Get announcement by ID
 */
export async function getAnnouncementById(announcementId: string) {
  try {
    await connectDB();

    const announcement = await Announcement.findById(announcementId).populate('classId');
    if (!announcement) {
      return { success: false, message: 'Announcement not found', statusCode: 404 };
    }

    return { success: true, data: announcement, statusCode: 200 };
  } catch (error) {
    console.error('Error getting announcement:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get announcement',
      statusCode: 500,
    };
  }
}

/**
 * Get all announcements
 */
export async function getAllAnnouncements() {
  try {
    await connectDB();

    const announcements = await Announcement.find()
      .populate('classId')
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: announcements,
      count: announcements.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting announcements:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get announcements',
      statusCode: 500,
    };
  }
}

/**
 * Get announcements for a specific class
 */
export async function getClassAnnouncements(classId: string) {
  try {
    await connectDB();

    const announcements = await Announcement.find({
      $or: [{ classId }, { classId: null }],
    })
      .populate('classId')
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: announcements,
      count: announcements.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting announcements:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get announcements',
      statusCode: 500,
    };
  }
}

/**
 * Get school-wide announcements (classId is null)
 */
export async function getSchoolAnnouncements() {
  try {
    await connectDB();

    const announcements = await Announcement.find({ classId: null }).sort({
      createdAt: -1,
    });

    return {
      success: true,
      data: announcements,
      count: announcements.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting announcements:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get announcements',
      statusCode: 500,
    };
  }
}

/**
 * Update announcement
 */
export async function updateAnnouncement(announcementId: string, input: UpdateAnnouncementInput) {
  try {
    await connectDB();

    const announcement = await Announcement.findByIdAndUpdate(
      announcementId,
      { ...input },
      { new: true }
    ).populate('classId');

    if (!announcement) {
      return { success: false, message: 'Announcement not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating announcement:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update announcement',
      statusCode: 500,
    };
  }
}

/**
 * Delete announcement
 */
export async function deleteAnnouncement(announcementId: string) {
  try {
    await connectDB();

    const announcement = await Announcement.findByIdAndDelete(announcementId);
    if (!announcement) {
      return { success: false, message: 'Announcement not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Announcement deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete announcement',
      statusCode: 500,
    };
  }
}

/**
 * Get recent announcements
 */
export async function getRecentAnnouncements(limit: number = 5) {
  try {
    await connectDB();

    const announcements = await Announcement.find()
      .populate('classId')
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      success: true,
      data: announcements,
      count: announcements.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting recent announcements:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get announcements',
      statusCode: 500,
    };
  }
}
