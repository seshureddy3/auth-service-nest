import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AleService } from './ale.service';

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  constructor(private readonly cryptoService: AleService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (
      request.body &&
      request.body.encryptedKey &&
      request.body.payload &&
      request.body.iv
    ) {
      try {
        const aesKey = this.cryptoService.decryptSessionKey(
          request.body.encryptedKey,
        );
        const originalIv = request.body.iv; // Save IV before replacing body

        const decryptedBody = this.cryptoService.decryptPayload(
          request.body.payload,
          aesKey,
          originalIv,
        );

        request.body = decryptedBody; // Overwrite encrypted body with clean JSON
        request.aesKey = aesKey; // Save for encrypting the response later
        request.aesIv = originalIv;
      } catch (error) {
        throw new BadRequestException('Failed to decrypt payload.');
      }
    }

    return next.handle().pipe(
      map((responseData) => {
        if (request.aesKey && request.aesIv) {
          const encryptedResponse = this.cryptoService.encryptPayload(
            responseData,
            request.aesKey,
            request.aesIv,
          );
          return { payload: encryptedResponse };
        }
        return responseData;
      }),
    );
  }
}
