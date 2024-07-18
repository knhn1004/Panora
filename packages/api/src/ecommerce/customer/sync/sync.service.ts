import { LoggerService } from '@@core/@core-services/logger/logger.service';
import { PrismaService } from '@@core/@core-services/prisma/prisma.service';
import { BullQueueService } from '@@core/@core-services/queues/shared.service';
import { CoreSyncRegistry } from '@@core/@core-services/registries/core-sync.registry';
import { CoreUnification } from '@@core/@core-services/unification/core-unification.service';
import { IngestDataService } from '@@core/@core-services/unification/ingest-data.service';
import { WebhookService } from '@@core/@core-services/webhooks/panora-webhooks/webhook.service';
import { FieldMappingService } from '@@core/field-mapping/field-mapping.service';
import { IBaseSync, SyncLinkedUserType } from '@@core/utils/types/interface';
import { OriginalCustomerOutput } from '@@core/utils/types/original/original.ecommerce';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ATS_PROVIDERS } from '@panora/shared';
import { v4 as uuidv4 } from 'uuid';
import { ServiceRegistry } from '../services/registry.service';
import { ICustomerService } from '../types';
import { UnifiedCustomerOutput } from '../types/model.unified';

@Injectable()
export class SyncService implements OnModuleInit, IBaseSync {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private webhook: WebhookService,
    private fieldMappingService: FieldMappingService,
    private serviceRegistry: ServiceRegistry,
    private coreUnification: CoreUnification,
    private registry: CoreSyncRegistry,
    private bullQueueService: BullQueueService,
    private ingestService: IngestDataService,
  ) {
    this.logger.setContext(SyncService.name);
    this.registry.registerService('ecommerce', 'customer', this);
  }

  async onModuleInit() {
    try {
      await this.bullQueueService.queueSyncJob(
        'ecommerce-sync-customers',
        '0 0 * * *',
      );
    } catch (error) {
      throw error;
    }
  }

  @Cron('0 */8 * * *') // every 8 hours
  async kickstartSync(user_id?: string) {
    try {
      this.logger.log('Syncing customers...');
      const users = user_id
        ? [
            await this.prisma.users.findUnique({
              where: {
                id_user: user_id,
              },
            }),
          ]
        : await this.prisma.users.findMany();
      if (users && users.length > 0) {
        for (const user of users) {
          const projects = await this.prisma.projects.findMany({
            where: {
              id_user: user.id_user,
            },
          });
          for (const project of projects) {
            const id_project = project.id_project;
            const linkedUsers = await this.prisma.linked_users.findMany({
              where: {
                id_project: id_project,
              },
            });
            linkedUsers.map(async (linkedUser) => {
              try {
                const providers = ECOMMERCE_PROVIDERS;
                for (const provider of providers) {
                  try {
                    await this.syncForLinkedUser({
                      integrationId: provider,
                      linkedUserId: linkedUser.id_linked_user,
                    });
                  } catch (error) {
                    throw error;
                  }
                }
              } catch (error) {
                throw error;
              }
            });
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async syncForLinkedUser(param: SyncLinkedUserType) {
    try {
      const { integrationId, linkedUserId } = param;
      const service: ICustomerService =
        this.serviceRegistry.getService(integrationId);
      if (!service) return;

      await this.ingestService.syncForLinkedUser<
        UnifiedCustomerOutput,
        OriginalCustomerOutput,
        ICustomerService
      >(integrationId, linkedUserId, 'ecommerce', 'customer', service, []);
    } catch (error) {
      throw error;
    }
  }

  async saveToDb(
    connection_id: string,
    linkedUserId: string,
    customers: UnifiedCustomerOutput[],
    originSource: string,
    remote_data: Record<string, any>[],
  ): Promise<EcommerceCustomer[]> {
    try {
      const customers_results: EcommerceCustomer[] = [];

      const updateOrCreateCustomer = async (
        customer: UnifiedCustomerOutput,
        originId: string,
      ) => {
        let existingCustomer;
        if (!originId) {
          existingCustomer = await this.prisma.ecommerce_customers.findFirst({
            where: {
              name: customer.name,
              id_connection: connection_id,
            },
          });
        } else {
          existingCustomer = await this.prisma.ecommerce_customers.findFirst({
            where: {
              remote_id: originId,
              id_connection: connection_id,
            },
          });
        }

        const baseData: any = {
          name: customer.name ?? null,
          modified_at: new Date(),
        };

        if (existingCustomer) {
          return await this.prisma.ecommerce_customers.update({
            where: {
              id_ecommerce_customer: existingCustomer.id_ecommerce_customer,
            },
            data: baseData,
          });
        } else {
          return await this.prisma.ecommerce_customers.create({
            data: {
              ...baseData,
              id_ecommerce_customer: uuidv4(),
              created_at: new Date(),
              remote_id: originId,
              id_connection: connection_id,
            },
          });
        }
      };

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        const originId = customer.remote_id;

        const res = await updateOrCreateCustomer(customer, originId);
        const customer_id = res.id_ecommerce_customer;
        customers_results.push(res);

        // Process field mappings
        await this.ingestService.processFieldMappings(
          customer.field_mappings,
          customer_id,
          originSource,
          linkedUserId,
        );

        // Process remote data
        await this.ingestService.processRemoteData(customer_id, remote_data[i]);
      }

      return customers_results;
    } catch (error) {
      throw error;
    }
  }
}
