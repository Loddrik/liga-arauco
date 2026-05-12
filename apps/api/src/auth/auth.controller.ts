import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginSchema, type LoginInput } from '@liga/shared';
import { ZodValidationPipe } from '../common/zod.pipe';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }
}
