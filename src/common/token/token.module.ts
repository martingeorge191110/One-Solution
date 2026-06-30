import { Global, Module } from '@nestjs/common';
import { TokenService } from './token.service';

/** Global so the auth guard (registered app-wide) and AuthService can inject it. */
@Global()
@Module({
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
