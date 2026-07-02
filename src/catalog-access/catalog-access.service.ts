import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CatalogActor } from '../auth/catalog-auth.guard';
import { CatalogUserSettings } from './catalog-user-settings.entity';

export type CatalogSourceSettings = {
  userId: string;
  includeAlfaresCatalog: boolean;
  includeCommunityCatalog: boolean;
  sourceApplication: string | null;
  created?: boolean;
};

export type UpdateCatalogSettingsDto = {
  includeAlfaresCatalog?: boolean;
  includeCommunityCatalog?: boolean;
  sourceApplication?: string | null;
};

@Injectable()
export class CatalogAccessService {
  constructor(
    @InjectRepository(CatalogUserSettings)
    private readonly settingsRepository: Repository<CatalogUserSettings>,
  ) {}

  async ensureSettings(actor: CatalogActor, sourceApplication?: string | null): Promise<CatalogSourceSettings> {
    const userId = this.requireHumanUser(actor);
    const existing = await this.settingsRepository.findOne({ where: { userId } });
    if (existing) {
      if (sourceApplication && existing.sourceApplication !== sourceApplication) {
        existing.sourceApplication = this.cleanSourceApplication(sourceApplication);
        const saved = await this.settingsRepository.save(existing);
        return this.toSettings(saved, false);
      }
      return this.toSettings(existing, false);
    }

    const created = this.settingsRepository.create({
      userId,
      includeAlfaresCatalog: false,
      includeCommunityCatalog: false,
      sourceApplication: this.cleanSourceApplication(sourceApplication),
    });
    return this.toSettings(await this.settingsRepository.save(created), true);
  }

  async getSettings(actor: CatalogActor): Promise<CatalogSourceSettings> {
    const userId = this.requireHumanUser(actor);
    const existing = await this.settingsRepository.findOne({ where: { userId } });
    if (existing) {
      return this.toSettings(existing, false);
    }
    return this.ensureSettings(actor);
  }

  async updateSettings(actor: CatalogActor, update: UpdateCatalogSettingsDto): Promise<CatalogSourceSettings> {
    const userId = this.requireHumanUser(actor);
    const existing = await this.settingsRepository.findOne({ where: { userId } });
    const settings = existing ?? this.settingsRepository.create({
      userId,
      includeAlfaresCatalog: false,
      includeCommunityCatalog: false,
      sourceApplication: null,
    });

    if (typeof update.includeAlfaresCatalog === 'boolean') {
      settings.includeAlfaresCatalog = update.includeAlfaresCatalog;
    }
    if (typeof update.includeCommunityCatalog === 'boolean') {
      settings.includeCommunityCatalog = update.includeCommunityCatalog;
    }
    if (Object.prototype.hasOwnProperty.call(update, 'sourceApplication')) {
      settings.sourceApplication = this.cleanSourceApplication(update.sourceApplication);
    }

    return this.toSettings(await this.settingsRepository.save(settings), !existing);
  }

  defaultSettings(actor?: CatalogActor): CatalogSourceSettings {
    return {
      userId: actor?.sub ?? 'anonymous',
      includeAlfaresCatalog: false,
      includeCommunityCatalog: false,
      sourceApplication: null,
      created: false,
    };
  }

  private requireHumanUser(actor?: CatalogActor): string {
    if (!actor || actor.type !== 'jwt' || !actor.sub) {
      throw new ForbiddenException('Catalog source settings require an authenticated user.');
    }
    return actor.sub;
  }

  private toSettings(settings: CatalogUserSettings, created: boolean): CatalogSourceSettings {
    return {
      userId: settings.userId,
      includeAlfaresCatalog: settings.includeAlfaresCatalog === true,
      includeCommunityCatalog: settings.includeCommunityCatalog === true,
      sourceApplication: settings.sourceApplication ?? null,
      created,
    };
  }

  private cleanSourceApplication(value?: string | null): string | null {
    const cleaned = String(value ?? '').trim().slice(0, 100);
    return cleaned || null;
  }
}
