import React from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import { mockTasks } from '../lib/mockData';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function RescheduleCenterPage() {
  const rescheduleTasks = mockTasks.filter((task) => task.proposedDate);

  const handleApprove = (taskId: string) => {
    toast.success('Reschedule approved and applied');
  };

  const handleReject = (taskId: string) => {
    toast.error('Reschedule rejected - original date maintained');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[20px] text-[#111827]">Reschedule Center</h2>
          <p className="text-[16px] text-[#374151]">Review and approve AI-generated reschedule proposals</p>
        </div>
        <Card className="p-4 rounded-2xl bg-gradient-to-br from-[#CA8A04] to-[#D97706] text-white shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} />
            <div>
              <p className="text-[14px] opacity-90">Pending Approvals</p>
              <p className="text-[20px]">{rescheduleTasks.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#DC2626]/10 rounded-xl flex items-center justify-center">
              <XCircle className="text-[#DC2626]" size={20} />
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Stop Status</p>
              <p className="text-[20px] text-[#111827]">
                {rescheduleTasks.filter((t) => t.status === 'Stop').length}
              </p>
            </div>
          </div>
          <p className="text-[14px] text-[#6B7280]">Tasks halted due to critical conditions</p>
        </Card>

        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#CA8A04]/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-[#CA8A04]" size={20} />
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Pending Status</p>
              <p className="text-[20px] text-[#111827]">
                {rescheduleTasks.filter((t) => t.status === 'Pending').length}
              </p>
            </div>
          </div>
          <p className="text-[14px] text-[#6B7280]">Tasks delayed for optimal conditions</p>
        </Card>

        <Card className="p-5 rounded-2xl bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#2563EB]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="text-[#2563EB]" size={20} />
            </div>
            <div>
              <p className="text-[14px] text-[#6B7280]">Avg Delay</p>
              <p className="text-[20px] text-[#111827]">3.2 days</p>
            </div>
          </div>
          <p className="text-[14px] text-[#6B7280]">Average rescheduling period</p>
        </Card>
      </div>

      {/* Reschedule Table */}
      <Card className="rounded-2xl bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#E5E7EB]">
          <h3 className="text-[18px] text-[#111827]">Pending Reschedule Approvals</h3>
        </div>

        {rescheduleTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <TableHead className="pl-8 text-[14px]">Plot</TableHead>
                  <TableHead className="text-[14px]">Task</TableHead>
                  <TableHead className="text-[14px]">Original Date</TableHead>
                  <TableHead className="text-[14px]">Proposed Date</TableHead>
                  <TableHead className="text-[14px]">Status</TableHead>
                  <TableHead className="text-[14px]">Reason</TableHead>
                  <TableHead className="text-right pr-8 text-[14px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rescheduleTasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    className="hover:bg-[#F0FDF4] transition-colors border-b border-[#E5E7EB]"
                  >
                    <TableCell className="pl-8 font-medium text-[14px]">{task.plotName}</TableCell>
                    <TableCell className="text-[14px]">{task.title}</TableCell>
                    <TableCell className="text-[14px]">
                      {task.originalDate &&
                        new Date(task.originalDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                    </TableCell>
                    <TableCell className="font-medium text-[#15803D] text-[14px]">
                      {task.proposedDate &&
                        new Date(task.proposedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      <p className="text-[14px] text-[#6B7280] max-w-xs">{task.reason}</p>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-[#16A34A] hover:bg-[#15803D] rounded-xl gap-1 text-[14px]"
                          onClick={() => handleApprove(task.id)}
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl gap-1 text-[#DC2626] border-[#DC2626] hover:bg-red-50 hover:text-[#991B1B] transition-colors text-[14px]"
                          onClick={() => handleReject(task.id)}
                        >
                          <XCircle size={16} />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <CheckCircle2 size={48} className="mx-auto text-[#16A34A] mb-4" />
            <h4 className="text-[18px] text-[#111827] mb-2">All Clear!</h4>
            <p className="text-[14px] text-[#6B7280]">No reschedule proposals pending approval</p>
          </div>
        )}
      </Card>

      {/* AI Insights */}
      <Card className="p-6 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white shadow-sm">
        <h3 className="text-[18px] mb-4">AI Reschedule Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-[14px] opacity-90 mb-1">Most Common Reason</p>
            <p className="text-[16px]">Heavy rainfall forecasted</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-[14px] opacity-90 mb-1">Weather-related Delays</p>
            <p className="text-[16px]">68% of reschedules</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-[14px] opacity-90 mb-1">Soil Condition Delays</p>
            <p className="text-[16px]">25% of reschedules</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-[14px] opacity-90 mb-1">Approval Rate</p>
            <p className="text-[16px]">94% accepted</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
