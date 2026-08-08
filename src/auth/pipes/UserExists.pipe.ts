import {
  ArgumentMetadata,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

export class UserExistsPipe implements PipeTransform {
  constructor(private readonly authService: AuthService) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    try {
      await this.authService.getUserById(value);
    } catch (err: any) {
      throw new NotFoundException(`User with id - ${value} not found!`);
    }

    return value;
  }
}
