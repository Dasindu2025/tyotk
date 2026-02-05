
import { Counter } from "@/lib/models";

type CodeType = 'EMP' | 'PRO' | 'LOC';

/**
 * Generates a unique code for the given type.
 * e.g. EMP001, PRO005, LOC010
 * This function uses findOneAndUpdate for atomic increments.
 */
export async function generateCode(type: CodeType): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    type,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  const seq = counter.seq;
  return `${type}${seq.toString().padStart(3, '0')}`;
}
