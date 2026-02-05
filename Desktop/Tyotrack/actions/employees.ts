"use server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { User, UserRole } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { generateCode } from "@/lib/code-generator";
import bcrypt from "bcryptjs";

export async function createEmployee(formData: FormData) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
      return { error: "Name, Email, and Password are required" };
    }

    await connectToDatabase();

    // Check if email exists
    const existing = await User.findOne({ email });
    if (existing) {
        return { error: "Email already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = await generateCode('EMP');

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      companyId: session.user.companyId,
      employeeCode: code
    });

    revalidatePath("/dashboard/employees"); // Assuming this page will exist
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to create employee" };
  }
}
