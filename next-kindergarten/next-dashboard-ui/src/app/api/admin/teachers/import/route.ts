import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import TeacherProfile from '@/lib/models/TeacherProfile';
import { generateEmail, generatePassword, parseCSVLine, isValidEmail, isValidPhone } from '@/lib/utils/generators';

/**
 * Bulk Import Teachers from CSV
 * POST /api/admin/teachers/import
 * 
 * CSV Format:
 * Name,Phone,Subject,Qualification
 * Sadia Khan,9876543210,Mathematics,M.Ed
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
    const requiredHeaders = ['Name', 'Phone'];
    const hasAllHeaders = requiredHeaders.every(h => 
      headers.some(header => header.toLowerCase() === h.toLowerCase())
    );

    if (!hasAllHeaders) {
      return NextResponse.json(
        { error: 'CSV must have columns: Name, Phone, Subject, Qualification' },
        { status: 400 }
      );
    }

    const results = {
      success: [],
      failed: [],
      total: lines.length - 1
    };

    // Get current teacher count for ID generation
    const teacherCount = await User.countDocuments({ role: 'teacher' });

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
        // Extract data
        const name = rowData['Name'] || rowData['name'];
        const phone = rowData['Phone'] || rowData['phone'];
        const subject = rowData['Subject'] || rowData['subject'] || '';
        const qualification = rowData['Qualification'] || rowData['qualification'] || '';

        // Validate
        if (!name || !phone) {
          results.failed.push({
            row: i + 1,
            data: rowData,
            error: 'Name and Phone are required'
          });
          continue;
        }

        if (!isValidPhone(phone)) {
          results.failed.push({
            row: i + 1,
            data: rowData,
            error: 'Invalid phone number format'
          });
          continue;
        }

        // Auto-generate credentials
        const email = generateEmail(name, 'teacher');
        const password = generatePassword();

        // Check if already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          results.failed.push({
            row: i + 1,
            data: rowData,
            error: `Email already exists: ${email}`
          });
          continue;
        }

        // Generate employee ID
        const employeeId = `TCH${String(teacherCount + results.success.length + 1).padStart(4, '0')}`;

        // Create User record
        const user = await User.create({
          name,
          email,
          password, // In production, this should be hashed
          role: 'teacher',
          phone,
          status: 'active',
          createdAt: new Date()
        });

        // Create TeacherProfile record
        await TeacherProfile.create({
          userId: user._id,
          qualification,
          subjects: subject ? subject.split(',').map(s => s.trim()) : [],
          joiningDate: new Date(),
          employeeId,
          photo: ''
        });

        results.success.push({
          row: i + 1,
          name,
          email,
          password,
          phone,
          employeeId,
          subject,
          qualification,
          userId: user._id
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
      message: `Imported ${results.success.length} teachers successfully`,
      results
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
