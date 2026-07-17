import { prisma } from "../config/database";
import {
  Journey,
  JourneyStep,
  JourneyEnrollment,
  JourneyStatus,
  JourneyTriggerType,
  EnrollmentStatus,
  CommunicationStatus,
  ConsentStatus,
  Channel,
  Prisma,
} from "@prisma/client";
import { segmentService } from "./segment.service";
import { renderMessage, chunkArray, dispatchChunk } from "./dispatch.util";

// ─────────────────────────────────────────────────────────────────────────────
// JourneyService
//
// Trigger-based automation: a Journey enrolls customers automatically when a
// condition is met (signup, order, or entering a segment), then walks them
// through an ordered sequence of timed sends. Built on the same Communication
// tracking table and dispatch pipeline as Campaigns — see dispatch.util.ts —
// so journey sends get the same webhook-driven delivery/engagement tracking
// and show up in the customer activity timeline for free.
//
// Two independent scans drive the engine (see journey.cron.ts):
//   1. runEnrollmentScan  — finds newly-qualifying customers, enrolls them
//   2. runStepDispatch    — sends any step whose nextStepDueAt has arrived
// ─────────────────────────────────────────────────────────────────────────────

export interface StepInput {
  delayHours: number;
  channel: string;
  message: string;
}

export interface CreateJourneyInput {
  name: string;
  triggerType: string;
  triggerSegmentId?: string | null;
  steps: StepInput[];
}

function toChannelEnum(raw: string): Channel {
  const key = raw?.toUpperCase();
  if (!key || !(key in Channel)) {
    throw new Error(`Invalid channel: "${raw}". Allowed: ${Object.keys(Channel).join(", ")}.`);
  }
  return Channel[key as keyof typeof Channel];
}

function toTriggerTypeEnum(raw: string): JourneyTriggerType {
  const key = raw?.toUpperCase();
  if (!key || !(key in JourneyTriggerType)) {
    throw new Error(
      `Invalid triggerType: "${raw}". Allowed: ${Object.keys(JourneyTriggerType).join(", ")}.`
    );
  }
  return JourneyTriggerType[key as keyof typeof JourneyTriggerType];
}

function toStatusEnum(raw: string): JourneyStatus {
  const key = raw?.toUpperCase();
  if (!key || !(key in JourneyStatus)) {
    throw new Error(`Invalid status: "${raw}". Allowed: ${Object.keys(JourneyStatus).join(", ")}.`);
  }
  return JourneyStatus[key as keyof typeof JourneyStatus];
}

const ALLOWED_TRANSITIONS: Record<JourneyStatus, JourneyStatus[]> = {
  DRAFT: [JourneyStatus.ACTIVE, JourneyStatus.ARCHIVED],
  ACTIVE: [JourneyStatus.PAUSED, JourneyStatus.ARCHIVED],
  PAUSED: [JourneyStatus.ACTIVE, JourneyStatus.ARCHIVED],
  ARCHIVED: [],
};

export class JourneyService {
  // ─────────────────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async createJourney(input: CreateJourneyInput, organizationId?: string): Promise<Journey> {
    if (!input.name?.trim()) throw new Error("Journey name is required.");
    if (!input.steps || input.steps.length === 0) {
      throw new Error("A journey needs at least one step.");
    }

    const triggerType = toTriggerTypeEnum(input.triggerType);
    if (triggerType === JourneyTriggerType.SEGMENT_ENTRY && !input.triggerSegmentId) {
      throw new Error("triggerSegmentId is required when triggerType is SEGMENT_ENTRY.");
    }

    if (input.triggerSegmentId) {
      const segment = await prisma.segment.findUnique({
        where: { id: input.triggerSegmentId },
        select: { id: true },
      });
      if (!segment) throw new Error(`Segment not found: "${input.triggerSegmentId}".`);
    }

    return prisma.journey.create({
      data: {
        name: input.name.trim(),
        triggerType,
        triggerSegmentId: triggerType === JourneyTriggerType.SEGMENT_ENTRY ? input.triggerSegmentId : null,
        organizationId,
        steps: {
          create: input.steps.map((step, index) => ({
            order: index,
            delayHours: Math.max(0, Math.trunc(step.delayHours ?? 0)),
            channel: toChannelEnum(step.channel),
            message: step.message,
          })),
        },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });
  }

  async listJourneys(organizationId?: string) {
    const where: Prisma.JourneyWhereInput = organizationId ? { organizationId } : {};
    const journeys = await prisma.journey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        triggerSegment: { select: { name: true } },
        _count: { select: { steps: true, enrollments: true } },
      },
    });

    // Active-enrollment counts aren't expressible via _count with a filter in
    // one query per journey without N+1; batch it in a single groupBy instead.
    const activeCounts = await prisma.journeyEnrollment.groupBy({
      by: ["journeyId"],
      where: { journeyId: { in: journeys.map((j) => j.id) }, status: EnrollmentStatus.ACTIVE },
      _count: { id: true },
    });
    const activeByJourney = new Map(activeCounts.map((c) => [c.journeyId, c._count.id]));

    return journeys.map((j) => ({ ...j, activeEnrollments: activeByJourney.get(j.id) ?? 0 }));
  }

  async getJourneyById(id: string, organizationId?: string) {
    const journey = await prisma.journey.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: "asc" } },
        triggerSegment: { select: { id: true, name: true } },
      },
    });
    if (!journey) throw new Error(`Journey not found: "${id}".`);
    if (organizationId && journey.organizationId && journey.organizationId !== organizationId) {
      throw new Error(`Journey not found: "${id}".`);
    }

    const statusCounts = await prisma.journeyEnrollment.groupBy({
      by: ["status"],
      where: { journeyId: id },
      _count: { id: true },
    });
    const enrollmentStats = { ACTIVE: 0, COMPLETED: 0, EXITED: 0 } as Record<EnrollmentStatus, number>;
    statusCounts.forEach((c) => {
      enrollmentStats[c.status] = c._count.id;
    });

    return { ...journey, enrollmentStats };
  }

  async updateStatus(id: string, status: string, organizationId?: string): Promise<Journey> {
    const journey = await prisma.journey.findUnique({
      where: { id },
      include: { _count: { select: { steps: true } } },
    });
    if (!journey) throw new Error(`Journey not found: "${id}".`);
    if (organizationId && journey.organizationId && journey.organizationId !== organizationId) {
      throw new Error(`Journey not found: "${id}".`);
    }

    const newStatus = toStatusEnum(status);
    if (!ALLOWED_TRANSITIONS[journey.status].includes(newStatus)) {
      throw new Error(`Cannot transition journey from ${journey.status} to ${newStatus}.`);
    }
    if (newStatus === JourneyStatus.ACTIVE && journey._count.steps === 0) {
      throw new Error("Cannot activate a journey with no steps.");
    }

    return prisma.journey.update({
      where: { id },
      data: {
        status: newStatus,
        // Reset the watermark to "now" the moment a journey goes live, so
        // CUSTOMER_CREATED/ORDER_PLACED triggers only fire for activity from
        // this point forward — not a backlog of everything since journey creation.
        ...(newStatus === JourneyStatus.ACTIVE && journey.status !== JourneyStatus.ACTIVE
          ? { lastScanAt: new Date() }
          : {}),
      },
    });
  }

  async addStep(journeyId: string, input: StepInput): Promise<JourneyStep> {
    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      select: { id: true, status: true },
    });
    if (!journey) throw new Error(`Journey not found: "${journeyId}".`);
    if (journey.status !== JourneyStatus.DRAFT) {
      throw new Error("Steps can only be added while the journey is DRAFT.");
    }

    const maxOrder = await prisma.journeyStep.aggregate({
      where: { journeyId },
      _max: { order: true },
    });

    return prisma.journeyStep.create({
      data: {
        journeyId,
        order: (maxOrder._max.order ?? -1) + 1,
        delayHours: Math.max(0, Math.trunc(input.delayHours ?? 0)),
        channel: toChannelEnum(input.channel),
        message: input.message,
      },
    });
  }

  async removeStep(journeyId: string, stepId: string): Promise<void> {
    const journey = await prisma.journey.findUnique({
      where: { id: journeyId },
      select: { status: true },
    });
    if (!journey) throw new Error(`Journey not found: "${journeyId}".`);
    if (journey.status !== JourneyStatus.DRAFT) {
      throw new Error("Steps can only be removed while the journey is DRAFT.");
    }

    await prisma.journeyStep.delete({ where: { id: stepId } });
  }

  async getEnrollments(journeyId: string, limit = 100): Promise<JourneyEnrollment[]> {
    return prisma.journeyEnrollment.findMany({
      where: { journeyId },
      orderBy: { enrolledAt: "desc" },
      take: limit,
      include: { customer: { select: { name: true, email: true } } },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Enrollment scan — evaluates triggers for every ACTIVE journey and
  // enrolls newly-qualifying customers.
  // ─────────────────────────────────────────────────────────────────────────

  async runEnrollmentScan(): Promise<void> {
    const journeys = await prisma.journey.findMany({
      where: { status: JourneyStatus.ACTIVE },
      include: { steps: { orderBy: { order: "asc" }, take: 1 } },
    });

    for (const journey of journeys) {
      if (journey.steps.length === 0) continue; // nothing to send — skip

      try {
        switch (journey.triggerType) {
          case JourneyTriggerType.CUSTOMER_CREATED:
            await this.scanCustomerCreated(journey);
            break;
          case JourneyTriggerType.ORDER_PLACED:
            await this.scanOrderPlaced(journey);
            break;
          case JourneyTriggerType.SEGMENT_ENTRY:
            await this.scanSegmentEntry(journey);
            break;
        }
      } catch (err) {
        console.error(`[Journey] Enrollment scan failed for journey ${journey.id}:`, err);
      }
    }
  }

  private async scanCustomerCreated(
    journey: Journey & { steps: JourneyStep[] }
  ): Promise<void> {
    const scanTime = new Date();
    const since = journey.lastScanAt ?? journey.createdAt;

    const orgFilter = journey.organizationId ? { organizationId: journey.organizationId } : {};
    const newCustomers = await prisma.customer.findMany({
      where: { ...orgFilter, createdAt: { gt: since, lte: scanTime } },
      select: { id: true, consentStatus: true },
    });

    for (const customer of newCustomers) {
      if (customer.consentStatus === ConsentStatus.OPTED_OUT) continue;
      await this.enroll(journey, customer.id, journey.steps[0]);
    }

    await prisma.journey.update({ where: { id: journey.id }, data: { lastScanAt: scanTime } });
  }

  private async scanOrderPlaced(journey: Journey & { steps: JourneyStep[] }): Promise<void> {
    const scanTime = new Date();
    const since = journey.lastScanAt ?? journey.createdAt;

    const orgFilter = journey.organizationId
      ? { customer: { organizationId: journey.organizationId } }
      : {};
    const newOrders = await prisma.order.findMany({
      where: { ...orgFilter, orderDate: { gt: since, lte: scanTime } },
      select: { customer: { select: { id: true, consentStatus: true } } },
      distinct: ["customerId"],
    });

    for (const { customer } of newOrders) {
      if (customer.consentStatus === ConsentStatus.OPTED_OUT) continue;
      // Multiple orders in the scan window still enroll the customer once —
      // "already ACTIVE" guard inside enroll() prevents duplicate runs.
      await this.enroll(journey, customer.id, journey.steps[0]);
    }

    await prisma.journey.update({ where: { id: journey.id }, data: { lastScanAt: scanTime } });
  }

  /**
   * SEGMENT_ENTRY enrolls each qualifying customer once — the first time they
   * are ever seen matching the segment, not on every re-entry. True "entry"
   * detection would require snapshotting membership between scans; this
   * simpler, well-documented semantic (enroll-on-first-match) still covers
   * the common cases (win-back, VIP nurture) without that bookkeeping.
   */
  private async scanSegmentEntry(journey: Journey & { steps: JourneyStep[] }): Promise<void> {
    if (!journey.triggerSegmentId) return;

    const segment = await prisma.segment.findUnique({ where: { id: journey.triggerSegmentId } });
    if (!segment) return;

    const where = await segmentService.buildPrismaWhereClause(
      segment.definition as Parameters<typeof segmentService.buildPrismaWhereClause>[0]
    );
    const orgFilter = journey.organizationId ? { organizationId: journey.organizationId } : {};

    const matching = await prisma.customer.findMany({
      where: { AND: [where, orgFilter, { consentStatus: { not: ConsentStatus.OPTED_OUT } }] },
      select: { id: true },
    });
    if (matching.length === 0) return;

    const alreadySeen = await prisma.journeyEnrollment.findMany({
      where: { journeyId: journey.id, customerId: { in: matching.map((c) => c.id) } },
      select: { customerId: true },
    });
    const seenIds = new Set(alreadySeen.map((e) => e.customerId));

    for (const customer of matching) {
      if (seenIds.has(customer.id)) continue;
      await this.enroll(journey, customer.id, journey.steps[0]);
    }
  }

  private async enroll(journey: Journey, customerId: string, firstStep: JourneyStep): Promise<void> {
    const existingActive = await prisma.journeyEnrollment.findFirst({
      where: { journeyId: journey.id, customerId, status: EnrollmentStatus.ACTIVE },
      select: { id: true },
    });
    if (existingActive) return; // already mid-run — never double-enroll

    await prisma.journeyEnrollment.create({
      data: {
        journeyId: journey.id,
        customerId,
        status: EnrollmentStatus.ACTIVE,
        currentStepIndex: 0,
        nextStepDueAt: new Date(Date.now() + firstStep.delayHours * 3_600_000),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step dispatch — sends every step whose nextStepDueAt has arrived.
  // ─────────────────────────────────────────────────────────────────────────

  async runStepDispatch(): Promise<void> {
    const due = await prisma.journeyEnrollment.findMany({
      where: { status: EnrollmentStatus.ACTIVE, nextStepDueAt: { lte: new Date() } },
      include: {
        customer: true,
        journey: { include: { steps: { orderBy: { order: "asc" } } } },
      },
      take: 500, // bound per tick so one huge backlog doesn't block the process
    });

    if (due.length === 0) return;

    console.log(`[Journey] Dispatching ${due.length} due step(s).`);

    // ── Create Communication rows for every due send ─────────────────────
    const created: { enrollmentId: string; communicationId: string }[] = [];

    for (const enrollment of due) {
      if (enrollment.customer.consentStatus === ConsentStatus.OPTED_OUT) {
        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: { status: EnrollmentStatus.EXITED, exitedAt: new Date(), nextStepDueAt: null },
        });
        continue;
      }

      const step = enrollment.journey.steps[enrollment.currentStepIndex];
      if (!step) {
        // Defensive: index drifted past the last step (e.g. steps were
        // removed after enrollment). Treat as complete.
        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: { status: EnrollmentStatus.COMPLETED, completedAt: new Date(), nextStepDueAt: null },
        });
        continue;
      }

      const communication = await prisma.communication.create({
        data: {
          journeyStepId: step.id,
          customerId: enrollment.customerId,
          channel: step.channel,
          message: renderMessage(step.message, enrollment.customer),
          status: CommunicationStatus.PENDING,
        },
      });

      created.push({ enrollmentId: enrollment.id, communicationId: communication.id });
    }

    if (created.length === 0) return;

    // ── Dispatch to the channel service in chunks, same as campaigns ─────
    const communications = await prisma.communication.findMany({
      where: { id: { in: created.map((c) => c.communicationId) } },
    });
    const byId = new Map(communications.map((c) => [c.id, c]));

    const chunks = chunkArray(created, 50);
    for (const chunk of chunks) {
      const comms = chunk.map((c) => byId.get(c.communicationId)!).filter(Boolean);
      const outcomes = await dispatchChunk(comms, "journey");

      for (const outcome of outcomes) {
        const entry = chunk.find((c) => c.communicationId === outcome.communicationId);
        if (!entry) continue;

        const enrollment = due.find((e) => e.id === entry.enrollmentId)!;
        const newStatus =
          outcome.status === "fulfilled" ? CommunicationStatus.SENT : CommunicationStatus.FAILED;

        await prisma.communication.updateMany({
          where: { id: outcome.communicationId, status: CommunicationStatus.PENDING },
          data: { status: newStatus },
        });

        // Advance the enrollment to the next step regardless of send outcome —
        // a transport failure on one step shouldn't strand the customer.
        const nextIndex = enrollment.currentStepIndex + 1;
        const nextStep = enrollment.journey.steps[nextIndex];

        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: nextStep
            ? {
                currentStepIndex: nextIndex,
                nextStepDueAt: new Date(Date.now() + nextStep.delayHours * 3_600_000),
              }
            : {
                currentStepIndex: nextIndex,
                status: EnrollmentStatus.COMPLETED,
                completedAt: new Date(),
                nextStepDueAt: null,
              },
        });
      }
    }
  }
}

export const journeyService = new JourneyService();
