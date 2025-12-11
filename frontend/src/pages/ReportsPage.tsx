import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import { mockTasks, mockPlots } from '../lib/mockData';
import { Download, Calendar, CheckCircle2, FileText, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('last-30-days');

  const completedTasks = mockTasks.filter((task) => {
    const taskDate = new Date(task.date);
    const today = new Date('2025-11-05');
    return taskDate < today;
  });

  const rescheduledTasks = mockTasks.filter((task) => task.proposedDate);

  const handleExportReport = (reportType: string) => {
    toast.success(`${reportType} report exported successfully`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] text-[#111827]">Reports & History</h2>
          <p className="text-[16px] text-[#374151]">View and export historical data and summaries</p>
        </div>

        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E5E7EB] bg-white text-[#111827] focus:border-[#15803D] focus:ring-[#15803D] focus:outline-none"
            aria-label="Select date range"
          >
            <option value="last-7-days">Last 7 Days</option>
            <option value="last-30-days">Last 30 Days</option>
            <option value="last-90-days">Last 90 Days</option>
            <option value="this-year">This Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#16A34A]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="text-[#16A34A]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[#6B7280]">Completed Tasks</p>
              <p className="text-2xl text-[#111827]">{completedTasks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#CA8A04]/10 rounded-xl flex items-center justify-center">
              <Calendar className="text-[#CA8A04]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[#6B7280]">Rescheduled</p>
              <p className="text-2xl text-[#111827]">{rescheduledTasks.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#2563EB]/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="text-[#2563EB]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[#6B7280]">Completion Rate</p>
              <p className="text-2xl text-[#111827]">96%</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#8B5CF6]/10 rounded-xl flex items-center justify-center">
              <FileText className="text-[#8B5CF6]" size={20} />
            </div>
            <div>
              <p className="text-sm text-[#6B7280]">Total Reports</p>
              <p className="text-2xl text-[#111827]">48</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-transparent">
          <TabsTrigger
            value="tasks"
            className="rounded-lg data-[state=active]:bg-[#B9EEC9] data-[state=active]:text-[#065F46] hover:bg-[#DFF7E8]"
          >
            Task History
          </TabsTrigger>

          <TabsTrigger
            value="harvest"
            className="rounded-lg data-[state=active]:bg-[#B9EEC9] data-[state=active]:text-[#065F46] hover:bg-[#DFF7E8]"
          >
            Harvest Summary
          </TabsTrigger>

          <TabsTrigger
            value="reschedule"
            className="rounded-lg data-[state=active]:bg-[#B9EEC9] data-[state=active]:text-[#065F46] hover:bg-[#DFF7E8]"
          >
            Reschedule Log
          </TabsTrigger>
        </TabsList>



        {/* Task History */}
        <TabsContent value="tasks" className="mt-6">
          <Card className="rounded-2xl bg-white overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-[#111827]">Task History</h3>
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => handleExportReport('Task History')}
              >
                <Download size={16} />
                Export
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <TableHead>Date</TableHead>
                  <TableHead>Plot</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTasks.slice(0, 10).map((task) => (
                  <TableRow key={task.id} className="hover:bg-[#F9FAFB]">
                    <TableCell>
                      {new Date(task.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{task.plotName}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.assignedWorker}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-[#DCFCE7] text-[#16A34A] text-xs rounded-lg">
                        Completed
                      </span>
                    </TableCell>
                    <TableCell className="text-[#6B7280]">Success</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Harvest Summary */}
        <TabsContent value="harvest" className="mt-6">
          <Card className="rounded-2xl bg-white overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-[#111827]">Harvest Summary</h3>
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => handleExportReport('Harvest Summary')}
              >
                <Download size={16} />
                Export
              </Button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-5 bg-[#F9FAFB] rounded-xl">
                  <p className="text-sm text-[#6B7280] mb-2">Plot B-2</p>
                  <h4 className="text-xl text-[#111827] mb-1">3,245 kg</h4>
                  <p className="text-xs text-[#6B7280]">Harvested: Oct 15, 2024</p>
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Grade A:</span>
                      <span className="text-[#111827]">82%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Grade B:</span>
                      <span className="text-[#111827]">15%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Grade C:</span>
                      <span className="text-[#111827]">3%</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-[#F9FAFB] rounded-xl">
                  <p className="text-sm text-[#6B7280] mb-2">Plot C-2</p>
                  <h4 className="text-xl text-[#111827] mb-1">2,987 kg</h4>
                  <p className="text-xs text-[#6B7280]">Harvested: Sep 22, 2024</p>
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Grade A:</span>
                      <span className="text-[#111827]">78%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Grade B:</span>
                      <span className="text-[#111827]">18%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Grade C:</span>
                      <span className="text-[#111827]">4%</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-[#15803D] to-[#16A34A] text-white rounded-xl">
                  <p className="text-sm opacity-90 mb-2">Total Yield (2024)</p>
                  <h4 className="text-xl mb-1">18,432 kg</h4>
                  <p className="text-xs opacity-75">Average yield per hectare: 6,144 kg</p>
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="flex justify-between text-sm">
                      <span className="opacity-90">Overall Grade A:</span>
                      <span>80%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-90">Revenue Impact:</span>
                      <span>+12%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Reschedule Log */}
        <TabsContent value="reschedule" className="mt-6">
          <Card className="rounded-2xl bg-white overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-[#111827]">Reschedule Log</h3>
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => handleExportReport('Reschedule Log')}
              >
                <Download size={16} />
                Export
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <TableHead>Plot</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Original Date</TableHead>
                  <TableHead>New Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rescheduledTasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-[#F9FAFB]">
                    <TableCell className="font-medium">{task.plotName}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>
                      {task.originalDate &&
                        new Date(task.originalDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                    </TableCell>
                    <TableCell className="text-[#15803D]">
                      {task.proposedDate &&
                        new Date(task.proposedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-[#6B7280] truncate">{task.reason}</p>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-[#FEF3C7] text-[#CA8A04] text-xs rounded-lg">
                        Pending Approval
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
