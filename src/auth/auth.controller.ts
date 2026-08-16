import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { ApiResponseDto } from './dto/api-response.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { PublicRegisterDto } from './dto/public-register.dto';
import { AuthPayloadDto } from './dto/auth-payload.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { UserLoginDto } from './dto/user-login.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { RequestOtpDTo } from './dto/request-otp.dto';
import { BlackListGuard } from './guards/blacklisted.guard';
import { AdminDeleteUserDTO } from './dto/delete-admin.dto';
import { CurrentUser } from './decorators/currentUser.decorator';
import { AuthGuard } from '@nestjs/passport';
import { UserDeleteDto } from './dto/delete-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, BlackListGuard)
  @Roles(UserRole.ADMIN)
  @Get('user/:id')
  @HttpCode(HttpStatus.OK)
  async getUserById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponseDto<UserProfileDto>> {
    const userProfile = await this.authService.getUserById(id);

    return new ApiResponseDto<UserProfileDto>({
      success: true,
      message: 'User retrieved successfully.',
      data: userProfile,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BlackListGuard)
  @Roles(UserRole.ADMIN)
  @Get('allUsers')
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query('name') name?: string,
  ): Promise<ApiResponseDto<UserProfileDto[]>> {
    const userProfiles = await this.authService.getUsers(name);

    return new ApiResponseDto<UserProfileDto[]>({
      success: true,
      message: 'Users retrived Success',
      data: userProfiles,
    });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async publicRegister(
    @Body() userData: PublicRegisterDto,
  ): Promise<AuthPayloadDto> {
    return this.authService.userRegister(userData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BlackListGuard)
  @Roles(UserRole.ADMIN)
  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  async adminRegister(
    @Body() userData: AdminRegisterDto,
  ): Promise<UserProfileDto> {
    return this.authService.adminCreateUser(userData);
  }

  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body() invitationData: AcceptInvitationDto,
  ): Promise<ApiResponseDto<UserProfileDto>> {
    const activatedUser =
      await this.authService.acceptInvitation(invitationData);

    return new ApiResponseDto<UserProfileDto>({
      success: true,
      message: 'Account activated successfully! You can now log in.',
      data: activatedUser,
    });
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body() otpData: RequestOtpDTo,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.sendOTP(otpData);

    return new ApiResponseDto({
      success: true,
      message:
        'If the email address is registered in our system, you will receive an OTP shortly.',
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() userData: UserLoginDto): Promise<AuthPayloadDto> {
    return this.authService.loginUser(userData);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body('refreshToken') refreshToken: string,
  ): Promise<ApiResponseDto<AuthPayloadDto>> {
    const rotatedTokens = await this.authService.refreshToken(
      userId,
      refreshToken,
    );
    return new ApiResponseDto({
      success: true,
      message: 'Security token credentials rotated successfully.',
      data: rotatedTokens,
    });
  }

  @UseGuards(JwtAuthGuard, BlackListGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any): Promise<ApiResponseDto<null>> {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader.split(' ')[1];

    await this.authService.logout(req.user.id, accessToken);

    return new ApiResponseDto({
      success: true,
      message: 'Logout Successfull!',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BlackListGuard)
  @Roles(UserRole.ADMIN)
  @Delete('user/:id/delete')
  @HttpCode(HttpStatus.OK)
  async adminDeleteUser(
    @Param('id', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: AdminDeleteUserDTO,
    @CurrentUser() admin: any,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.adminDeleteUser(userId, dto.reason, admin.id);

    return new ApiResponseDto<null>({
      success: true,
      message: 'user account has been deleted',
    });
  }

  @UseGuards(JwtAuthGuard, BlackListGuard)
  @Delete('delete/self')
  @HttpCode(HttpStatus.OK)
  async deleteOwnAccount(
    @CurrentUser() user: any,
    @Body() dto: UserDeleteDto,
    @Req() req: any,
  ): Promise<ApiResponseDto<null>> {
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.replace('Bearer ', '').trim();

    await this.authService.userDelete(user.id, dto, accessToken);

    return new ApiResponseDto<null>({
      success: true,
      message: 'Your account has been successfully deleted',
    });
  }
}
