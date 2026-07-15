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
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResultResponseDto } from './dto/user-result-response.dto';
import { UsersListResultResponseDto } from './dto/users-list-result-response.dto';
import { DeleteUserResultResponseDto } from './dto/delete-user-result-response.dto';
import { AdminGuard } from '../../core/guards/admin.guard';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { JwtPayload } from '../../core/interfaces/jwt-payload.interface';
import { RequiresConfirmation } from '../admin-agent/decorators/requires-confirmation.decorator';
import { JwtPayloadResultResponseDto } from '../../core/dto/jwt-payload-result-response.dto';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';
import { GenUiSpec } from '../admin-agent/constants/gen-ui-spec.constant';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List all users',
    summaryHe: 'שולף את רשימת כל המשתמשים במערכת',
    toolIcon: 'ph-users',
    genUiSpec: GenUiSpec.USERS_TABLE,
    description:
      'Returns every user in the system with public fields only: id, email, fullName, numeric role, createdAt, updatedAt, lastLoginAt. ' +
      'Passwords and refresh token hashes are never returned.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'ServiceResultContainer<UserResponseDto[]>.',
    type: UsersListResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  list() {
    return this.usersService.findAllSafe();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current authenticated user payload',
    summaryHe: 'שולף את פרטי המשתמש המחובר מתוך הטוקן',
    toolIcon: 'ph-user-circle',
    genUiSpec: GenUiSpec.USER_PROFILE,
    description:
      'Returns the JWT payload decoded by JwtAuthGuard. No database query is made. Role is numeric: 1 = Admin, 2 = User.',
  } as CustomApiOperationOptions)
  @ApiOkResponse({
    description: 'ServiceResultContainer<JwtPayload> with sub, email, numeric role, iat, and exp.',
    type: JwtPayloadResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  me(@Req() req: Request) {
    const result: ServiceResultContainer<JwtPayload> = {
      success: true,
      message: 'Current user retrieved successfully',
      result: req.user as JwtPayload,
    };
    return result;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user by id',
    summaryHe: 'שולף משתמש לפי מזהה (מזהה: ${id})',
    toolIcon: 'ph-user',
    genUiSpec: GenUiSpec.USER_PROFILE,
    description:
      'Fetches one user by numeric id with public fields only. Use GET /users first to discover valid IDs.',
  } as CustomApiOperationOptions)
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique numeric user id. ParseIntPipe rejects non-numeric values.',
  })
  @ApiOkResponse({
    description: 'ServiceResultContainer<UserResponseDto>.',
    type: UserResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiNotFoundResponse({ description: 'No user found with the given id.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneSafe(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Update user profile fields',
    summaryHe: 'מעדכן את שדות הפרופיל של המשתמש (מזהה: ${id})',
    toolIcon: 'ph-pencil-simple',
    genUiSpec: GenUiSpec.USER_UPDATE_CONFIRMATION,
    description:
      'Updates fullName and/or email for the user identified by :id. ' +
      'This endpoint intentionally does not accept role changes; use PATCH /users/:id/role for role updates.',
  } as CustomApiOperationOptions)
  @ApiParam({ name: 'id', type: Number, description: 'Numeric id of the user to update.' })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Partial profile update. Example: { "fullName": "New Name" } or { "email": "new@example.com" }.',
  })
  @ApiOkResponse({
    description: 'ServiceResultContainer<UserResponseDto> with the updated user.',
    type: UserResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an admin.' })
  @ApiNotFoundResponse({ description: 'No user found with the given id.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiresConfirmation()
  @ApiOperation({
    summary: 'Delete user permanently',
    summaryHe: 'מוחק לצמיתות את המשתמש (מזהה: ${id})',
    toolIcon: 'ph-trash',
    genUiSpec: GenUiSpec.DELETE_CONFIRM,
    description: 'Hard-deletes the user record. This is irreversible and requires admin privileges.',
  } as CustomApiOperationOptions)
  @ApiParam({ name: 'id', type: Number, description: 'Numeric id of the user to delete.' })
  @ApiOkResponse({
    description: 'Deletion confirmed.',
    type: DeleteUserResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an admin.' })
  @ApiNotFoundResponse({ description: 'No user found with the given id.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }

  @Patch(':id/role')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiresConfirmation()
  @ApiOperation({
    summary: 'Change user role',
    summaryHe: 'משנה את תפקיד המשתמש (מזהה: ${id})',
    toolIcon: 'ph-shield',
    genUiSpec: GenUiSpec.USER_ROLE_CHANGE_CONFIRMATION,
    description:
      'Sets only the role field of the user identified by :id. IMPORTANT: role must be a NUMBER: 1 = Admin, 2 = User. Never send a string. Accepted numeric values : 1 = Admin, 2 = User. ' +
      'Other user fields must be updated through PATCH /users/:id.',
  } as CustomApiOperationOptions)
  @ApiParam({ name: 'id', type: Number, description: 'Numeric id of the user whose role will change.' })
  @ApiBody({
    type: UpdateUserRoleDto,
    description: 'Role payload. Example: { "role": 1 } for Admin or { "role": 2 } for User.',
  })
  @ApiOkResponse({
    description: 'ServiceResultContainer<UserResponseDto> with the updated user.',
    type: UserResultResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired JWT token.' })
  @ApiForbiddenResponse({ description: 'Authenticated user is not an admin.' })
  @ApiNotFoundResponse({ description: 'No user found with the given id.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }
}
