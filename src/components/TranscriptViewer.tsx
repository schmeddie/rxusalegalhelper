"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { parseDiscordTranscript, type TranscriptMessage } from "@/lib/transcript";
import { getNotesForTranscript, saveNote, deleteNote } from "@/lib/db";
import type { CaseTranscript, MessageNote } from "@/lib/types";

interface TranscriptViewerProps {
  transcript: CaseTranscript;
  caseId: string;
}

export default function TranscriptViewer({ transcript, caseId }: TranscriptViewerProps) {
  const parsed = useMemo(() => parseDiscordTranscript(transcript.rawText), [transcript.rawText]);

  const [search, setSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [selectedMsgId, setSelectedMsgId] = useState<number | null>(null);
  const [notes, setNotes] = useState<MessageNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [showNotes, setShowNotes] = useState(true);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getNotesForTranscript(transcript.id).then(setNotes);
  }, [transcript.id]);

  const filtered = useMemo(() => {
    let msgs = parsed.messages;
    if (authorFilter) {
      msgs = msgs.filter((m) => m.author === authorFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      msgs = msgs.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.author.toLowerCase().includes(q)
      );
    }
    return msgs;
  }, [parsed.messages, search, authorFilter]);

  const notesMap = useMemo(() => {
    const map = new Map<number, MessageNote[]>();
    for (const note of notes) {
      const existing = map.get(note.messageId) || [];
      existing.push(note);
      map.set(note.messageId, existing);
    }
    return map;
  }, [notes]);

  async function handleAddNote(messageId: number) {
    if (!noteText.trim()) return;
    const note: MessageNote = {
      id: uuidv4(),
      caseId,
      transcriptId: transcript.id,
      messageId,
      text: noteText.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveNote(note);
    setNotes(await getNotesForTranscript(transcript.id));
    setNoteText("");
  }

  async function handleDeleteNote(noteId: string) {
    await deleteNote(noteId);
    setNotes(await getNotesForTranscript(transcript.id));
  }

  function selectMessage(msgId: number) {
    setSelectedMsgId((prev) => (prev === msgId ? null : msgId));
    setNoteText("");
    setTimeout(() => noteInputRef.current?.focus(), 100);
  }

  // Generate consistent colors for authors
  const authorColors = useMemo(() => {
    const palette = [
      "text-blue-400",
      "text-green-400",
      "text-purple-400",
      "text-amber-400",
      "text-pink-400",
      "text-cyan-400",
      "text-red-400",
      "text-emerald-400",
      "text-orange-400",
      "text-indigo-400",
    ];
    const map = new Map<string, string>();
    parsed.authors.forEach((a, i) => {
      map.set(a, palette[i % palette.length]);
    });
    return map;
  }, [parsed.authors]);

  return (
    <div className="flex gap-4 h-full">
      {/* Main transcript panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Transcript header info */}
        {parsed.meta.guild && (
          <div className="text-xs text-muted mb-3">
            {parsed.meta.guild} &middot; {parsed.meta.channel}
            {parsed.meta.topic && <> &middot; {parsed.meta.topic}</>}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All users</option>
            {parsed.authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
              showNotes
                ? "bg-primary/15 border-primary/50 text-primary-hover"
                : "border-border text-muted hover:text-foreground"
            }`}
            title="Toggle notes panel"
          >
            Notes ({notes.length})
          </button>
        </div>

        <p className="text-xs text-muted mb-3">
          {filtered.length} of {parsed.messages.length} messages
          {authorFilter && <> from {authorFilter}</>}
        </p>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-1 max-h-[60vh]">
          {filtered.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No messages match your filters.</p>
          ) : (
            filtered.map((msg) => {
              const isSelected = selectedMsgId === msg.id;
              const msgNotes = notesMap.get(msg.id);
              const hasNotes = msgNotes && msgNotes.length > 0;

              return (
                <div
                  key={msg.id}
                  onClick={() => selectMessage(msg.id)}
                  className={`px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : hasNotes
                        ? "bg-amber-500/5 border border-amber-500/20 hover:border-primary/30"
                        : "hover:bg-surface-hover border border-transparent"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted whitespace-nowrap">
                      {msg.timestamp}
                    </span>
                    <span className={`text-sm font-semibold ${authorColors.get(msg.author) || "text-foreground"}`}>
                      {msg.author}
                    </span>
                    {msg.isPinned && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1 py-0.5 rounded">
                        pinned
                      </span>
                    )}
                    {hasNotes && (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1 py-0.5 rounded">
                        {msgNotes!.length} note{msgNotes!.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notes sidebar */}
      {showNotes && (
        <div className="w-80 flex-shrink-0 bg-surface border border-border rounded-xl p-4 flex flex-col max-h-[70vh]">
          <h3 className="text-sm font-semibold text-foreground mb-3">Notes</h3>

          {selectedMsgId !== null ? (
            <>
              {/* Show which message is selected */}
              <div className="bg-background border border-border rounded-lg p-2 mb-3">
                <p className="text-xs text-muted">
                  Selected message from{" "}
                  <span className="text-foreground font-medium">
                    {parsed.messages.find((m) => m.id === selectedMsgId)?.author}
                  </span>
                </p>
                <p className="text-xs text-muted truncate mt-0.5">
                  {parsed.messages.find((m) => m.id === selectedMsgId)?.content.slice(0, 80)}...
                </p>
              </div>

              {/* Add note */}
              <div className="mb-3">
                <textarea
                  ref={noteInputRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note about this message..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleAddNote(selectedMsgId);
                    }
                  }}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-muted">Ctrl+Enter to save</span>
                  <button
                    onClick={() => handleAddNote(selectedMsgId)}
                    disabled={!noteText.trim()}
                    className="text-xs bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-3 py-1 rounded-md transition-colors"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Notes for selected message */}
              {notesMap.get(selectedMsgId)?.map((note) => (
                <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
              ))}
            </>
          ) : (
            <p className="text-xs text-muted mb-3">Click a message to add notes.</p>
          )}

          {/* All notes list */}
          <div className="border-t border-border pt-3 mt-auto overflow-y-auto flex-1">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              All Notes ({notes.length})
            </h4>
            {notes.length === 0 ? (
              <p className="text-xs text-muted">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => {
                  const msg = parsed.messages.find((m) => m.id === note.messageId);
                  return (
                    <div
                      key={note.id}
                      className="bg-background border border-border rounded-lg p-2 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMsgId(note.messageId);
                      }}
                    >
                      <p className="text-xs text-muted">
                        Re: <span className="font-medium text-foreground">{msg?.author}</span>
                        {" "}<span className="text-muted">{msg?.timestamp}</span>
                      </p>
                      <p className="text-sm text-foreground mt-1">{note.text}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-muted">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="text-[10px] text-danger hover:text-danger-hover transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onDelete }: { note: MessageNote; onDelete: (id: string) => void }) {
  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 mb-2">
      <p className="text-sm text-foreground">{note.text}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-[10px] text-muted">
          {new Date(note.createdAt).toLocaleDateString()}
        </span>
        <button
          onClick={() => onDelete(note.id)}
          className="text-[10px] text-danger hover:text-danger-hover transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Strip {Embed} blocks for cleaner display, but keep the URL if present
  const lines = content.split("\n");
  const cleanedLines: string[] = [];
  let inEmbed = false;

  for (const line of lines) {
    if (line.trim() === "{Embed}") {
      inEmbed = true;
      continue;
    }
    if (inEmbed) {
      // Skip embed metadata lines but keep the embed block short
      if (line.trim() === "") {
        inEmbed = false;
        continue;
      }
      // If it's a URL, show it
      if (line.trim().startsWith("http")) {
        cleanedLines.push(line);
        continue;
      }
      // Keep title lines from embeds
      if (!line.trim().startsWith("http") && line.trim().length > 0 && !line.includes("discordapp.net")) {
        cleanedLines.push(line);
      }
      continue;
    }
    cleanedLines.push(line);
  }

  const cleaned = cleanedLines.join("\n").trim();

  // Render bold (**text**) and basic formatting
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
