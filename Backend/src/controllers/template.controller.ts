import { Request, Response, NextFunction } from "express";
import { templateService, extractTokens } from "../services/template.service";
import { sendSuccess } from "../utils/response";

export async function listTemplates(req: Request, res: Response, next: NextFunction) {
  try {
    const channel = req.query.channel as string | undefined;
    const templates = await templateService.list(channel, req.auth?.organizationId);
    sendSuccess(res, templates);
  } catch (error) {
    next(error);
  }
}

export async function getTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await templateService.getById(req.params.id);
    sendSuccess(res, { ...template, tokens: extractTokens(template.body) });
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const createdBy = (req.body.createdBy as string) ?? req.auth?.email ?? "admin";
    const template = await templateService.create(req.body, createdBy, req.auth?.organizationId);
    sendSuccess(res, template, "Template created", 201);
  } catch (error) {
    next(error);
  }
}

export async function updateTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const template = await templateService.update(req.params.id, req.body);
    sendSuccess(res, template, "Template updated");
  } catch (error) {
    next(error);
  }
}

export async function deleteTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    await templateService.remove(req.params.id);
    sendSuccess(res, { id: req.params.id }, "Template deleted");
  } catch (error) {
    next(error);
  }
}
