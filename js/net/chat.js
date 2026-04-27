// Chat UI — pulled out of multi.js so the network module isn't doing
// DOM work. Only the chat overlay touches these helpers.

import { ui } from "../state.js";
import { session } from "./session.js";

export function appendChat(name, text, isMe) {
  if (!ui.chatLog) return;
  const row = document.createElement("div");
  row.className = "chat-line" + (isMe ? " me" : (name === "system" ? " system" : ""));
  if (name === "system") {
    row.innerHTML = `<em>${escapeHtml(text)}</em>`;
  } else {
    row.innerHTML = `<strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}`;
  }
  ui.chatLog.appendChild(row);
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
  if (ui.chatBox && session.connected) ui.chatBox.classList.remove("hidden");
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}
