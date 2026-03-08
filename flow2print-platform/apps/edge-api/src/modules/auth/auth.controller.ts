import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RuntimeStoreService } from "../../services/runtime-store.service.js";
import { AuthGuard, CurrentAuth, CurrentSession } from "../../common/index.js";
import type { AuthContext, SessionWithUser } from "../../common/index.js";
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from "./dto/index.js";
import { Public } from "../../common/decorators/public.decorator.js";

@ApiTags("auth")
@Controller("v1/auth")
export class AuthController {
  constructor(private readonly store: RuntimeStoreService) {}

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() body: LoginDto) {
    const result = await this.store.instance.createAuthSession(
      body.email,
      body.password,
    );
    if (!result) {
      return { statusCode: 401, code: "invalid_credentials" };
    }
    return result;
  }

  @Get("session")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current session" })
  @ApiResponse({ status: 200, description: "Session found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSession(@CurrentSession() session: SessionWithUser | null) {
    if (!session) {
      return { statusCode: 401, code: "session_not_found" };
    }
    return session;
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout current session" })
  async logout(@CurrentAuth() auth: AuthContext) {
    if (auth?.kind === "session") {
      await this.store.instance.revokeSession(auth.session.session.token);
    }
    return { ok: true };
  }

  @Post("forgot-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset" })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const result = await this.store.instance.createPasswordReset(body.email);
    return {
      ok: true,
      resetRequested: Boolean(result),
      token: result?.reset.token ?? null,
    };
  }

  @Post("reset-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with token" })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const result = await this.store.instance.resetPassword(
      body.token,
      body.password,
    );
    if (!result) {
      return { statusCode: 404, code: "reset_token_not_found" };
    }
    return { ok: true };
  }

  @Patch("profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update own profile" })
  async updateProfile(
    @CurrentSession() session: SessionWithUser | null,
    @Body() body: UpdateProfileDto,
  ) {
    if (!session) {
      return { statusCode: 401, code: "auth_required" };
    }
    const updated = await this.store.instance.updateOwnProfile(
      session.user.id,
      body,
    );
    if (!updated) {
      return { statusCode: 404, code: "user_not_found" };
    }
    if ("conflict" in updated) {
      return { statusCode: 409, code: "email_already_exists" };
    }
    return updated;
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change own password" })
  async changePassword(
    @CurrentSession() session: SessionWithUser | null,
    @Body() body: ChangePasswordDto,
  ) {
    if (!session) {
      return { statusCode: 401, code: "auth_required" };
    }
    const changed = await this.store.instance.changeOwnPassword(
      session.user.id,
      body.currentPassword,
      body.nextPassword,
    );
    if (!changed) {
      return { statusCode: 400, code: "current_password_invalid" };
    }
    return { ok: true };
  }
}
