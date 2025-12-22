"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";

interface EmailTemplateFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  filterVisibility: string;
  onFilterVisibilityChange: (value: string) => void;
  onCreateClick: () => void;
}

export const EmailTemplateFilters = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterVisibility,
  onFilterVisibilityChange,
  onCreateClick,
}: EmailTemplateFiltersProps) => {
  return (
    <Card className="p-0 bg-transparent border-none">
      <CardContent className="p-0">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={onFilterTypeChange}>
            <SelectTrigger className="w-[200px]" size="lg">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="student_invitation">Student Invitation</SelectItem>
              <SelectItem value="teacher_invitation">Teacher Invitation</SelectItem>
              <SelectItem value="exam_reminder">Exam Reminder</SelectItem>
              <SelectItem value="results_notification">Results Notification</SelectItem>
            </SelectContent>
          </Select>

          {/* Visibility Filter */}
          <Select value={filterVisibility} onValueChange={onFilterVisibilityChange}>
            <SelectTrigger className="w-[180px]" size="lg">
              <SelectValue placeholder="Filter by visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visibility</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>

          {/* Create Button */}
          <Button onClick={onCreateClick} className="whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
