import { Module } from '@nestjs/common';
import { AccountModule } from '../accounts/account.module';
import { AmoCrmAccountClient } from './amocrm-account.client';
import { AmoCrmAccountBootstrapService } from './amocrm-account-bootstrap.service';
import { AmoCrmTokenProvider } from './amocrm-token.provider';
import { AmoCrmHttpClient } from './amocrm-http.client';
import { AmoCrmPaginator } from './amocrm-paginator';
import { ReferenceDataService } from './reference-data.service';
import { EntityRefResolverService } from './entity-ref-resolver.service';
import { NotesService } from './notes.service';
import { LeadsRepository } from './repositories/leads.repository';
import { ContactsRepository } from './repositories/contacts.repository';
import { CompaniesRepository } from './repositories/companies.repository';

@Module({
  imports: [AccountModule],
  providers: [
    AmoCrmAccountClient,
    AmoCrmAccountBootstrapService,
    AmoCrmTokenProvider,
    AmoCrmHttpClient,
    AmoCrmPaginator,
    ReferenceDataService,
    EntityRefResolverService,
    NotesService,
    LeadsRepository,
    ContactsRepository,
    CompaniesRepository,
  ],
  exports: [
    AmoCrmTokenProvider,
    AmoCrmHttpClient,
    ReferenceDataService,
    NotesService,
    LeadsRepository,
    ContactsRepository,
    CompaniesRepository,
  ],
})
export class AmoCrmModule {}
