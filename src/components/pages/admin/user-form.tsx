"use client";


import { useTranslations } from 'next-intl';
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import { useToast } from "@/hooks/use-toast";
import { type NewUserData, roleLabels } from "./types";

interface UserFormProps {
  isAr: boolean;
  addUserOpen: boolean;
  setAddUserOpen: (open: boolean) => void;
  newUser: NewUserData;
  setNewUser: (user: NewUserData) => void;
  onSuccess: () => void;
}

export function UserForm({
  isAr,
  addUserOpen,
  setAddUserOpen,
  newUser,
  setNewUser,
  onSuccess,
}: UserFormProps) {
  const tAuto = useTranslations();
  const { toast } = useToast();

  const createUserMutation = useMutation({
    mutationFn: (data: NewUserData) =>
      fetch("/api/users", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        toast({
          title: tAuto('auto.error'),
          description: extractErrorMessage(data.error, tAuto('auto.anErrorOccurred')),
          variant: "destructive",
        });
        return;
      }
      onSuccess();
      setAddUserOpen(false);
      setNewUser({ name: "", email: "", role: "VIEWER", department: "", position: "", phone: "" });
    },
  });

  return (
    <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white gap-1.5 h-9 rounded-lg shadow-sm shadow-brand-navy-500/20">
          <UserPlus className="h-4 w-4" />
          {tAuto('auto.addUser')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{tAuto('auto.addNewUser')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{tAuto('auto.name')}</Label>
            <Input
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder={tAuto('auto.ahmedMohamed')}
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{tAuto('auto.email')}</Label>
            <Input
              type="email"
              dir="ltr"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="user@blueprint.ae"
              className="h-10 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{tAuto('auto.role')}</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) => setNewUser({ ...newUser, role: v })}
              >
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {isAr ? label.ar : label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{tAuto('auto.department')}</Label>
              <Input
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                placeholder={tAuto('auto.engineering')}
                className="h-10 rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{tAuto('auto.position')}</Label>
            <Input
              value={newUser.position}
              onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
              placeholder={tAuto('auto.seniorEngineer')}
              className="h-10 rounded-lg"
            />
          </div>
          <Button
            onClick={() => createUserMutation.mutate(newUser)}
            disabled={createUserMutation.isPending || !newUser.name || !newUser.email}
            className="w-full bg-brand-navy-600 hover:bg-brand-navy-700 text-white h-10 rounded-lg shadow-sm shadow-brand-navy-500/20"
          >
            {tAuto('auto.addUser')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
