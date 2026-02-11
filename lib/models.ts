import mongoose, { Schema, Model, Document } from 'mongoose';

// --- Counter Model (For Auto-Increment Codes) ---
export interface ICounter {
  _id: string; // 'EMP', 'PRO', 'LOC'
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export const Counter: Model<ICounter> = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

// --- User Model ---
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  employeeCode?: string; // Auto-generated EMP001
  companyId?: mongoose.Types.ObjectId;
  image?: string;
  settings: {
    isAutoApprove: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.EMPLOYEE },
    employeeCode: { type: String, unique: true, sparse: true }, // Unique if exists
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    image: { type: String },
    settings: {
      isAutoApprove: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);


// --- Company Model ---
export interface ICompany extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  subscriptionStatus: string;
  settings: {
    backdateLimit: number;
    allowFutureEntry: boolean;
    dayStart: string;     // e.g. "06:00"
    eveningStart: string; // e.g. "18:00"
    nightStart: string;   // e.g. "22:00"
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionStatus: { type: String, default: 'ACTIVE' },
    settings: {
      backdateLimit: { type: Number, default: 30 },
      allowFutureEntry: { type: Boolean, default: false },
      dayStart: { type: String, default: "06:00" },
      eveningStart: { type: String, default: "18:00" },
      nightStart: { type: String, default: "22:00" },
    },
  },
  { timestamps: true }
);

export const Company: Model<ICompany> = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);


// --- Project Model ---
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  COMPLETED = 'COMPLETED',
}

export interface IProject extends Document {
  name: string;
  code: string;
  companyId: mongoose.Types.ObjectId;
  description?: string;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date; // Optional
  estimatedHours?: number; // Optional
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true }, // Ensure global uniqueness for simplified searching, or keep scoped to company if preferred
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    description: { type: String },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.ACTIVE },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    estimatedHours: { type: Number },
  },
  { timestamps: true }
);

// ProjectSchema.index({ companyId: 1, code: 1 }, { unique: true }); // Prefer global uniqueness for generated codes
export const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);


// --- Workplace Model (NEW) ---
export interface IWorkplace extends Document {
  name: string;
  code: string;
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkplaceSchema = new Schema<IWorkplace>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  },
  { timestamps: true }
);

// WorkplaceSchema.index({ companyId: 1, code: 1 }, { unique: true });
export const Workplace: Model<IWorkplace> = mongoose.models.Workplace || mongoose.model<IWorkplace>('Workplace', WorkplaceSchema);


// --- TimeEntry Model (UPDATED) ---
export enum TimeEntryStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ITimeEntry extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  workplaceId?: mongoose.Types.ObjectId; // New: Optional workplace
  date: Date;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  totalHours: number;
  
  // Hour Type Breakdown
  dayHours: number;
  eveningHours: number;
  nightHours: number;

  // Split Logic
  isSplit: boolean;
  parentEntryId?: mongoose.Types.ObjectId; // If this is the 2nd part of a split

  status: TimeEntryStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workplaceId: { type: Schema.Types.ObjectId, ref: 'Workplace' },

    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalHours: { type: Number, required: true },

    dayHours: { type: Number, default: 0 },
    eveningHours: { type: Number, default: 0 },
    nightHours: { type: Number, default: 0 },

    isSplit: { type: Boolean, default: false },
    parentEntryId: { type: Schema.Types.ObjectId, ref: 'TimeEntry' },

    status: { type: String, enum: Object.values(TimeEntryStatus), default: TimeEntryStatus.PENDING },
    description: { type: String },
  },
  { timestamps: true }
);

TimeEntrySchema.index({ userId: 1, date: 1 });
TimeEntrySchema.index({ companyId: 1, date: 1 });
// Compound index for finding overlaps: userId + (optional) date range
// But logic handled primarily by finding candidates by date

export const TimeEntry: Model<ITimeEntry> = mongoose.models.TimeEntry || mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);
