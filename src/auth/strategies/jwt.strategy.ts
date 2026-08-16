import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { Repository } from 'typeorm';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    const jwtSecret = configService.getOrThrow<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error(
        'Critical Configuration Error: JWT_SECRET environment variable is missing.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException(
        'Malformed authentication token metadata.',
      );
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Your session is invalid because your account has been deleted or deactivated.',
      );
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
