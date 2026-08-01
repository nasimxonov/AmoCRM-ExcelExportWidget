import { Module } from '@nestjs/common';
import { AccountModule } from '../accounts/account.module';
import { AmoCrmModule } from '../amocrm/amocrm.module';
import { AuthModule } from '../auth/auth.module';
import { MetaController } from './meta.controller';

@Module({
  imports: [AccountModule, AmoCrmModule, AuthModule],
  controllers: [MetaController],
})
export class MetaModule {}
