import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // TOOD: Should we never expose the full user outisde of this service?
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // TOOD: Should we a have PublicUserInfo dto? Seems like this should also be typed
  async findPublicById(id: string) {
    const user = await this.findById(id);
    return user ? this.publicUserInfo(user) : null;
  }

  async create(createUserDto: CreateUserDto) {
      const { email, password, name, documentType, documentNumber } =
    createUserDto;

    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      if (existingUser.passwordHash === null) {
        // User entity exists, but without password. Allow user to claim the entity
        return this.claimAccount(email, password);
      } else {
        throw new ConflictException(
          'User already exists.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        documentType,
        documentNumber,
      },
    });

    return this.publicUserInfo(user);
  }

  async claimAccount(email: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new ConflictException('User not found.');
    }

    if (user.passwordHash !== null) {
      throw new ConflictException(
        'User already has password. Cannot claim.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    return this.publicUserInfo(updatedUser);
  }

  async validatePassword(user: User | null, password: string): Promise<boolean> {
    if (!user || !user.passwordHash) {
      return false;
    }

    return bcrypt.compare(password, user.passwordHash);
  }

  private publicUserInfo(user: any) {
    const { passwordHash, ...result } = user;
    return result;
  }
}
