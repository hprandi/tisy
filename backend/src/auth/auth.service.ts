import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/create-user.dto';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    const isPasswordValid = await this.usersService.validatePassword(
      user,
      password,
    );

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user.id, user.email);
  }

  async register(createUserDto: CreateUserDto) {
    await this.usersService.create(createUserDto);

    return this.login(createUserDto.email, createUserDto.password);
  }

  private buildAuthResponse(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
