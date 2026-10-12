import { Body, Controller, Get, Post, Req, Patch } from '@nestjs/common';

//import { UserRole } from '@computer-sales/database';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
//import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
//import { CurrentUser } from './decorators/current-user.decorator.js';
//import { Roles } from './decorators/roles.decorator.js';
//import { RolesGuard } from './guards/roles.guard.js';
import { Public } from './decorators/public.decorator.js';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto.js';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto.js';

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

  @Patch('me')
  updateMyProfile(@Req() req: any, @Body() dto: UpdateMyProfileDto) {
    return this.authService.updateMyProfile(req.user.id, dto);
  }

  @Post('change-password')
  changeMyPassword(@Req() req: any, @Body() dto: ChangeMyPasswordDto) {
    return this.authService.changeMyPassword(req.user.id, dto);
  }
}
