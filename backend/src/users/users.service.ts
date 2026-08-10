import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './create-user.dto';
import { PublicUser } from './public-user.type';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const { email, password, name, documentType, documentNumber } =
      createUserDto;

    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      if (existingUser.passwordHash === null) {
        // User entity exists without defined password. Allow user to claim the entity
        return this.claimAccount(email, password);
      } else {
        throw new ConflictException('User already exists.');
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        documentType,
        documentNumber,
      },
    });

    return this.mapUserToPublicUser(user);
  }

  async claimAccount(email: string, password: string): Promise<PublicUser> {
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new ConflictException('User not found.');
    }

    if (user.passwordHash !== null) {
      throw new ConflictException('User already has password. Cannot claim.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updatedUser = await this.prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    return this.mapUserToPublicUser(updatedUser);
  }

  async getPublicUserIfValidCredentials(
    email: string,
    password: string,
  ): Promise<PublicUser | null> {
    const user = await this.findUserByEmail(email);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? this.mapUserToPublicUser(user) : null;
  }

  async findPublicUserById(id: string): Promise<PublicUser | null> {
    const user = await this.findUserById(id);
    return user ? this.mapUserToPublicUser(user) : null;
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  private async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  private mapUserToPublicUser(user: User): PublicUser {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
