import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

//import { UserRole } from '@computer-sales/database';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
//import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
//import { CurrentUser } from './decorators/current-user.decorator.js';
//import { Roles } from './decorators/roles.decorator.js';
//import { RolesGuard } from './guards/roles.guard.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }
}
