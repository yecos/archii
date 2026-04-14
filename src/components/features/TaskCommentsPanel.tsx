'use client';

import React, { useMemo } from 'react';
import { useComments } from '@/hooks/useDomain';
import { getInitials, avatarColor, fmtDateTime } from '@/lib/helpers';
import { MessageSquare, Reply, X, Send, CornerDownRight } from 'lucide-react';
import type { Comment } from '@/lib/types';

interface TaskCommentsPanelProps {
  taskId: string;
  projectId: string;
}

export default function TaskCommentsPanel({ taskId, projectId }: TaskCommentsPanelProps) {
  const {
    comments,
    commentText,
    setCommentText,
    replyingTo,
    setReplyingTo,
    postComment,
  } = useComments();

  // Filter comments for this task
  const taskComments = useMemo(() => {
    return comments.filter((c: Comment) => c.data.taskId === taskId);
  }, [comments, taskId]);

  // Separate top-level comments from replies
  const topLevelComments = useMemo(() => {
    return taskComments.filter((c: Comment) => !c.data.parentId);
  }, [taskComments]);

  const getReplies = (parentId: string): Comment[] => {
    return taskComments.filter((c: Comment) => c.data.parentId === parentId);
  };

  // Find the parent comment name when replying
  const replyingToComment = replyingTo
    ? taskComments.find((c: Comment) => c.id === replyingTo)
    : null;

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    postComment(taskId, projectId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with count */}
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-[var(--af-accent)]" />
        <span className="text-xs font-semibold text-[var(--foreground)]">
          Comentarios
        </span>
        {taskComments.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--af-bg4)] text-[var(--muted-foreground)] font-medium">
            {taskComments.length}
          </span>
        )}
      </div>

      {/* Comment list */}
      <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
        {topLevelComments.length === 0 && (
          <div className="text-center py-6 text-[var(--af-text3)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--af-bg3)] flex items-center justify-center mx-auto mb-2">
              <MessageSquare size={18} className="text-[var(--af-text3)]" />
            </div>
            <div className="text-[12px]">Sin comentarios</div>
            <div className="text-[11px] mt-0.5">Agrega el primer comentario</div>
          </div>
        )}

        {topLevelComments.map((comment: Comment) => {
          const replies = getReplies(comment.id);
          return (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={() => {
                  setReplyingTo(comment.id);
                  setCommentText('');
                }}
              />
              {/* Replies */}
              {replies.length > 0 && (
                <div className="ml-6 mt-1.5 space-y-1.5 border-l-2 border-[var(--af-bg4)] pl-3">
                  {replies.map((reply: Comment) => (
                    <CommentItem key={reply.id} comment={reply} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply indicator */}
      {replyingTo && replyingToComment && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--af-accent)]/5 border border-[var(--af-accent)]/20 rounded-lg">
          <CornerDownRight size={12} className="text-[var(--af-accent)] flex-shrink-0" />
          <span className="text-[11px] text-[var(--af-accent)] flex-1 truncate">
            Respondiendo a {replyingToComment.data.userName}
          </span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-[var(--af-text3)] hover:text-[var(--foreground)] cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo ? `Responder a ${replyingToComment?.data.userName || '...'}` : 'Escribe un comentario...'}
          className="flex-1 text-[12px] bg-[var(--af-bg3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]/50 placeholder:text-[var(--af-text3)]"
        />
        <button
          type="button"
          onClick={handleSubmitComment}
          disabled={!commentText.trim()}
          className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none transition-colors flex-shrink-0 ${
            commentText.trim()
              ? 'bg-[var(--af-accent)] text-background hover:bg-[var(--af-accent2)]'
              : 'bg-[var(--af-bg3)] text-[var(--af-text3)] cursor-not-allowed'
          }`}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* ===== Individual comment row ===== */

function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply?: () => void;
}) {
  const d = comment.data;

  return (
    <div className="group/cmt">
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <span
          className={`w-6 h-6 text-[9px] rounded-full font-semibold flex items-center justify-center flex-shrink-0 ${avatarColor(d.userId)}`}
          title={d.userName}
        >
          {getInitials(d.userName)}
        </span>

        <div className="flex-1 min-w-0">
          {/* Author + timestamp */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--foreground)]">
              {d.userName}
            </span>
            <span className="text-[10px] text-[var(--af-text3)]">
              {fmtDateTime(d.createdAt)}
            </span>
          </div>

          {/* Text */}
          <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
            {d.text}
          </p>

          {/* Reply action */}
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="mt-1 flex items-center gap-1 text-[10px] text-[var(--af-text3)] hover:text-[var(--af-accent)] cursor-pointer bg-transparent border-none p-0 opacity-0 group-hover/cmt:opacity-100 transition-opacity"
            >
              <Reply size={10} />
              Responder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
