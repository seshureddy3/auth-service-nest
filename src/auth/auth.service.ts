import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { ILike, Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { UserProfileDto } from './dto/user-profile.dto';
import { PublicRegisterDto } from './dto/public-register.dto';
import { AuthPayloadDto } from './dto/auth-payload.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { LoginStrategy, UserLoginDto } from './dto/user-login.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { RequestOtpDTo } from './dto/request-otp.dto';
import { RedisService } from '../redis/redis.service';
import { AdminDeleteUserDTO } from './dto/delete-admin.dto';
import { UserDeleteDto } from './dto/delete-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailerService,
    private readonly redisService: RedisService,
  ) {}

  async getUserById(id: string): Promise<UserProfileDto> {
    const user = await this.userRepo.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User with Id - ${id} not found!`);
    }

    return plainToInstance(UserProfileDto, user);
  }

  async getUsers(name?: string): Promise<UserProfileDto[]> {
    const cleanedName = name && name.trim() !== '' ? name.trim() : undefined;

    const users = await this.userRepo.find({
      where: cleanedName ? { name: ILike(`%${cleanedName}%`) } : {},
    });

    if (users.length === 0) throw new NotFoundException(`Users not found`);

    return plainToInstance(UserProfileDto, users);
  }

  async userRegister(userData: PublicRegisterDto): Promise<AuthPayloadDto> {
    const { name, email, password: inputPassword } = userData;

    const user = await this.userRepo.findOne({
      where: { email },
      withDeleted: true,
    });

    if (user) {
      throw new ConflictException(`User Email already in use`);
    }

    const hashedPassword = await this.hashPassword(inputPassword);

    const newUser = this.userRepo.create({
      name,
      email,
      password: hashedPassword,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    try {
      const savedUser = await this.userRepo.save(newUser);

      this.logger.log(`New user publicly registered successfully: ${email}`);

      return this.generateAuthPayload(savedUser);
    } catch (err: any) {
      this.logger.error(`❌ Registration failed for ${email}: ${err.message}`);
      if (err.code === '23505' || err.errno === 1062) {
        throw new ConflictException('Email address is already registered.');
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred during registration.',
      );
    }
  }

  async adminCreateUser(userData: AdminRegisterDto): Promise<UserProfileDto> {
    const { name, email, role } = userData;

    const user = await this.userRepo.findOne({
      where: { email },
      withDeleted: true,
    });

    if (user) {
      throw new ConflictException(`User Email already in use`);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const dummyPassword = crypto.randomBytes(16).toString('hex');
    const hashedDummyPassword = await this.hashPassword(dummyPassword);

    const newUser = this.userRepo.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedDummyPassword,
      role,
      status: UserStatus.PENDING,
      invitationToken: hashedToken,
      invitationExpiresAt: expiresAt,
    });

    try {
      const savedUser = await this.userRepo.save(newUser);

      const magicLink = `http://localhost:3000/auth/accept-invitation?token=${rawToken}`;

      await this.mailService.sendMail({
        to: savedUser.email,
        subject: `📦 Welcome! Complete Your Account Setup`,
        html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>Hello ${savedUser.name},</h2>
            <p>An administrator has generated a new profile for you as a <strong>${savedUser.role}</strong>.</p>
            <p>Please click the secure button below to choose your password and activate your workspace:</p>
            <div style="margin: 25px 0;">
              <a href="${magicLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Activate Account
              </a>
            </div>
            <p style="font-size: 12px; color: #777;">This single-use invitation link will remain valid for 48 hours.</p>
          </div>
          `,
      });

      return plainToInstance(UserProfileDto, savedUser);
    } catch (err: any) {
      if (err.code === '23505' || err.errno === 1062) {
        throw new ConflictException('Email address is already registered.');
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred during registration.',
      );
    }
  }

  async acceptInvitation(dto: AcceptInvitationDto): Promise<UserProfileDto> {
    const { token, password } = dto;

    const incomingHashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await this.userRepo.findOne({
      where: {
        invitationToken: incomingHashedToken,
        invitationExpiresAt: MoreThan(new Date()),
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        status: true,
        invitationToken: true,
        invitationExpiresAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invitation token is invalid or has expired.',
      );
    }

    user.password = await this.hashPassword(password);
    user.status = UserStatus.ACTIVE;

    user.invitationToken = null;
    user.invitationExpiresAt = null;

    const activatedUser = await this.userRepo.save(user);
    this.logger.log(
      `🔓 Account activated successfully via invitation link: ${user.email}`,
    );
    return plainToInstance(UserProfileDto, activatedUser);
  }

  async sendOTP(dto: RequestOtpDTo): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });

    if (!user || user.deletedAt) {
      this.logger.warn(
        `⚠️ OTP request skipped: Email "${dto.email}" not registered.`,
      );
      return;
    }

    const generateOTP = Math.floor(
      100000 + crypto.randomInt(900000),
    ).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    user.otpCode = generateOTP;
    user.otpExpiresAt = expiresAt;

    await this.userRepo.save(user);

    await this.mailService.sendMail({
      to: user.email,
      subject: '🔑 Your Security Verification OTP Code',
      html: `<h2>Hello,</h2><p>Your OTP code is: <strong>${generateOTP}</strong></p>`,
    });
  }

  async loginUser(userData: UserLoginDto): Promise<AuthPayloadDto> {
    const { email, password: inputPassword, strategy, otp } = userData;

    const user = await this.userRepo.findOne({
      where: { email },
      withDeleted: true,
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        status: true,
        deletedAt: true,
        otpCode: true,
        otpExpiresAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException(`Invalid email or Password credentials`);
    }

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        'Your account is pending activation. Please check your email.',
      );
    }

    switch (strategy) {
      case LoginStrategy.PASSWORD:
        const isPasswordValid = await this.verifyPassword(
          inputPassword!,
          user.password,
        );
        if (!isPasswordValid)
          throw new UnauthorizedException(`Invalid credentials.`);
        break;

      case LoginStrategy.OTP:
        const isOTPValid =
          user.otpCode === otp &&
          user.otpExpiresAt &&
          user.otpExpiresAt > new Date();

        if (!isOTPValid)
          throw new UnauthorizedException(`Invalid or expired OTP.`);

        user.otpCode = null;
        user.otpExpiresAt = null;
        await this.userRepo.save(user);
        break;

      default:
        throw new BadRequestException(`Invalid login Strategy`);
    }

    this.logger.log(
      `🔒 User successfully passed strategy verification [${strategy}]: ${email}`,
    );

    return this.generateAuthPayload(user);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = await bcrypt.hash(refreshToken, 10);

    await this.redisService.setRefreshToken(userId, hashedToken);
  }

  async refreshToken(
    userId: string,
    tokenToBeUsed: string,
  ): Promise<AuthPayloadDto> {
    const cachedHash = await this.redisService.getRefreshToken(userId);

    if (!cachedHash) {
      throw new ForbiddenException(
        'Access Denied. Session expired or compromise detected.',
      );
    }

    const isTokenMissing = await bcrypt.compare(tokenToBeUsed, cachedHash);

    if (!isTokenMissing) {
      await this.redisService.delRefreshToken(userId);
      this.logger.warn(
        `🛡️ Security Warning: Token reuse breach caught on user ${userId}. Invalidated all sessions.`,
      );
      throw new ForbiddenException('Access Denied. Token reuse detected.');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) throw new UnauthorizedException();

    this.logger.log(
      `🔄 Tokens successfully rotated via Redis tracking pipeline for user: ${user.email})`,
    );
    // ⭐ Generates brand-new token sets and automatically overwrites old keys in Redisreturn this.generateAuthPayload(user);}
    return this.generateAuthPayload(user);
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    await this.redisService.delRefreshToken(userId);
    try {
      const decoded = this.jwtService.decode(accessToken) as { exp: number };
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const remainingLifetime = decoded.exp - currentTimeInSeconds;
      if (remainingLifetime > 0) {
        await this.redisService.blacklistAccessToken(
          accessToken,
          remainingLifetime,
        );
      }
      this.logger.log(
        `🚪 User session killed and access token blacklisted for remaining ${remainingLifetime}s: ${userId}`,
      );
    } catch (err) {
      this.logger.error(
        `⚠️ Failed to parse access token expiration window during logout tracking.`,
      );
    }
  }

  async userDelete(
    userId: string,
    userPassword: UserDeleteDto,
    accessToken: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, password: true, deletedAt: true },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User Profile not found!`);
    }

    if (user.deletedAt) {
      throw new BadRequestException(`This account has already been deleted`);
    }

    const isPasswordValid = await this.verifyPassword(
      userPassword.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        `Incorrect password, Account deletion aborted.`,
      );
    }

    user.reason = 'Self-deleted by user';
    user.deletedBy = userId;

    await this.userRepo.save(user);
    await this.userRepo.softDelete(userId);

    await this.redisService.delRefreshToken(userId);
    try {
      const decoded = this.jwtService.decode(accessToken) as { exp: number };
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const remainingLifetime = decoded.exp - currentTimeInSeconds;

      if (remainingLifetime > 0) {
        await this.redisService.blacklistAccessToken(
          accessToken,
          remainingLifetime,
        );
      }

      this.logger.log(
        `🛡️ Account self-deleted. Access token blacklisted: ${userId}`,
      );
    } catch (err) {
      this.logger.error(
        `⚠️ Failed to blacklist access token during self-deletion.`,
      );
    }
  }

  async adminDeleteUser(
    userId: string,
    reason: string,
    adminId: string,
  ): Promise<void> {
    const targetUser = await this.userRepo.findOne({
      where: { id: userId },
      withDeleted: true,
    });

    if (!targetUser) {
      throw new NotFoundException(
        `The user you are trying to delete does not exists`,
      );
    }

    if (targetUser.deletedAt) {
      throw new BadRequestException(`This user account is already deleted.`);
    }

    if (userId === adminId) {
      throw new BadRequestException(
        `You cannot delete your own account via this route`,
      );
    }

    targetUser.reason = reason;
    targetUser.deletedBy = adminId;

    await this.userRepo.save(targetUser);
    await this.userRepo.softDelete(userId);

    await this.redisService.delRefreshToken(userId);
    this.logger.log(
      `🛡️ Admin evicted Redis refresh tokens for user: ${userId}`,
    );
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async generateAuthPayload(user: User): Promise<AuthPayloadDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    await this.updateRefreshToken(user.id, refreshToken);

    return plainToInstance(AuthPayloadDto, { accessToken, refreshToken, user });
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }

  private async verifyPassword(
    inputPassword: string,
    dbPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(inputPassword, dbPassword);
  }
}
