import { User, Company, Project, Workplace, UserRole } from "@/lib/models";
import connectToDatabase from "@/lib/db";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { generateCode } from "@/lib/code-generator";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seed() {
  console.log("🌱 Seeding Enterprise DB...");
  await connectToDatabase();

  // Optionally clear
  // await User.deleteMany({});
  // await Company.deleteMany({});
  // await Project.deleteMany({});
  // await Workplace.deleteMany({});
  // await mongoose.connection.collection('timeentries').deleteMany({});

  const hashedPassword = await bcrypt.hash("password", 10);

  // 1. Create Company with Enterprise Settings
  console.log("Creating/Updating Company...");
  let company = await Company.findOne({ name: "Lion Roleplay" });
  if (!company) {
     const tempOwnerId = new mongoose.Types.ObjectId();
     company = await Company.create({
         name: "Lion Roleplay",
         ownerId: tempOwnerId,
         settings: { 
             backdateLimit: 30,
             dayStart: "06:00",
             eveningStart: "18:00",
             nightStart: "22:00"
         }
     });
  } else {
     // Ensure settings are updated if exists
     company.settings.dayStart = "06:00";
     company.settings.eveningStart = "18:00";
     company.settings.nightStart = "22:00";
     await company.save();
  }

  // 2. Create Admin
  console.log("Creating Admin...");
  let admin = await User.findOne({ email: "admin@lion.com" });
  if (!admin) {
      const code = await generateCode('EMP');
      admin = await User.create({
          name: "Super Admin",
          email: "admin@lion.com",
          password: hashedPassword,
          role: UserRole.ADMIN,
          companyId: company._id,
          employeeCode: code
      });
      company.ownerId = admin._id as any;
      await company.save();
  }

  // 3. Create Employee
  console.log("Creating Employee...");
  let employee = await User.findOne({ email: "employee@lion.com" });
  if (!employee) {
      const code = await generateCode('EMP');
      employee = await User.create({
          name: "John Doe",
          email: "employee@lion.com",
          password: hashedPassword,
          role: UserRole.EMPLOYEE,
          companyId: company._id,
          employeeCode: code
      });
  }

  // 4. Create Projects
  console.log("Creating Projects...");
  const projects = [
      { name: "Website Redesign" },
      { name: "Mobile App" },
  ];

  for (const p of projects) {
      const exists = await Project.findOne({ name: p.name, companyId: company._id });
      if (!exists) {
          const code = await generateCode('PRO');
          await Project.create({
              name: p.name,
              code: code,
              companyId: company._id
          });
      }
  }

  // 5. Create Workplaces
  console.log("Creating Workplaces...");
  const workplaces = [
      { name: "Main Office" },
      { name: "Remote" },
  ];

  for (const w of workplaces) {
      const exists = await Workplace.findOne({ name: w.name, companyId: company._id });
      if (!exists) {
          const code = await generateCode('LOC');
          await Workplace.create({
              name: w.name,
              code: code,
              companyId: company._id
          });
      }
  }

  console.log("✅ Seeding complete!");
  console.log("Admin: admin@lion.com / password");
  console.log("Employee: employee@lion.com / password");
  process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
