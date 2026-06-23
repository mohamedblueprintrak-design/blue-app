"use client";


import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { MessageSquare, Send, Loader2, AtSign, Trash2 } from "lucide-react";

// ===== Types =====
interface CommentUser {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
}

interface UserOption {
  id: string;
  name: string;
  EMAIL: string;
  avatar: string;
}

// ===== Avatar Helpers =====
const avatarColors = [
  "bg-teal-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-cyan-500",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitial(name: string) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

// ===== Relative Time =====
function formatTimeAgo(dateStr: string, isAr: boolean) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return isAr ? "الآن" : "Just now";
  if (diffMin < 60) {
    if (isAr) return diffMin === 1 ? "منذ دقيقة" : `منذ ${diffMin} دقائق`;
    return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
  }
  if (diffHours < 24) {
    if (isAr) return diffHours === 1 ? "منذ ساعة" : `منذ ${diffHours} ساعة`;
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffDays === 1) return isAr ? "أمس" : "yesterday";
  if (diffDays < 7) {
    if (isAr) return diffDays === 2 ? "منذ يومين" : `منذ ${diffDays} أيام`;
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString(isAr ? "ar-AE" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

// ===== Mention Highlight =====
function highlightMentions(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="text-teal-600 dark:text-teal-400 font-medium">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

// ===== Single Comment Component =====
function CommentItem({
  comment,
  isAr,
  canDelete,
  onDelete,
  isDeleting,
}: {
  comment: Comment;
  isAr: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const tAuto = useTranslations();
  const avatarColor = getAvatarColor(comment.user.name || comment.user.id);

  return (
    <div
      className={cn(
        "flex gap-2.5 animate-fade-in group/comment",
        isDeleting && "opacity-50"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={comment.user.avatar} />
        <AvatarFallback
          className={cn(
            "text-[10px] text-white font-bold",
            avatarColor
          )}
        >
          {getInitial(comment.user.name)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {comment.user.name || (tAuto('auto.user'))}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {formatTimeAgo(comment.createdAt, isAr)}
          </span>
          {/* Delete button */}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(comment.id);
              }}
              className="opacity-0 group-hover/comment:opacity-100 transition-opacity ms-auto p-0.5 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 rounded"
            >
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Trash2 className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {tAuto('auto.deleteComment')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
          {highlightMentions(comment.content)}
        </p>
      </div>
    </div>
  );
}

// ===== Main Component =====
interface TaskCommentsProps {
  taskId: string;
  language: "ar" | "en";
}

export default function TaskComments({ taskId, language }: TaskCommentsProps) {
  const tAuto = useTranslations();
  const isAr = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar: isAr });
  const [newComment, setNewComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch comments
  const { data, isLoading } = useQuery<{ comments: Comment[] }>({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  const comments = data?.comments || [];

  // Fetch current user for delete permission
  const { data: currentUser } = useQuery<{ id: string; role: string } | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return null;
      const session = await res.json();
      return session?.user ? { id: session.user.id, role: session.user.role || "" } : null;
    },
    staleTime: 300000,
  });

  // Fetch users for mentions
  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create comment mutation
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setNewComment("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      toast.showSuccess(
        tAuto('auto.commentAdded')
      );
    },
    onError: () => {
      toast.error(tAuto('auto.addComment'));
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
        headers: getMutationHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      return res.json();
    },
    onMutate: (commentId) => {
      setDeletingId(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeletingId(null);
      toast.showSuccess(
        tAuto('auto.commentDeleted')
      );
    },
    onError: () => {
      setDeletingId(null);
      toast.error(tAuto('auto.deleteComment'));
    },
  });

  // Auto-resize textarea
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setNewComment(value);

      // Auto-resize
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";

      // Detect @mention trigger
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@(\S*)$/);

      if (atMatch) {
        setShowMentionDropdown(true);
        setMentionFilter(atMatch[1].toLowerCase());
        setMentionStartIndex(cursorPos - atMatch[0].length);
      } else {
        setShowMentionDropdown(false);
        setMentionFilter("");
      }
    },
    []
  );

  // Insert mention
  const insertMention = useCallback(
    (userName: string) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionStartIndex < 0) return;

      const mentionText = `@${userName.replace(/\s+/g, ".")} `;
      const before = newComment.slice(0, mentionStartIndex);
      const after = newComment.slice(textarea.selectionStart);

      const newValue = before + mentionText + after;
      setNewComment(newValue);
      setShowMentionDropdown(false);

      // Restore focus and cursor position
      requestAnimationFrame(() => {
        if (textarea) {
          const newPos = before.length + mentionText.length;
          textarea.focus();
          textarea.setSelectionRange(newPos, newPos);
          textarea.style.height = "auto";
          textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
        }
      });
    },
    [newComment, mentionStartIndex]
  );

  // Filter users for mention dropdown
  const filteredUsers = mentionFilter
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(mentionFilter) ||
          u.name.toLowerCase().replace(/\s+/g, ".").includes(mentionFilter)
      )
    : users;

  // Submit comment
  const handleSubmit = () => {
    if (!newComment.trim() || createMutation.isPending) return;
    createMutation.mutate(newComment);
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setShowMentionDropdown(false);
    }
  };

  // Check if user can delete a comment
  const canDeleteComment = useCallback(
    (comment: Comment) => {
      if (!currentUser) return false;
      // Author can delete their own comments
      if (comment.user.id === currentUser.id) return true;
      // Admin can delete any comment
      if (currentUser.role === "ADMIN" || currentUser.role === "admin") return true;
      return false;
    },
    [currentUser]
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentionDropdown(false);
      }
    }
    if (showMentionDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMentionDropdown]);

  return (
    <div className="flex flex-col h-full">
      {/* Comments List */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <MessageSquare className="h-7 w-7 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
            {tAuto('auto.noCommentsYet')}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {tAuto('auto.addTheFirstCommentOnThisTask')}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 max-h-80">
          <div className="space-y-3 p-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isAr={isAr}
                canDelete={canDeleteComment(comment)}
                onDelete={(id) => deleteMutation.mutate(id)}
                isDeleting={deletingId === comment.id}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Separator */}
      {comments.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700/50 my-2" />
      )}

      {/* New Comment Input */}
      <div className="relative">
        <div className="flex gap-2 items-end">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                tAuto('auto.writeACommentToMention')
              }
              className="text-xs resize-none min-h-[36px] max-h-[120px] py-2 px-3 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              rows={1}
            />
            {/* @ indicator */}
            {newComment.length === 0 && (
              <div className="absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <AtSign className="h-3 w-3 text-slate-300 dark:text-slate-600" />
              </div>
            )}

            {/* Mention Dropdown */}
            {showMentionDropdown && filteredUsers.length > 0 && (
              <div
                ref={dropdownRef}
                className={cn(
                  "absolute bottom-full mb-1 start-0 w-56 rounded-lg border border-slate-200 dark:border-slate-700",
                  "bg-white dark:bg-slate-800 shadow-lg z-50 max-h-48 overflow-y-auto",
                  "animate-fade-in"
                )}
              >
                <div className="p-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 px-1.5 pb-1">
                    {tAuto('auto.teamMembers')}
                  </p>
                  {filteredUsers.slice(0, 8).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user.name)}
                      className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-start"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback
                          className={cn(
                            "text-[8px] text-white font-bold",
                            getAvatarColor(user.name)
                          )}
                        >
                          {getInitial(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ms-auto">
                        @{user.name.replace(/\s+/g, ".")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            size="sm"
            disabled={!newComment.trim() || createMutation.isPending}
            onClick={handleSubmit}
            className={cn(
              "h-[36px] w-[36px] p-0 rounded-lg shrink-0",
              "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700",
              "text-white shadow-sm shadow-teal-500/20",
              "disabled:opacity-40 disabled:shadow-none transition-all"
            )}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Hint */}
        {newComment.length > 0 && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            {isAr
              ? "Ctrl+Enter للإرسال"
              : "Ctrl+Enter to send"}
          </p>
        )}
      </div>
    </div>
  );
}
