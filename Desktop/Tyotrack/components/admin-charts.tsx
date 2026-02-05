"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell, PieChart, Pie, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Data passed via props

interface AdminChartsProps {
  weeklyData: { name: string; hours: number }[];
  projectData: { name: string; value: number; color: string }[];
}

export function AdminCharts({ weeklyData, projectData }: AdminChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Weekly Hours Trend - Bar Chart */}
      <Card className="col-span-2 bg-[#111827] border-white/5 text-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-zinc-400">Weekly Hours Trend</CardTitle>
          <select className="bg-[#1F2937] border-none text-xs text-zinc-400 rounded outline-none p-1">
              <option>Last 12 Weeks</option>
          </select>
        </CardHeader>
        <CardContent className="pl-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <XAxis
                dataKey="name"
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="hours" fill="#1D4ED8" radius={[2, 2, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hours by Project - Donut Chart */}
      <Card className="col-span-1 bg-[#111827] border-white/5 text-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-400">Hours by Project</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="h-[200px] w-full flex items-center justify-center relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={projectData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {projectData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                         <Tooltip />  
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-3xl font-bold">1.2k</span>
                     <span className="text-xs text-zinc-500">Total Hours</span>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
                {projectData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="text-zinc-400">{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}%</span>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
