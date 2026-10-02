"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";
import type { Conversation } from "@/types/chat";
import { Dialog } from "../ui/Dialog";
import { MailIcon, PhoneIcon } from "../ui/Icons";
import { useToast } from "../ui/Toast";

const INTERESTS = ["Buying", "Selling", "Renting", "Investing", "Property valuation", "Other"];

/** "Talk to an agent" inquiry form — posts to /api/lead, which forwards to your webhook. */
export function LeadDialog({
  open,
  onClose,
  conversation,
}: {
  open: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { contact } = siteConfig;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      interest: String(form.get("interest") ?? ""),
      message: String(form.get("message") ?? ""),
      // Give the agent context: what the visitor asked Xpert AI.
      conversationSummary: (conversation?.messages ?? [])
        .filter((m) => m.role === "user")
        .slice(-5)
        .map((m) => `- ${m.content.slice(0, 400)}`)
        .join("\n"),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "We couldn't send your inquiry. Please try again.");
        return;
      }
      toast("Inquiry sent — an agent will contact you soon");
      onClose();
    } catch {
      setError("Couldn't send your inquiry. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title="Talk to an agent"
      description={`Leave your details and someone from ${siteConfig.companyName} will get back to you.`}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="lead-name" className="mb-1 block text-sm font-medium">Name</label>
          <input id="lead-name" name="name" required maxLength={100} autoComplete="name" className="field" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium">Phone / WhatsApp</label>
            <input id="lead-phone" name="phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" placeholder="+92 3xx xxxxxxx" className="field" />
          </div>
          <div>
            <label htmlFor="lead-email" className="mb-1 block text-sm font-medium">
              Email <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="lead-email" name="email" type="email" maxLength={200} autoComplete="email" className="field" />
          </div>
        </div>
        <div>
          <label htmlFor="lead-interest" className="mb-1 block text-sm font-medium">I&apos;m interested in</label>
          <select id="lead-interest" name="interest" className="field" defaultValue="Buying">
            {INTERESTS.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lead-message" className="mb-1 block text-sm font-medium">
            Details <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id="lead-message" name="message" rows={3} maxLength={2000} placeholder="Area, budget, size, timeline…" className="field resize-none" />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Sending…" : "Send inquiry"}
        </button>

        {(contact.phone || contact.whatsapp || contact.email) && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1 text-sm text-muted">
            {contact.whatsapp && (
              <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                WhatsApp us
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <PhoneIcon size={14} /> Call
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 hover:text-ink">
                <MailIcon size={14} /> Email
              </a>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
}
