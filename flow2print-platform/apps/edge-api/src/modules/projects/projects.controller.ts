import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { CurrentSession } from "../../common/decorators/current-user.decorator.js";
import type { SessionWithUser } from "../../common/interfaces/auth-context.js";
import { validateFlow2PrintDocument } from "@flow2print/design-document";
import {
  applyTemplateRequestSchema,
  finalizeProjectRequestSchema,
} from "@flow2print/http-sdk";
import {
  CreateProjectDto,
  UpdateProjectDto,
  AutosaveProjectDto,
} from "./dto/projects.dto.js";

@ApiTags("projects")
@Controller("v1/projects")
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List all projects" })
  async list() {
    const projects = await this.store.instance.listProjects();
    const docs = await Promise.all(
      projects.map(async (project) => ({
        ...project,
        artifactCount: (
          await this.store.instance.getProjectArtifacts(project.id)
        ).length,
        preflightStatus:
          (await this.store.instance.getLatestPreflightReport(project.id))
            ?.status ?? null,
      })),
    );
    return { docs };
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Create project" })
  async create(
    @Body() body: CreateProjectDto,
    @CurrentSession() session: SessionWithUser | null,
  ) {
    const project = await this.store.instance.createProject({
      title: body.title,
      blueprintId: body.blueprintId,
      templateId: body.templateId,
    });
    if (!project) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "blueprint_not_found" };
    }
    return project;
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get project by ID" })
  async get(@Param("id") id: string) {
    const project = await this.store.instance.getProject(id);
    if (!project) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    const artifacts = await this.store.instance.getProjectArtifacts(
      project.project.id,
    );
    const preflightReport = await this.store.instance.getLatestPreflightReport(
      project.project.id,
    );
    const commerceLink = await this.store.instance.getCommerceLinkByProject(
      project.project.id,
    );
    return {
      ...project.project,
      document: project.version.document,
      version: project.version,
      artifacts,
      preflightReport,
      commerceLink,
    };
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Update project" })
  async update(@Param("id") id: string, @Body() body: UpdateProjectDto) {
    const project = await this.store.instance.updateProject(id, body);
    if (!project) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    return project;
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Delete project" })
  async remove(@Param("id") id: string) {
    const deleted = await this.store.instance.deleteProject(id);
    if (!deleted) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    return { ok: true };
  }

  @Post(":id/autosave")
  @Public()
  @ApiOperation({ summary: "Autosave project document" })
  async autosave(@Param("id") id: string, @Body() body: AutosaveProjectDto) {
    const project = await this.store.instance.getProject(id);
    if (!project) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    if (!body.document) {
      return { statusCode: HttpStatus.BAD_REQUEST, code: "document_required" };
    }
    const parsed = validateFlow2PrintDocument(body.document);
    if (!parsed.success) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: "invalid_document",
        issues: parsed.error.issues,
      };
    }
    const saved = await this.store.instance.autosaveProject(
      project.project.id,
      parsed.data,
    );
    if (!saved) {
      return { statusCode: HttpStatus.CONFLICT, code: "autosave_not_allowed" };
    }
    return {
      ok: true,
      versionId: saved.id,
      updatedAt: project.project.updatedAt,
    };
  }

  @Post(":id/apply-template")
  @Public()
  @ApiOperation({ summary: "Apply template to project" })
  async applyTemplate(@Param("id") id: string, @Body() body: unknown) {
    const parsed = applyTemplateRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: "invalid_apply_template_request",
        issues: parsed.error.issues,
      };
    }

    const updated = await this.store.instance.applyTemplateToProject(
      id,
      parsed.data,
    );
    if (!updated) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: "project_not_found_or_not_editable",
      };
    }

    const artifacts = await this.store.instance.getProjectArtifacts(
      updated.project.id,
    );
    const preflightReport = await this.store.instance.getLatestPreflightReport(
      updated.project.id,
    );
    const commerceLink = await this.store.instance.getCommerceLinkByProject(
      updated.project.id,
    );

    return {
      ...updated.project,
      document: updated.version.document,
      version: updated.version,
      artifacts,
      preflightReport,
      commerceLink,
    };
  }

  @Post(":id/finalize")
  @Public()
  @ApiOperation({ summary: "Finalize project" })
  async finalize(@Param("id") id: string, @Body() body: unknown) {
    const parsed = finalizeProjectRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: "invalid_finalize_request",
        issues: parsed.error.issues,
      };
    }

    const finalized = await this.store.instance.finalizeProjectById(
      id,
      parsed.data,
    );
    if (!finalized) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }

    return {
      projectId: finalized.project.id,
      finalVersionId: finalized.version.id,
      state: "finalized",
      approvalState: finalized.project.approvalState,
      jobs: finalized.project.latestJobs,
      artifacts: finalized.artifacts,
      preflightReport: finalized.report,
    };
  }

  @Get(":id/artifacts")
  @Public()
  @ApiOperation({ summary: "Get project artifacts" })
  async getArtifacts(@Param("id") id: string) {
    const project = await this.store.instance.getProject(id);
    if (!project) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    return { docs: await this.store.instance.getProjectArtifacts(id) };
  }

  @Get(":id/preflight")
  @Public()
  @ApiOperation({ summary: "Get project preflight report" })
  async getPreflight(@Param("id") id: string) {
    const project = await this.store.instance.getProject(id);
    if (!project) {
      return { statusCode: HttpStatus.NOT_FOUND, code: "project_not_found" };
    }
    const report = await this.store.instance.getLatestPreflightReport(id);
    if (!report) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: "preflight_report_not_found",
      };
    }
    return report;
  }
}
