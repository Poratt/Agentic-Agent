import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  Get,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from '../../core/guards/jwt-refresh.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiInternalServerErrorResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { JwtPayload } from '../../core/interfaces/jwt-payload.interface';
import type { RequestWithUser } from '../../core/interfaces/request-with-user.interface';

/**
 * AuthController — handles all authentication flows.
 *
 * No global guard — each route declares its own guard explicitly.
 * Cookies/headers are written via @Res({ passthrough: true }).
 *
 * Base path: /auth
 *
 * Endpoints summary (for LLM agents):
 *   POST /auth/register → create a new user account
 *   POST /auth/login    → authenticate and receive tokens/cookies
 *   POST /auth/refresh  → exchange refresh token for a new access token
 *   POST /auth/logout   → invalidate session and clear cookies [JWT required]
 *   GET  /auth/me       → return current authenticated user payload [JWT required]
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /auth/register
   *
   * Creates a new user account.
   * No authentication required — public endpoint.
   * Returns 400 if required fields are missing or email already exists.
   * Returns the created User entity on success (201).
   */
  @Post('register')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates a new user in the database using the provided credentials. ' +
      'Required fields (from RegisterDto): email (string, valid email format), ' +
      'password (string, min 6 chars), username? (string, optional). ' +
      'Returns the newly created User entity (without password). ' +
      'Returns 400 if email is already taken or DTO validation fails. ' +
      'This endpoint is public — no token required.',
  })
  @ApiBody({
    type: RegisterDto,
    description:
      'Registration payload. ' +
      'Example: { "email": "user@example.com", "password": "secret123", "username": "myName" }.',
  })
  @ApiCreatedResponse({
    description:
      'User created successfully. ' +
      'Returns the User entity: id (number), email (string), username (string), ' +
      'role ("user" | "admin"), createdAt (ISO date). Password is never returned.',
    type: User,
  })
  @ApiBadRequestResponse({
    description:
      'DTO validation failed (missing fields, invalid email format, weak password) ' +
      'or email is already registered.',
  })
  @ApiUnauthorizedResponse({ description: 'Not applicable for this endpoint.' })
  @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
  @ApiNotFoundResponse({ description: 'Not applicable for this endpoint.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   *
   * Authenticates a user with email + password.
   * On success, sets JWT tokens as cookies/headers (handled by AuthService).
   * Returns the authenticated User entity.
   * Returns 401 if credentials are wrong.
   *
   * No guard — credentials are validated inside AuthService.
   */
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Validates the provided credentials against the database. ' +
      'On success: sets the access token and refresh token as HTTP-only cookies ' +
      '(or Authorization header — depending on AuthService configuration) ' +
      'and returns the User entity. ' +
      'Required fields (from LoginDto): email (string), password (string). ' +
      'Returns 401 if email does not exist or password does not match. ' +
      'This endpoint is public — no token required.',
  })
  @ApiBody({
    type: LoginDto,
    description:
      'Login credentials. ' +
      'Example: { "email": "user@example.com", "password": "secret123" }.',
  })
  @ApiOkResponse({
    description:
      'Login successful. ' +
      'Returns the User entity (id, email, username, role, createdAt). ' +
      'Auth tokens are set as cookies/headers by the service.',
    type: User,
  })
  @ApiBadRequestResponse({
    description: 'DTO validation failed (missing or malformed fields).',
  })
  @ApiUnauthorizedResponse({
    description:
      'Invalid credentials — email not found or password does not match.',
  })
  @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
  @ApiNotFoundResponse({ description: 'Not applicable for this endpoint.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  /**
   * POST /auth/refresh
   *
   * Issues a new access token using the refresh token.
   * The refresh token is read by JwtRefreshGuard from the cookie/header.
   * On success, the new access token is written to cookies/headers.
   * Returns 401 if the refresh token is missing, expired, or revoked.
   *
   * Guard: JwtRefreshGuard (reads refresh token, not access token)
   */
  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
    description:
      'JwtRefreshGuard reads the refresh token from the cookie or Authorization header. ' +
      'If valid, AuthService issues a new access token and writes it to cookies/headers. ' +
      'req.user is populated by the guard with: sub (userId), refreshToken (raw string). ' +
      'Returns 401 if the refresh token is absent, expired, or does not match the stored hash. ' +
      'Call this endpoint when the access token has expired (typically 401 on any protected route).',
  })
  @ApiOkResponse({
    description:
      'New access token issued. ' +
      'Returns the User entity. ' +
      'Updated tokens are set in cookies/headers by the service.',
    type: User,
  })
  @ApiBadRequestResponse({ description: 'Malformed request.' })
  @ApiUnauthorizedResponse({
    description:
      'Refresh token is missing, expired, or does not match the stored token hash.',
  })
  @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
  @ApiNotFoundResponse({ description: 'Not applicable for this endpoint.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  refresh(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    if (!user.refreshToken) throw new UnauthorizedException();
    return this.authService.refresh(user.sub, user.refreshToken, res);
  }

  /**
   * POST /auth/logout
   *
   * Invalidates the current session: clears the stored refresh token hash
   * and removes auth cookies/headers.
   * Requires a valid access token (JwtAuthGuard).
   * After logout, both the access token and refresh token are no longer valid.
   *
   * Guard: JwtAuthGuard (access token required)
   */
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout and invalidate session [JWT required]',
    description:
      'Reads the authenticated user from req.user (populated by JwtAuthGuard). ' +
      'Calls AuthService.logout(userId, res) which: ' +
      '(1) clears the refresh token hash from the database, ' +
      '(2) clears auth cookies/headers from the response. ' +
      'After this call, the refresh token is revoked and the access token ' +
      'will be rejected on the next request (or expire naturally). ' +
      'Requires Authorization: Bearer <accessToken> header.',
  })
  @ApiOkResponse({
    description:
      'Logout successful. Session cleared. ' +
      'Returns ServiceResultContainer with success=true.',
  })
  @ApiBadRequestResponse({ description: 'Malformed request.' })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing, expired, or invalid.',
  })
  @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
  @ApiNotFoundResponse({ description: 'Not applicable for this endpoint.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  logout(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    return this.authService.logout(user.sub, res);
  }

  /**
   * GET /auth/me
   *
   * Returns the current authenticated user's JWT payload.
   * Used by the frontend/agent to hydrate session state
   * without hitting a heavier /users/:id endpoint.
   * No database query — data is read directly from the decoded token.
   *
   * Guard: JwtAuthGuard (access token required)
   */
  @Get('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user [JWT required]',
    description:
      'Reads req.user as populated by JwtAuthGuard (decoded from the access token). ' +
      'No database query is made. ' +
      'Returns a ServiceResultContainer<JwtPayload> where result contains: ' +
      'sub (userId number), email (string), role ("user" | "admin"), ' +
      'iat (issued-at timestamp), exp (expiry timestamp). ' +
      'Use this to check who is logged in or to verify the token is still valid. ' +
      'Requires Authorization: Bearer <accessToken> header.',
  })
  @ApiOkResponse({
    description:
      'ServiceResultContainer with success=true and result = JwtPayload ' +
      '(sub, email, role, iat, exp). No database round-trip.',
    type: User,
  })
  @ApiBadRequestResponse({ description: 'Malformed request.' })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing, expired, or invalid.',
  })
  @ApiForbiddenResponse({ description: 'Not applicable for this endpoint.' })
  @ApiNotFoundResponse({ description: 'Not applicable for this endpoint.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  me(@Req() req: RequestWithUser) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    const result: ServiceResultContainer<JwtPayload> = {
      success: true,
      message: 'Current user retrieved successfully',
      result: user,
    };
    return result;
  }
}