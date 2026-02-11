"use server";

import { auth } from "@/auth";
import connectToDatabase from "@/lib/db";
import { Project, TimeEntry, User } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { generateCode } from "@/lib/code-generator";
import mongoose from "mongoose";

export async function createProject(formData: FormData) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { error: "Unauthorized" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) {
      return { error: "Name is required" };
    }

    await connectToDatabase();

    const code = await generateCode('PRO');

    await Project.create({
      name,
      code,
      description,
      companyId: session.user.companyId, // Link to company
      status: 'ACTIVE',
      startDate: new Date()
    });

    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Failed to create project" };
  }
}

export async function getProjectsWithStats() {
    const session = await auth();
    if (!session) return [];

    await connectToDatabase();

    // 1. Get all projects for company
    const projects = await Project.find({ companyId: session.user.companyId }).sort({ createdAt: -1 }).lean();

    // 2. Aggregate stats for each project
    // This could be optimized with a complex aggregation pipeline, but for now we iterate (assuming < 50 projects)
    const projectsWithStats = await Promise.all(projects.map(async (p) => {
        // Count employees who have logged time to this project (distinct users)
        const distinctUsers = await TimeEntry.distinct('userId', { projectId: p._id, companyId: session.user.companyId });
        
        // Sum total hours
        const hoursResult = await TimeEntry.aggregate([
            { $match: { projectId: p._id, companyId: session.user.companyId as any } },
            { $group: { _id: null, total: { $sum: "$totalHours" } } }
        ]);

        return {
            id: p._id.toString(),
            name: p.name,
            code: p.code,
            status: p.status,
            startDate: p.startDate,
            employeeCount: distinctUsers.length,
            totalHours: hoursResult[0]?.total || 0
        };
    }));

    return projectsWithStats;
}

export async function getProjectById(id: string) {
    const session = await auth();
    if (!session) return null;

    await connectToDatabase();
    
    console.log("--- DEBUG START: getProjectById ---");
    console.log("Incoming ID:", id);
    console.log("User Company ID:", session.user.companyId);

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
             console.error("Invalid Project ID format:", id);
             return null;
        }

        const project = await Project.findById(id).lean();
        
        if (!project) {
            console.error("Project not found in DB with ID:", id);
            return null;
        }

        // Safe Company ID comparison
        const projectCompanyId = project.companyId.toString();
        const userCompanyId = session.user.companyId.toString();

        if (projectCompanyId !== userCompanyId) {
            console.error(`Ownership mismatch. Project: ${projectCompanyId}, User: ${userCompanyId}`);
            return null;
        }

        // Aggregate Team Members (Users who have logged time)
    // We group by userId and sum hours
    const teamStats = await TimeEntry.aggregate([
        { $match: { projectId: project._id, companyId: session.user.companyId as any } },
        { 
            $group: { 
                _id: "$userId", 
                totalHours: { $sum: "$totalHours" },
                lastEntry: { $max: "$date" }
            } 
        },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { 
            $project: { 
                userId: "$_id",
                name: "$user.name", 
                email: "$user.email",
                image: "$user.image", // If available
                totalHours: 1,
                lastEntry: 1
            } 
        },
        { $sort: { totalHours: -1 } } // Top contributors first
    ]);

    return {
        ...project,
        id: project._id.toString(),
        team: teamStats.map(t => ({
            id: t.userId.toString(),
            name: t.name,
            email: t.email,
            image: t.image,
            totalHours: t.totalHours,
            lastActivity: t.lastEntry
        }))
    };
    } catch (error) {
        console.error("Error fetching project:", error);
        return null;
    }
}

export async function updateProject(id: string, formData: FormData) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'ADMIN') return { error: "Unauthorized" };

        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const status = formData.get("status") as string;
        const startDate = formData.get("startDate") as string;
        const endDate = formData.get("endDate") as string;
        const estimatedHours = formData.get("estimatedHours") as string;
        const code = formData.get("code") as string;

        await connectToDatabase();

        // Ensure project belongs to company
        const project = await Project.findOne({ _id: id, companyId: session.user.companyId });
        if (!project) return { error: "Project not found" };

        project.name = name;
        project.description = description;
        project.status = status;
        project.code = code;
        if (startDate) project.startDate = new Date(startDate);
        if (endDate) project.endDate = new Date(endDate);
        if (estimatedHours) project.estimatedHours = parseFloat(estimatedHours);

        await project.save();

        revalidatePath(`/dashboard/projects/${id}`);
        revalidatePath("/dashboard/projects");
        
        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: "Failed to update project" };
    }
}
