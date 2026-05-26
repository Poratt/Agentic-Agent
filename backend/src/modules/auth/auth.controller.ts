import { Controller, Post, Body, Res, Req, UseGuards, Get, HttpCode, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from '../../core/guards/jwt-refresh.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ServiceResultContainer } from '../../core/models/service-result-container.model';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { JwtPayload } from '../../core/interfaces/jwt-payload.interface';
import type { RequestWithUser } from '../../core/interfaces/request-with-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Register',
    description:
      'Creates a new user account using email/password (or whatever fields are defined in the DTO). Returns the created user payload.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: User })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticates the user and sets auth cookies/headers as configured by the service. Returns a user payload on success.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User logged in successfully', type: User })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses the refresh token (guard-protected) to issue a new access token and update cookies/headers as needed.',
  })
  @ApiResponse({ status: 200, description: 'Access token refreshed successfully', type: User })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid refresh token' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  refresh(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    if (!user.refreshToken) throw new UnauthorizedException();
    return this.authService.refresh(user.sub, user.refreshToken, res);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description:
      'Invalidates the current session (if applicable) and clears auth cookies/headers. Requires a valid access token.',
  })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  logout(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    return this.authService.logout(user.sub, res);
  }

  @Get('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns the authenticated user context extracted from the access token / session. Useful to hydrate the frontend session state.',
  })
  @ApiResponse({ status: 200, description: 'Current user retrieved successfully', type: User })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid access token' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
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
