"use server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { Workplace } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { generateCode } from "@/lib/code-generator";

export async function createWorkplace(formData: FormData) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" };
    }

    const name = formData.get("name") as string;

    if (!name) {
      return { error: "Name is required" };
    }

    await connectToDatabase();

    const code = await generateCode('LOC');

    await Workplace.create({
      name,
      code,
      companyId: session.user.companyId
    });

    revalidatePath("/dashboard/workplaces"); // Assuming this page will exist
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to create workplace" };
  }
}
