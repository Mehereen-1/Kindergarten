import { NextRequest, NextResponse } from 'next/server';
import Topic from '@/lib/models/Topic';
import Quiz from '@/lib/models/Quiz';
import StudentQuizAttempt from '@/lib/models/StudentQuizAttempt';
import StudentMetrics from '@/lib/models/StudentMetrics';
import TopicMetrics from '@/lib/models/TopicMetrics';
import ContentChunk from '@/lib/models/ContentChunk';
import { processContentWithAI } from '@/lib/aiProcessingLayer';
import { updateStudentMetrics, updateTopicMetrics } from '@/lib/mathIntelligenceEngine';
import { chunkText, embedTexts } from '@/lib/ragUtils';
import { deleteStoredAssetByUrl, storeWebFileAsset } from '@/lib/serverStorage';

const pdfParse = require('pdf-parse');

// Connect to MongoDB
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/ildce/topics
 * Create a new topic with content
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const contentTypeHeader = request.headers.get('content-type') || '';

    let teacherId: string | null = null;
    let classId: string | null = null;
    let grade: string | null = null;
    let topic_name: string | null = null;
    let content_text: string | null = null;
    let content_type: string | null = null;
    let difficulty_weight: number | null = null;
    let category: string | null = null;
    let uploadedFile: File | null = null;

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData();
      teacherId = String(formData.get('teacherId') || '');
      classId = String(formData.get('classId') || '');
      grade = String(formData.get('grade') || '') || null;
      topic_name = String(formData.get('topic_name') || '');
      content_text = String(formData.get('content_text') || '');
      content_type = String(formData.get('content_type') || 'text');
      difficulty_weight = Number(formData.get('difficulty_weight') || 3);
      category = String(formData.get('category') || '');
      uploadedFile = formData.get('content_file') as File | null;
    } else {
      const body = await request.json();
      teacherId = body.teacherId;
      classId = body.classId;
      grade = body.grade || null;
      topic_name = body.topic_name;
      content_text = body.content_text;
      content_type = body.content_type || 'text';
      difficulty_weight = body.difficulty_weight || 3;
      category = body.category;
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;
    let extractedText = '';

    console.log('Uploaded file:', uploadedFile ? uploadedFile.name : 'No file');

    if (uploadedFile) {
      const fileArrayBuffer = await uploadedFile.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      const storedAsset = await storeWebFileAsset(uploadedFile, {
        purpose: 'ildce-topic-file',
        teacherId,
        classId,
      });

      fileUrl = storedAsset.url;
      console.log('File saved to:', fileUrl);
      fileName = uploadedFile.name;
      fileType = uploadedFile.type || 'application/octet-stream';
      fileSize = uploadedFile.size;

      const lowerName = uploadedFile.name.toLowerCase();
      if (uploadedFile.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
        const parsed = await pdfParse(fileBuffer);
        extractedText = parsed.text || '';
      } else if (uploadedFile.type.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.csv')) {
        extractedText = fileBuffer.toString('utf-8');
      }
    }

    const combinedContent = [content_text || '', extractedText].filter(Boolean).join('\n\n');

    // Validate required fields
    if (!teacherId || !classId || !topic_name || !combinedContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process content with AI
    console.log('Processing content with AI...');
    const aiResults = await processContentWithAI(
      combinedContent,
      content_type || 'text',
      topic_name
    );

    // Create topic in database
    const newTopic = new Topic({
      teacherId,
      classId,
      grade: grade || null,
      topic_name,
      content_text: combinedContent,
      content_type: content_type || 'text',
      difficulty_weight: difficulty_weight || 3,
      category,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      ai_summary: aiResults.summary,
      ai_key_points: aiResults.key_points,
      ai_definitions: aiResults.definitions,
      ai_formulas: aiResults.formulas,
      concepts: aiResults.concepts,
    });

    console.log('Creating topic with file data:', {
      topic_name,
      file_url: fileUrl,
      file_name: fileName,
    });

    const savedTopic = await newTopic.save();
    
    console.log('Saved topic to DB:', {
      _id: savedTopic._id,
      topic_name: savedTopic.topic_name,
      file_url: savedTopic.file_url,
      file_name: savedTopic.file_name,
      file_type: savedTopic.file_type,
      file_size: savedTopic.file_size,
    });

    // Verify it was saved correctly by querying it back
    const verifyTopic = await Topic.findById(savedTopic._id);
    console.log('Verified topic from DB:', {
      _id: verifyTopic._id,
      file_url: verifyTopic.file_url,
      file_name: verifyTopic.file_name,
    });

    // Generate quiz from AI results
    const quiz = new Quiz({
      topicId: savedTopic._id,
      teacherId,
      title: `${topic_name} - Auto-Generated Quiz`,
      description: `AI-generated quiz for ${topic_name}`,
      is_ai_generated: true,
    });

    // Convert AI questions to quiz format
    const questions = [];

    // Add MCQ
    aiResults.generated_questions.mcq.forEach((q) => {
      questions.push({
        question_text: q.question,
        question_type: 'mcq',
        options: q.options,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty,
        concept_tag: q.concept_tag,
        explanation: q.explanation,
      });
    });

    // Add Short Answer
    aiResults.generated_questions.short_answer.forEach((q) => {
      questions.push({
        question_text: q.question,
        question_type: 'short_answer',
        options: [],
        correct_answer: q.correct_answer,
        difficulty: q.difficulty,
        concept_tag: q.concept_tag,
        explanation: q.explanation,
      });
    });

    // Add True/False
    aiResults.generated_questions.true_false.forEach((q) => {
      questions.push({
        question_text: q.question,
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: q.correct_answer ? 'True' : 'False',
        difficulty: q.difficulty,
        concept_tag: q.concept_tag,
        explanation: q.explanation,
      });
    });

    quiz.questions = questions;
    quiz.total_questions = questions.length;
    await quiz.save();

    // Create embeddings for RAG
    try {
      const chunks = chunkText(combinedContent, 1000, 150);
      const embeddings = await embedTexts(chunks);
      const chunkDocs = chunks.map((chunk, idx) => ({
        topicId: savedTopic._id,
        classId,
        chunk_text: chunk,
        embedding: embeddings[idx],
        source_type: extractedText ? 'file' : 'notes',
        file_name: fileName || undefined,
      }));

      if (chunkDocs.length > 0) {
        await ContentChunk.insertMany(chunkDocs);
      }
    } catch (embedError) {
      console.error('Embedding error:', embedError);
    }

    return NextResponse.json(
      {
        topic: savedTopic,
        quiz: quiz,
        ai_processing: aiResults,
        message: 'Topic created successfully with AI-generated quiz',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating topic:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating topic' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ildce/topics
 * Get all topics for a class
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    let query: any = {};
    if (classId) query.classId = classId;
    if (teacherId) query.teacherId = teacherId;

    const topics = await Topic.find(query).sort({ created_at: -1 });

    return NextResponse.json(
      {
        topics,
        count: topics.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching topics' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ildce/topics?topicId=xxx
 * Update an existing topic (add or replace file)
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json(
        { error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    const contentTypeHeader = request.headers.get('content-type') || '';
    let uploadedFile: File | null = null;

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData();
      uploadedFile = formData.get('content_file') as File | null;
    }

    if (!uploadedFile) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Find existing topic
    const existingTopic = await Topic.findById(topicId);
    if (!existingTopic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Delete old file if exists
    await deleteStoredAssetByUrl(existingTopic.file_url);

    // Save new file
    const fileArrayBuffer = await uploadedFile.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    const storedAsset = await storeWebFileAsset(uploadedFile, {
      purpose: 'ildce-topic-file',
      teacherId: String(existingTopic.teacherId),
      classId: String(existingTopic.classId),
      topicId,
    });

    const fileUrl = storedAsset.url;
    const fileName = uploadedFile.name;
    const fileType = uploadedFile.type || 'application/octet-stream';
    const fileSize = uploadedFile.size;

    // Extract text from PDF if applicable
    let extractedText = '';
    const lowerName = uploadedFile.name.toLowerCase();
    if (uploadedFile.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
      const parsed = await pdfParse(fileBuffer);
      extractedText = parsed.text || '';
    }

    // Update content if we extracted text
    let updatedContent = existingTopic.content_text;
    if (extractedText) {
      updatedContent = [existingTopic.content_text, extractedText].filter(Boolean).join('\n\n');
      
      // Generate embeddings for the extracted text
      const chunks = chunkText(extractedText, 1000, 150);
      const embeddings = await embedTexts(chunks);
      
      const chunkDocs = chunks.map((chunk, idx) => ({
        topicId: existingTopic._id,
        classId: existingTopic.classId,
        chunk_text: chunk,
        embedding: embeddings[idx],
        chunk_index: idx,
        source_type: 'uploaded_file',
        source_name: fileName,
      }));
      
      // Delete old chunks for this topic
      await ContentChunk.deleteMany({ topicId: existingTopic._id });
      // Insert new chunks
      await ContentChunk.insertMany(chunkDocs);
    }

    // Update topic with file metadata
    existingTopic.file_url = fileUrl;
    existingTopic.file_name = fileName;
    existingTopic.file_type = fileType;
    existingTopic.file_size = fileSize;
    existingTopic.content_text = updatedContent;

    await existingTopic.save();

    return NextResponse.json(
      { message: 'Topic updated successfully', topic: existingTopic },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating topic:', error);
    return NextResponse.json(
      { error: error.message || 'Error updating topic' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ildce/topics?topicId=xxx
 * Delete a topic and its associated content chunks
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json(
        { error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    // Delete the topic
    const deletedTopic = await Topic.findByIdAndDelete(topicId);

    if (!deletedTopic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Delete associated content chunks
    await ContentChunk.deleteMany({ topicId });

    // Delete associated quizzes and attempts
    await Quiz.deleteMany({ topic_id: topicId });
    await StudentQuizAttempt.deleteMany({ topic_id: topicId });

    // Optionally delete associated metrics
    await TopicMetrics.deleteMany({ topic_id: topicId });

    // If there was an uploaded file, delete it from disk
    await deleteStoredAssetByUrl(deletedTopic.file_url);

    return NextResponse.json(
      { message: 'Topic deleted successfully', topic: deletedTopic },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting topic:', error);
    return NextResponse.json(
      { error: error.message || 'Error deleting topic' },
      { status: 500 }
    );
  }
}
