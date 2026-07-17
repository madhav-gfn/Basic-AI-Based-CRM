import { prisma } from "../config/database";
import { Channel, MessageTemplate, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TemplateService
// Reusable, channel-aware campaign copy. Bodies may contain {name}, {city},
// {email} tokens that ExecutionService renders per-customer at dispatch time.
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateInput {
  name: string;
  channel: string;
  body: string;
  description?: string | null;
}

function toChannelEnum(raw: string): Channel {
  const key = raw?.toUpperCase();
  if (!key || !(key in Channel)) {
    throw new Error(
      `Invalid channel: "${raw}". Allowed: ${Object.keys(Channel).join(", ")}.`
    );
  }
  return Channel[key as keyof typeof Channel];
}

/** Extracts the distinct {token} placeholders referenced in a body. */
export function extractTokens(body: string): string[] {
  const tokens = new Set<string>();
  for (const match of body.matchAll(/\{\s*(\w+)\s*\}/g)) {
    tokens.add(match[1].toLowerCase());
  }
  return Array.from(tokens);
}

export class TemplateService {
  async list(channel?: string, organizationId?: string): Promise<MessageTemplate[]> {
    const where: Prisma.MessageTemplateWhereInput = {
      ...(channel && { channel: toChannelEnum(channel) }),
      ...(organizationId && { organizationId }),
    };
    return prisma.messageTemplate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getById(id: string): Promise<MessageTemplate> {
    const template = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new Error(`Template not found: "${id}".`);
    return template;
  }

  async create(input: TemplateInput, createdBy: string, organizationId?: string): Promise<MessageTemplate> {
    if (!input.name?.trim()) throw new Error("Template name is required.");
    if (!input.body?.trim()) throw new Error("Template body is required.");

    return prisma.messageTemplate.create({
      data: {
        name: input.name.trim(),
        channel: toChannelEnum(input.channel),
        body: input.body,
        description: input.description ?? null,
        createdBy,
        ...(organizationId && { organizationId }),
      },
    });
  }

  async update(id: string, input: Partial<TemplateInput>): Promise<MessageTemplate> {
    await this.getById(id); // 404 guard

    return prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.channel !== undefined && { channel: toChannelEnum(input.channel) }),
        ...(input.body !== undefined && { body: input.body }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.getById(id); // 404 guard
    await prisma.messageTemplate.delete({ where: { id } });
  }
}

export const templateService = new TemplateService();
