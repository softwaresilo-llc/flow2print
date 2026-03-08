import { Controller, Get, HttpException, HttpStatus, Param, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator.js";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import type { FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";

const contentTypeForPath = (path: string) => {
  if (path.endsWith(".png")) {
    return "image/png";
  }

  if (path.endsWith(".pdf")) {
    return "application/pdf";
  }

  return "application/octet-stream";
};

@ApiTags("artifacts")
@Controller("artifacts")
export class ArtifactsController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Get(":projectId/:versionId/:filename")
  @Public()
  @ApiOperation({ summary: "Download output artifact" })
  async getArtifact(
    @Param("projectId") projectId: string,
    @Param("versionId") versionId: string,
    @Param("filename") filename: string,
    @Res() reply: FastifyReply,
  ) {
    const href = `/artifacts/${projectId}/${versionId}/${filename}`;
    const artifact = await this.store.instance.getArtifactByHref(href);

    if (!artifact) {
      throw new HttpException({ code: "artifact_not_found" }, HttpStatus.NOT_FOUND);
    }

    const payload = await readFile(artifact.filePath);
    reply.header("Content-Type", contentTypeForPath(artifact.filePath));
    reply.header("Cache-Control", "private, max-age=60");
    return reply.send(payload);
  }
}
