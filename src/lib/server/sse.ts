/**
 * Minimal, spec-compliant Server-Sent Events parser.
 * Feed it raw text chunks (which may split events anywhere) and it
 * returns complete events as they become available.
 */
export interface SSEEvent {
  event: string;
  data: string;
}

export class SSEParser {
  private buffer = "";

  push(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    // Normalise line endings so we only have to handle "\n".
    this.buffer = this.buffer.replace(/\r\n?/g, "\n");

    const events: SSEEvent[] = [];
    let boundary: number;
    while ((boundary = this.buffer.indexOf("\n\n")) !== -1) {
      const raw = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const parsed = parseBlock(raw);
      if (parsed) events.push(parsed);
    }
    return events;
  }

  /** Flush any final event that wasn't followed by a blank line. */
  flush(): SSEEvent[] {
    const rest = this.buffer.trim();
    this.buffer = "";
    if (!rest) return [];
    const parsed = parseBlock(rest);
    return parsed ? [parsed] : [];
  }
}

function parseBlock(block: string): SSEEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue; // comment / keep-alive
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  if (data.length === 0) return null;
  return { event, data: data.join("\n") };
}
