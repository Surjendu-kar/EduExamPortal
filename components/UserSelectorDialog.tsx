"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/animate-ui/components/radix/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserX } from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  deleted: boolean;
}

interface UserSelectorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUserIds: string[];
  onConfirm: (selectedUserIds: string[]) => void;
}

export const UserSelectorDialog = ({
  isOpen,
  onOpenChange,
  selectedUserIds,
  onConfirm,
}: UserSelectorDialogProps) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<User[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [tempSelectedIds, setTempSelectedIds] = React.useState<string[]>(selectedUserIds);

  // Fetch users when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setTempSelectedIds(selectedUserIds);
    }
  }, [isOpen, selectedUserIds]);

  // Filter users based on search query
  React.useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.first_name.toLowerCase().includes(query) ||
          user.last_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users?roles=teacher,admin");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      } else {
        console.error("Failed to fetch users");
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setTempSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleAll = () => {
    if (tempSelectedIds.length === filteredUsers.length) {
      setTempSelectedIds([]);
    } else {
      setTempSelectedIds(filteredUsers.map((user) => user.id));
    }
  };

  const handleConfirm = () => {
    onConfirm(tempSelectedIds);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedUserIds);
    setSearchQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Users</DialogTitle>
          <DialogDescription>
            Choose which users can access this template. You can search by name, email, or role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Select All Checkbox */}
          {!loading && filteredUsers.length > 0 && (
            <div className="flex items-center space-x-2 border-b pb-2">
              <Checkbox
                id="select-all"
                checked={tempSelectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                onCheckedChange={handleToggleAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All ({tempSelectedIds.length} of {filteredUsers.length})
              </label>
            </div>
          )}

          {/* User List */}
          <ScrollArea className="h-[300px] rounded-md border p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery.trim() === "" ? "No users found" : "No users match your search"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      user.deleted ? "opacity-60" : ""
                    }`}
                  >
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={tempSelectedIds.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                      disabled={user.deleted}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`user-${user.id}`}
                        className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <span>
                          {user.first_name} {user.last_name}
                        </span>
                        {user.deleted && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <UserX className="h-3 w-3" />
                            Deleted
                          </span>
                        )}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        Role: {user.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Count */}
          <div className="text-sm text-muted-foreground">
            {tempSelectedIds.length > 0 ? (
              <span className="font-medium text-primary">
                {tempSelectedIds.length} user{tempSelectedIds.length !== 1 ? "s" : ""} selected
              </span>
            ) : (
              <span>No users selected</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm}>Confirm Selection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
