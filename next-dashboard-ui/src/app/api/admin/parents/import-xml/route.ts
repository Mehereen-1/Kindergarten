import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { XMLParser } from "fast-xml-parser";
import { createUser } from "@/lib/controllers/adminController";
import { createParentProfile } from "@/lib/controllers/adminController";
import { generatePassword } from "@/lib/utils/generators";
import { sendPasswordEmail } from "@/lib/utils/email";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { records } = await request.json();

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Records are required' },
        { status: 400 }
      );
    }

    type ImportSuccessItem = {
      email: string;
      password: string;
      name: string;
      phone: string;
      address: string;
      occupation: string;
      parentId: string;
      userId: string;
    };

    type ImportFailedItem = {
      row: number;
      data: any;
      error: string;
    };

    const results: {
      success: ImportSuccessItem[];
      failed: ImportFailedItem[];
      total: number;
    } = {
      success: [],
      failed: [],
      total: records.length,
    };

    // Get current parent count for ID generation
    const parentCount = await User.countDocuments({ role: 'parent' });

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      try {
        const email = row.email;
        if (!email) {
          throw new Error('Email is required');
        }

        // 1️⃣ Create user
        const password = generatePassword();
        const name = row.name || email.split('@')[0]; // Use email prefix as name if not provided
        const passwordExpiry = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
        const userRes = await createUser({
          email,
          name,
          password,
          role: 'parent',
          phone: row.phone || '',
          passwordExpiry,
          importedAt: new Date(),
        });

        if (!userRes.success) {
          throw new Error(userRes.message);
        }

        const createdUserId = userRes.data?.id;
        if (!createdUserId) {
          throw new Error('User creation response missing user id');
        }

        // 2️⃣ Create parent profile
        await createParentProfile({
          userId: createdUserId,
          address: row.address || '',
          occupation: row.occupation || '',
          children: [], // Will be assigned later
          parentId: `PAR${String(parentCount + results.success.length + 1).padStart(4, '0')}`,
        });

        // 3️⃣ Send password email
        const emailRes = await sendPasswordEmail(email, password);
        if (!emailRes.success) {
          console.error('Failed to send email to', email);
          // Still consider success, but log
        }

        results.success.push({
          email,
          password,
          name,
          phone: row.phone || '',
          address: row.address || '',
          occupation: row.occupation || '',
          parentId: `PAR${String(parentCount + results.success.length + 1).padStart(4, '0')}`,
          userId: createdUserId,
        });

      } catch (err: any) {
        results.failed.push({
          row: i + 1,
          data: row,
          error: err.message,
        });
      }
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}