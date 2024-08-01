import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Delete,
  Param,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoggerService } from '@@core/@core-services/logger/logger.service';
import {
  ApiBody,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyDto } from './dto/api-key.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';


@ApiTags('auth')
@ApiExcludeController()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private logger: LoggerService,
  ) {
    this.logger.setContext(AuthController.name);
  }

  @ApiOperation({ operationId: 'signUp', summary: 'Register' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201 })
  @Post('register')
  async registerUser(@Body() user: CreateUserDto) {
    return this.authService.register(user);
  }

  @ApiOperation({ operationId: 'requestPasswordReset', summary: 'Request Password Reset' })
  @ApiBody({ type: RequestPasswordResetDto })
  @Post('password_reset_request')
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestPasswordResetDto);
  }

  @ApiOperation({ operationId: 'signIn', summary: 'Log In' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201 })
  @Post('login')
  async login(@Body() user: LoginDto) {
    return this.authService.login(user);
  }

  // todo: admin only
  @ApiOperation({ operationId: 'getPanoraCoreUsers', summary: 'Get users' })
  @ApiResponse({ status: 200 })
  @Get('users')
  async users() {
    return this.authService.getUsers();
  }

  @ApiOperation({ operationId: 'resetPassword', summary: 'Reset Password' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @Post('reset_password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiResponse({ status: 201 })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.verifyUser(req.user);
  }

  @ApiOperation({ operationId: 'getApiKeys', summary: 'Retrieve API Keys' })
  @ApiResponse({ status: 200 })
  @UseGuards(JwtAuthGuard)
  @Get('api_keys')
  async getApiKeys(@Request() req: any) {
    const { id_project } = req.user;
    return this.authService.getApiKeys(id_project);
  }

  @ApiOperation({ operationId: 'deleteApiKey', summary: 'Delete API Keys' })
  @ApiResponse({ status: 201 })
  @Delete('api_keys/:id')
  @UseGuards(JwtAuthGuard)
  async deleteApiKey(@Param('id') apiKeyId: string) {
    return await this.authService.deleteApiKey(apiKeyId);
  }

  @ApiOperation({ operationId: 'generateApiKey', summary: 'Create API Key' })
  @ApiBody({ type: ApiKeyDto })
  @ApiResponse({ status: 201 })
  @UseGuards(JwtAuthGuard)
  @Post('api_keys')
  async generateApiKey(@Body() data: ApiKeyDto): Promise<{ api_key: string }> {
    return this.authService.generateApiKeyForUser(
      data.userId,
      data.projectId,
      data.keyName,
    );
  }

  @ApiOperation({
    operationId: 'refreshAccessToken',
    summary: 'Refresh Access Token',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 201 })
  @UseGuards(JwtAuthGuard)
  @Post('refresh_token')
  refreshAccessToken(@Request() req: any, @Body() body: RefreshDto) {
    const { projectId } = body;
    const { id_user, email, first_name, last_name } = req.user;
    return this.authService.refreshAccessToken(
      projectId,
      id_user,
      email,
      first_name,
      last_name,
    );
  }
}
