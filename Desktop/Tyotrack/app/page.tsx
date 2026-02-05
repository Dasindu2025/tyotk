import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ArrowRight, 
  ShieldCheck, 
  BarChart3, 
  Clock, 
  Building2, 
  Users, 
  CheckCircle2 
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
             <Clock className="w-6 h-6 text-primary" />
             <span>Tyotrack</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
               <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-24 sm:py-32 space-y-8 text-center md:text-left">
           <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                 <Badge variant="secondary" className="px-4 py-1.5 text-sm rounded-full">
                    Enterprise Edition Now Live
                 </Badge>
                 <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
                    Enterprise Time <br className="hidden lg:block"/> 
                    Tracking for <span className="text-primary">Modern Teams</span>
                 </h1>
                 <p className="text-xl text-muted-foreground max-w-[600px]">
                    Manage complex shifts, track project hours, and automate approvals with strict validation logic. Built for scale.
                 </p>
                 <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link href="/login">
                        <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8">
                            Start for Free
                        </Button>
                    </Link>
                    <Link href="#features">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-12 px-8">
                            View Features
                        </Button>
                    </Link>
                 </div>
                 <div className="pt-8 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-primary"/> No credit card required</div>
                    <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-primary"/> Instant setup</div>
                 </div>
              </div>
              <div className="relative rounded-xl border bg-muted/50 p-4 shadow-2xl lg:block hidden">
                  <div className="absolute -top-12 -left-12 w-72 h-72 bg-primary/20 rounded-full blur-3xl -z-10"></div>
                  {/* Mock UI Card */}
                  <Card className="w-full shadow-sm">
                      <CardHeader className="pb-4">
                          <CardTitle>Timesheet Approval</CardTitle>
                          <CardDescription>Pending entries requiring review</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="space-y-4">
                             {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-background/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">JD</div>
                                        <div>
                                            <p className="font-semibold text-sm">John Doe</p>
                                            <p className="text-xs text-muted-foreground">Website Redesign • 8h</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pending</Badge>
                                </div>
                             ))}
                          </div>
                      </CardContent>
                  </Card>
              </div>
           </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container py-24 bg-muted/40">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Enterprise-Grade Features</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to manage your workforce efficiently, from strict validation to detailed analytics.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<ShieldCheck className="w-10 h-10 text-primary" />}
                    title="Strict Validation"
                    description="Prevents overlapping entries, future dates, and unauthorized backdating automatically."
                />
                <FeatureCard 
                    icon={<Building2 className="w-10 h-10 text-primary" />}
                    title="Multi-Tenancy"
                    description="Complete data isolation for every company. Secure, scalable, and private by design."
                />
                 <FeatureCard 
                    icon={<Clock className="w-10 h-10 text-primary" />}
                    title="Split Shifts"
                    description="Automatically handles overnight shifts by splitting entries correctly across days."
                />
                 <FeatureCard 
                    icon={<BarChart3 className="w-10 h-10 text-primary" />}
                    title="Advanced Analytics"
                    description="Detailed breakdown of Day, Evening, and Night hours per project and employee."
                />
                 <FeatureCard 
                    icon={<Users className="w-10 h-10 text-primary" />}
                    title="Role-Based Access"
                    description="Granular permissions for Super Admins, Company Admins, and Employees."
                />
                 <FeatureCard 
                    icon={<CheckCircle2 className="w-10 h-10 text-primary" />}
                    title="Auto-Approvals"
                    description="Configure rules to automatically approve timesheets for trusted employees."
                />
            </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
          <div className="container flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground text-sm">
              <p>&copy; 2026 Tyotrack Inc. All rights reserved.</p>
              <div className="flex gap-6">
                  <Link href="#" className="hover:text-foreground">Privacy</Link>
                  <Link href="#" className="hover:text-foreground">Terms</Link>
                  <Link href="#" className="hover:text-foreground">Contact</Link>
              </div>
          </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <Card className="border-none shadow-sm bg-background">
            <CardHeader>
                <div className="mb-4">{icon}</div>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="text-base">{description}</CardDescription>
            </CardContent>
        </Card>
    )
}
