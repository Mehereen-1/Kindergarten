import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import FacialDatabase from '@/lib/models/FacialDatabase';
import Student from '@/lib/models/Student';
import { getServerCctvBackendUrl } from '@/lib/serverConfig';
import { storeWebFileAsset } from '@/lib/serverStorage';

const PYTHON_BACKEND = getServerCctvBackendUrl();

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();
    const studentId = formData.get('studentId') as string;
    const files = formData.getAll('files') as File[];

    if (!studentId || files.length === 0) {
      return NextResponse.json(
        { error: 'Missing studentId or files' },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    let uploadedCount = 0;
    const imageUrls: string[] = [];
    let embeddingCount = 0;

    // Send images to Python backend for facial embedding extraction
    console.log(`📤 Sending ${files.length} images to Python backend for student ${studentId}`);
    
    try {
      const pythonFormData = new FormData();
      pythonFormData.append('student_id', studentId);
      
      for (const file of files) {
        console.log(`  - Adding file: ${file.name} (${file.size} bytes, ${file.type})`);
        pythonFormData.append('files', file);
      }

      const backendResponse = await fetch(`${PYTHON_BACKEND}/upload-student-images`, {
        method: 'POST',
        body: pythonFormData,
      });

      const backendText = await backendResponse.text();
      console.log(`Backend raw response: ${backendText}`);
      
      let backendResult;
      try {
        backendResult = JSON.parse(backendText);
      } catch (parseErr) {
        console.error(`❌ Failed to parse backend response: ${parseErr}`);
        backendResult = { error: 'Invalid JSON response from backend', raw: backendText };
      }
      
      if (backendResponse.ok) {
        embeddingCount = backendResult.embeddings_created || 0;
        const filesProcessed = backendResult.files_processed || 0;
        console.log(`✅ Backend response: processed ${filesProcessed} files, created ${embeddingCount} embeddings`);
        
        if (embeddingCount === 0) {
          console.warn(`⚠️ No embeddings created - possible issues: no faces detected, encoding error, or database issue`);
        }
      } else {
        console.error(`❌ Backend error (${backendResponse.status}): ${backendResult.error || backendText}`);
        // Continue with local file saving even if backend fails
      }
    } catch (err) {
      console.error('Error communicating with Python backend:', err);
      console.log('Continuing with local file saving...');
    }

    // Store preview images in Mongo-backed storage so Vercel does not depend on
    // a writable application filesystem at runtime.
    for (const file of files) {
      try {
        const storedAsset = await storeWebFileAsset(file, {
          purpose: 'attendance-preview',
          studentId,
          classId: String(student.classId || ''),
        });

        imageUrls.push(storedAsset.url);
        uploadedCount++;
      } catch (err) {
        console.error('Error saving file:', err);
      }
    }

    const update: Record<string, any> = {
      $set: {
        class_id: student.classId || undefined,
        last_updated: new Date(),
        is_processed: embeddingCount > 0,
      },
      $setOnInsert: {
        number_of_samples: 0,
      },
    };

    if (imageUrls.length > 0) {
      update.$set.preview_image_url = imageUrls[0];
    }

    // When the Python backend is unavailable, keep the sample count usable in Mongo.
    // If the backend succeeded, it already incremented the count while storing embeddings.
    if (embeddingCount === 0 && uploadedCount > 0) {
      update.$inc = { number_of_samples: uploadedCount };
    }

    // Update or create facial database record
    const facialRecord = await FacialDatabase.findOneAndUpdate(
      { student_id: studentId },
      update,
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: `✅ Successfully processed ${uploadedCount} images and created ${embeddingCount} facial embeddings for ${student.name}`,
      studentId,
      studentName: student.name,
      uploadedCount,
      embeddingsCreated: embeddingCount,
      imageUrls,
      facialRecordId: facialRecord._id,
    });
  } catch (error) {
    console.error('Error uploading facial images:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

