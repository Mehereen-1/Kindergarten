import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import ParentProfile from '@/lib/models/ParentProfile';
import Student from '@/lib/models/Student';
import { generateEmail, generatePassword, parseCSVLine, isValidEmail, isValidPhone } from '@/lib/utils/generators';

/**
 * Bulk Import Students from CSV
 * POST /api/admin/students/import
 * 
 * CSV Format:
 * Student Name,Class,Section,Roll Number,Date of Birth,Parent Name,Parent Email,Parent Phone
 * Sadia Ahmed,KG-A,A,1,2020-05-15,Mrs. Ahmed,ahmed@email.com,9876543210
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { csvData } = body;

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        { error: 'CSV data is required' },
        { status: 400 }
      );
    }

    // Parse CSV
    const lines = csvData.trim().split('\n');
    const headers = parseCSVLine(lines[0]);

    // Validate headers
    const requiredHeaders = ['Student Name', 'Class', 'Section', 'Roll Number', 'Parent Name', 'Parent Phone'];
    
    const results = {
      success: [],
      failed: [],
      total: lines.length - 1
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const rowData: any = {};
      
      headers.forEach((header, index) => {
        rowData[header.trim()] = values[index]?.trim() || '';
      });

      try {
        // Extract student data
        const studentName = rowData['Student Name'] || rowData['student name'] || rowData['Name'];
        const className = rowData['Class'] || rowData['class'];
        const section = rowData['Section'] || rowData['section'];
        const rollNumber = parseInt(rowData['Roll Number'] || rowData['roll number'] || rowData['Roll']);
        const dateOfBirth = rowData['Date of Birth'] || rowData['DOB'] || rowData['date of birth'];
        
        // Extract parent data
        const parentName = rowData['Parent Name'] || rowData['parent name'];
        const parentEmail = rowData['Parent Email'] || rowData['parent email'] || '';
        const parentPhone = rowData['Parent Phone'] || rowData['parent phone'];

        // Validate required fields
        if (!studentName || !className || !section || !rollNumber || !parentName || !parentPhone) {
          results.failed.push({
            row: i + 1,
            data: rowData,
            error: 'Missing required fields: Student Name, Class, Section, Roll Number, Parent Name, Parent Phone'
          });
          continue;
        }

        if (!isValidPhone(parentPhone)) {
          results.failed.push({
            row: i + 1,
            data: rowData,
            error: 'Invalid parent phone number'
          });
          continue;
        }

        // Auto-generate student email and password
        const studentEmail = generateEmail(studentName, 'student');
        const studentPassword = generatePassword();

        // Check if parent exists or create new
        let parent = await User.findOne({ phone: parentPhone, role: 'parent' });
        let isNewParent = false;
        
        if (!parent) {
          // Create parent account
          const parentEmailGenerated = parentEmail || generateEmail(parentName, 'parent');
          const parentPasswordGenerated = generatePassword();

          parent = await User.create({
            name: parentName,
            email: parentEmailGenerated,
            password: parentPasswordGenerated,
            phone: parentPhone,
            role: 'parent',
            status: 'active'
          });

          // Create ParentProfile
          await ParentProfile.create({
            userId: parent._id,
            address: '',
            occupation: ''
          });
          
          isNewParent = true;
        }

        // Create student record
        const student = await Student.create({
          name: studentName,
          email: studentEmail,
          roll: String(rollNumber),
          grade: className,
          parentId: parent._id,
          birthday: dateOfBirth ? new Date(dateOfBirth) : undefined
        });

        results.success.push({
          row: i + 1,
          student: {
            name: studentName,
            email: studentEmail,
            password: studentPassword,
            class: className,
            section,
            rollNumber,
            _id: student._id
          },
          parent: {
            name: parent.name,
            email: parent.email,
            phone: parent.phone,
            _id: parent._id,
            isNew: isNewParent
          }
        });

      } catch (error: any) {
        results.failed.push({
          row: i + 1,
          data: rowData,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      message: `Imported ${results.success.length} students successfully`,
      results
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
