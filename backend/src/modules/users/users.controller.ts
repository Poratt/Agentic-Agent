import { Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Body, Req, UseGuards, Delete } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
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

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List users (safe fields)',
    description:
      'Returns a list of users with safe/public fields only. Requires authentication.',
  })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  list() {
    return this.usersService.findAllSafe();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns the JWT payload extracted by the auth guard for the current request.',
  })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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
  @ApiParam({ name: 'id', type: Number, description: 'User numeric id' })
  @ApiOperation({
    summary: 'Get user by id (safe fields)',
    description:
      'Returns a single user by id with safe/public fields only.',
  })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneSafe(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiParam({ name: 'id', type: Number, description: 'User numeric id' })
  @ApiOperation({
    summary: 'Update user details',
    description:
      'Updates user fields. Admin-only endpoint.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiForbiddenResponse({ description: 'Forbidden (admin only)' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiParam({ name: 'id', type: Number, description: 'User numeric id' })
  @ApiOperation({
    summary: 'Delete user',
    description:
      'Deletes a user. Admin-only endpoint. This action is irreversible.',
  })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiForbiddenResponse({ description: 'Forbidden (admin only)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }

  @Patch(':id/role')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiParam({ name: 'id', type: Number, description: 'User numeric id' })
  @ApiOperation({
    summary: 'Update user role',
    description:
      'Changes the role for a user. Admin-only endpoint.',
  })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiForbiddenResponse({ description: 'Forbidden (admin only)' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }
}
