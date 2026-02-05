"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { loginAction } from "@/actions/auth-actions";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, Eye, EyeOff, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
     const res = await loginAction(formData);
     if (res?.error) {
       toast.error(res.error);
     } else {
        toast.success("Welcome back!");
     }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#09090b] text-white overflow-hidden">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-[#09090b]">
        {/* Decorative Gradient Blob */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 translate-y-1/2"></div>
        
        {/* Logo */}
        <div className="flex items-center gap-2 text-xl font-semibold z-10">
            <Clock className="w-6 h-6 text-white" />
            <span>Tyotrack</span>
        </div>

        {/* Main Content */}
        <div className="space-y-8 z-10 max-w-lg">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                Work Time Management System
            </h1>
            <p className="text-zinc-400 text-lg">
                Track time effortlessly, manage projects efficiently, and streamline your workflow with our enterprise-grade solution.
            </p>

            <div className="space-y-4">
                <FeatureItem text="Smart cross-midnight time tracking" />
                <FeatureItem text="Real-time project analytics" />
                <FeatureItem text="Automated approval workflows" />
                <FeatureItem text="Enterprise-grade security" />
            </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-zinc-600 z-10">
            &copy; 2026 Tyotrack Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-24 bg-[#09090b] border-l border-white/5">
         <div className="w-full max-w-md mx-auto space-y-8">
            <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Welcome Back</h2>
                <p className="text-zinc-400">Please sign in to your account to continue.</p>
            </div>

            <form action={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                    <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="name@company.com" 
                        required 
                        className="bg-[#18181b] border-zinc-800 text-white placeholder:text-zinc-600 h-11 focus-visible:ring-indigo-500"
                    />
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-zinc-300">Password</Label>
                    </div>
                    <div className="relative">
                        <Input 
                            id="password" 
                            name="password" 
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            required 
                            className="bg-[#18181b] border-zinc-800 text-white placeholder:text-zinc-600 h-11 pr-10 focus-visible:ring-indigo-500"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    <div className="flex justify-end">
                         <Link href="#" className="text-sm font-medium text-indigo-500 hover:text-indigo-400">
                            Forgot password?
                        </Link>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox id="remember" className="border-zinc-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                    <Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-400">
                        Remember me for 30 days
                    </Label>
                </div>

                <SubmitButton />
            </form>

            <div className="text-center text-sm text-zinc-500">
                Don&apos;t have an account?{" "}
                <Link href="#" className="font-medium text-indigo-500 hover:text-indigo-400">
                    Contact your administrator
                </Link>
            </div>

            {/* Demo Credentials Box */}
            <div className="mt-8 p-4 rounded-lg bg-[#18181b]/50 border border-white/5 text-xs text-zinc-500 space-y-2">
                <p className="font-medium text-zinc-400 mb-2">Demo Credentials:</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="block text-zinc-600">Employee:</span>
                        <code className="text-zinc-300">employee@lion.com</code>
                    </div>
                    <div>
                        <span className="block text-zinc-600">Admin:</span>
                        <code className="text-zinc-300">admin@lion.com</code>
                    </div>
                    <div className="col-span-2">
                        <span className="text-zinc-600">Password: </span>
                        <code className="text-zinc-300">password</code>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 font-medium" disabled={pending}>
            {pending ? "Signing in..." : (
                <span className="flex items-center justify-center gap-2">
                    Sign In <ArrowRight className="w-4 h-4"/>
                </span>
            )}
        </Button>
    )
}

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
             <div className="rounded-full bg-green-500/10 p-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
             </div>
             <span className="text-zinc-300 font-medium text-sm">{text}</span>
        </div>
    )
}
