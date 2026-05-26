import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminGuard } from '../../core/guards/admin.guard';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { JwtPayload } from '../../core/interfaces/jwt-payload.interface';
import { User } from './entities/user.entity';

/**
 * UsersController — manages user accounts.
 *
 * All routes require a valid JWT Bearer token.
 * Routes marked "Admin only" additionally require the AdminGuard.
 *
 * Base path: /users
 *
 * Endpoints summary (for LLM agents):
 *   GET    /users          → list all users (safe fields)
 *   GET    /users/me       → get the authenticated user's JWT payload
 *   GET    /users/:id      → get one user by numeric id (safe fields)
 *   PATCH  /users/:id      → update user details [Admin]
 *   DELETE /users/:id      → delete a user permanently [Admin]
 *   PATCH  /users/:id/role → change user role [Admin]
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /users
   *
   * Returns all users with public/safe fields only (no passwords, secrets).
   * Use this to browse the user list or look up a user by name/email
   * before fetching their full details.
   *
   * Guard: JwtAuthGuard (any authenticated user)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns every user in the system with safe/public fields only ' +
      '(id, username, email, role, createdAt). ' +
      'Passwords and sensitive tokens are never included. ' +
      'Use this endpoint to discover user IDs before calling GET /users/:id.',
  })
  @ApiOkResponse({
    description:
      'Array of users (safe fields). ' +
      'Each item contains: id (number), username (string), email (string), ' +
      'role (string: "admin" | "user"), createdAt (ISO date string).',
  })
  @ApiUnauthorizedResponse({
    description:
      'No valid JWT Bearer token was provided. ' +
      'Add the Authorization header: "Bearer <token>".',
  })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  list() {
    return this.usersService.findAllSafe();
  }

  /**
   * GET /users/me
   *
   * Returns the JWT payload of the currently authenticated user.
   * Useful for the frontend/agent to know who is logged in
   * without a database round-trip.
   *
   * Guard: JwtAuthGuard (any authenticated user)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current authenticated user',
    description:
      'Reads the JWT payload that was decoded by JwtAuthGuard and returns it ' +
      'as a ServiceResultContainer<JwtPayload>. ' +
      'Fields: sub (userId number), email (string), role (string), iat (number), exp (number). ' +
      'No database query is made — data comes directly from the token.',
  })
  @ApiOkResponse({
    description:
      'ServiceResultContainer with success=true and result = JwtPayload object ' +
      '(sub, email, role, iat, exp).',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or expired JWT token.',
  })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  me(@Req() req: Request) {
    const result: ServiceResultContainer<JwtPayload> = {
      success: true,
      message: 'Current user retrieved successfully',
      result: req.user as JwtPayload,
    };
    return result;
  }

  /**
   * GET /users/:id
   *
   * Returns a single user by their numeric database id.
   * Only safe/public fields are returned (no password).
   * Returns 404 if no user with that id exists.
   *
   * Guard: JwtAuthGuard (any authenticated user)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user by id',
    description:
      'Fetches a single user record by numeric id with safe/public fields only. ' +
      'Throws 404 if the user does not exist. ' +
      'Use GET /users first to discover valid IDs.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description:
      'The unique numeric database id of the user (e.g. 1, 42). ' +
      'Must be a positive integer — ParseIntPipe will reject anything else.',
  })
  @ApiOkResponse({
    description:
      'Single user object (safe fields): id, username, email, role, createdAt.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiNotFoundResponse({
    description: 'No user found with the given id.',
  })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneSafe(id);
  }

  /**
   * PATCH /users/:id
   *
   * Updates editable fields of a user (e.g. username, email).
   * Does NOT change the user's role — use PATCH /users/:id/role for that.
   * Returns 404 if the user does not exist.
   * Returns 400 if the body fails DTO validation.
   *
   * Guard: JwtAuthGuard + AdminGuard (admin only)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Update user details [Admin]',
    description:
      'Updates one or more fields of the user identified by :id. ' +
      'Send only the fields you want to change (partial update). ' +
      'Available fields in UpdateUserDto: username? (string), email? (string). ' +
      'Role changes must use PATCH /users/:id/role instead. ' +
      'Requires admin privileges.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Numeric id of the user to update.',
  })
  @ApiBody({
    type: UpdateUserDto,
    description:
      'Partial user data. All fields are optional. ' +
      'Example: { "username": "newName" } or { "email": "new@example.com" }.',
  })
  @ApiOkResponse({
    description: 'Updated user record (safe fields).',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiForbiddenResponse({
    description:
      'Authenticated user does not have the admin role. ' +
      'AdminGuard rejected the request.',
  })
  @ApiNotFoundResponse({ description: 'No user found with the given id.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  /**
   * DELETE /users/:id
   *
   * Permanently deletes the user with the given id.
   * This action is IRREVERSIBLE — there is no soft-delete.
   * Returns 404 if no user with that id exists.
   *
   * Guard: JwtAuthGuard + AdminGuard (admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Delete user permanently [Admin]',
    description:
      'Hard-deletes the user record from the database. ' +
      'IRREVERSIBLE — no soft-delete or recycle bin. ' +
      'Double-check the id before calling this endpoint. ' +
      'Requires admin privileges.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Numeric id of the user to delete.',
  })
  @ApiOkResponse({
    description:
      'Deletion confirmed. Returns ServiceResultContainer with success=true.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiForbiddenResponse({
    description: 'Authenticated user is not an admin.',
  })
  @ApiNotFoundResponse({ description: 'No user found with the given id.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }

  /**
   * PATCH /users/:id/role
   *
   * Changes the role of a user (e.g. "user" → "admin" or vice versa).
   * Only the role field is updated — use PATCH /users/:id for other fields.
   * Returns 404 if the user does not exist.
   * Returns 400 if the role value is not a valid enum value.
   *
   * Guard: JwtAuthGuard + AdminGuard (admin only)
   */
  @Patch(':id/role')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Change user role [Admin]',
    description:
      'Sets the role field of the user identified by :id. ' +
      'Valid roles (from UpdateUserRoleDto): "admin" | "user". ' +
      'Use this endpoint exclusively for role changes; ' +
      'other user fields are updated via PATCH /users/:id. ' +
      'Requires admin privileges.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Numeric id of the user whose role will change.',
  })
  @ApiBody({
    type: UpdateUserRoleDto,
    description:
      'Role payload. Required field: role (string enum: "admin" | "user"). ' +
      'Example: { "role": "admin" }.',
  })
  @ApiOkResponse({
    description:
      'Role updated successfully. Returns ServiceResultContainer with updated user.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiForbiddenResponse({
    description: 'Authenticated user is not an admin.',
  })
  @ApiNotFoundResponse({ description: 'No user found with the given id.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }
}