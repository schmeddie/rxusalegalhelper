export interface TranscriptMessage {
  id: number;
  timestamp: string;
  author: string;
  content: string;
  isPinned: boolean;
  hasEmbed: boolean;
}

export interface TranscriptMeta {
  guild: string;
  channel: string;
  topic: string;
}

export interface Transcript {
  meta: TranscriptMeta;
  messages: TranscriptMessage[];
  authors: string[];
}

export interface MessageNote {
  messageId: number;
  text: string;
  createdAt: string;
}

export function parseDiscordTranscript(text: string): Transcript {
  const lines = text.split("\n");

  // Parse header
  const meta: TranscriptMeta = { guild: "", channel: "", topic: "" };
  for (const line of lines.slice(0, 10)) {
    const guildMatch = line.match(/^Guild:\s*(.+)/);
    if (guildMatch) meta.guild = guildMatch[1].trim();

    const channelMatch = line.match(/^Channel:\s*(.+)/);
    if (channelMatch) meta.channel = channelMatch[1].trim();

    const topicMatch = line.match(/^Topic:\s*(.+)/);
    if (topicMatch) meta.topic = topicMatch[1].trim();
  }

  // Parse messages: format is [DD/MM/YYYY HH:MM] username (optional flags)
  const messagePattern = /^\[(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})\]\s+(\S+?)(?:\s+\(([^)]+)\))?\s*$/;
  const messages: TranscriptMessage[] = [];
  let currentMsg: { timestamp: string; author: string; isPinned: boolean; contentLines: string[] } | null = null;
  let msgId = 0;

  // Skip header lines (up to the second === line)
  let headerEnd = 0;
  let separatorCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("===")) {
      separatorCount++;
      if (separatorCount >= 2) {
        headerEnd = i + 1;
        break;
      }
    }
  }

  for (let i = headerEnd; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(messagePattern);

    if (match) {
      // Save previous message
      if (currentMsg) {
        const content = currentMsg.contentLines.join("\n").trim();
        if (content) {
          messages.push({
            id: msgId++,
            timestamp: currentMsg.timestamp,
            author: currentMsg.author,
            content,
            isPinned: currentMsg.isPinned,
            hasEmbed: content.includes("{Embed}"),
          });
        }
      }

      const flags = match[3] || "";
      currentMsg = {
        timestamp: match[1],
        author: match[2],
        isPinned: flags.includes("pinned"),
        contentLines: [],
      };
    } else if (currentMsg) {
      currentMsg.contentLines.push(line);
    }
  }

  // Don't forget the last message
  if (currentMsg) {
    const content = currentMsg.contentLines.join("\n").trim();
    if (content) {
      messages.push({
        id: msgId++,
        timestamp: currentMsg.timestamp,
        author: currentMsg.author,
        content,
        isPinned: currentMsg.isPinned,
        hasEmbed: content.includes("{Embed}"),
      });
    }
  }

  const authors = [...new Set(messages.map((m) => m.author))].sort();

  return { meta, messages, authors };
}
