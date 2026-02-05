"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useTransition, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logTime } from "@/actions/time-entry";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface TimeEntryFormProps {
    projects: { id: string, name: string, code: string }[];
    workplaces: { id: string, name: string, code: string }[];
    defaultDate?: Date;
    onSuccess?: () => void;
}

const formSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  workplaceId: z.string().min(1, "Workplace is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time"),
  description: z.string().optional(),
});

export function TimeEntryForm({ projects, workplaces, defaultDate, onSuccess }: TimeEntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: defaultDate || new Date(),
      startTime: "09:00",
      endTime: "17:00",
      description: "",
      projectId: "",
      workplaceId: "",
    },
  });

  // Reset form when defaultDate changes (i.e. modal opens with new date)
  useEffect(() => {
      if (defaultDate) {
          form.setValue("date", defaultDate);
      }
  }, [defaultDate, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await logTime({
          ...values,
          date: values.date.toISOString(), // Send as ISO string
      });

      if (result.success) {
        toast.success("Time logged successfully");
        form.reset({
            date: new Date(),
            startTime: "09:00",
            endTime: "17:00",
            description: "",
            projectId: "", // Reset selectors
            workplaceId: "",
        });
        if (onSuccess) onSuccess(); // Close modal
      } else {
        toast.error(result.error || "Failed to log time");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border p-4 rounded-lg bg-card">
        <div className="grid grid-cols-2 gap-4">
             <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Project</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger className="text-black">
                        <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="workplaceId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Workplace</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger className="text-black">
                        <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {workplaces.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.code} - {w.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="grid grid-cols-3 gap-4">
             <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                    <Input 
                        type="date" 
                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                        onChange={(e) => field.onChange(e.target.valueAsDate)}
                        className="text-black"
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                    <Input type="time" {...field} className="text-black" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
                <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                    <Input type="time" {...field} className="text-black" />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Details..." {...field} className="text-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Log Time</Button>
      </form>
    </Form>
  );
}
