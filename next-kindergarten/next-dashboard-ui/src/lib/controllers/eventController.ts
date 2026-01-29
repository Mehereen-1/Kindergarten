import { connectDB } from '../mongodb';
import { Event } from '../models/Event';

interface CreateEventInput {
  title: string;
  description: string;
  eventDate: Date;
}

interface UpdateEventInput {
  title?: string;
  description?: string;
  eventDate?: Date;
}

/**
 * Create event
 */
export async function createEvent(input: CreateEventInput) {
  try {
    await connectDB();

    const event = new Event({
      title: input.title,
      description: input.description,
      eventDate: input.eventDate,
    });

    await event.save();

    return {
      success: true,
      message: 'Event created successfully',
      data: event,
      statusCode: 201,
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create event',
      statusCode: 500,
    };
  }
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string) {
  try {
    await connectDB();

    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, message: 'Event not found', statusCode: 404 };
    }

    return { success: true, data: event, statusCode: 200 };
  } catch (error) {
    console.error('Error getting event:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get event',
      statusCode: 500,
    };
  }
}

/**
 * Get all events
 */
export async function getAllEvents() {
  try {
    await connectDB();

    const events = await Event.find().sort({ eventDate: 1 });

    return {
      success: true,
      data: events,
      count: events.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting events:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get events',
      statusCode: 500,
    };
  }
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(days: number = 30) {
  try {
    await connectDB();

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const events = await Event.find({
      eventDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ eventDate: 1 });

    return {
      success: true,
      data: events,
      count: events.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get events',
      statusCode: 500,
    };
  }
}

/**
 * Get past events
 */
export async function getPastEvents(days: number = 30) {
  try {
    await connectDB();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await Event.find({
      eventDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ eventDate: -1 });

    return {
      success: true,
      data: events,
      count: events.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error getting past events:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get events',
      statusCode: 500,
    };
  }
}

/**
 * Update event
 */
export async function updateEvent(eventId: string, input: UpdateEventInput) {
  try {
    await connectDB();

    const event = await Event.findByIdAndUpdate(
      eventId,
      { ...input },
      { new: true }
    );

    if (!event) {
      return { success: false, message: 'Event not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Event updated successfully',
      data: event,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error updating event:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update event',
      statusCode: 500,
    };
  }
}

/**
 * Delete event
 */
export async function deleteEvent(eventId: string) {
  try {
    await connectDB();

    const event = await Event.findByIdAndDelete(eventId);
    if (!event) {
      return { success: false, message: 'Event not found', statusCode: 404 };
    }

    return {
      success: true,
      message: 'Event deleted successfully',
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error deleting event:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete event',
      statusCode: 500,
    };
  }
}

/**
 * Search events by title
 */
export async function searchEventsByTitle(title: string) {
  try {
    await connectDB();

    const events = await Event.find({
      title: { $regex: title, $options: 'i' },
    }).sort({ eventDate: 1 });

    return {
      success: true,
      data: events,
      count: events.length,
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error searching events:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to search events',
      statusCode: 500,
    };
  }
}
