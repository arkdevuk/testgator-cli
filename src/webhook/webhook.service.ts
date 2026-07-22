import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';

const SECTION = 'webhook';

/**
 * Configures testgator_server's outbound webhook integration
 * (`App\Services\WebhookService`) through the generic key-value `Settings`
 * resource (`/api/settings/{id}`, composite id `"{section}.{name}"`) — there
 * is no dedicated Webhook entity/endpoint. See testgator_server's
 * `Settings.php`/`WebhookService.php`:
 *   - `webhook.enable_webhook` — value must be the *string* "true"/"false".
 *   - `webhook.webhook_url` — value is the target URL; the server validates
 *     it with a SafeUrl constraint (SSRF guard) specifically for this id.
 *
 * `Settings` rows use a manually-assigned composite id rather than an
 * auto-increment one, so a row is not guaranteed to already exist on a
 * given instance. Every write here is therefore a PATCH-or-create upsert:
 * try PATCH first, and only fall back to POST when PATCH 404s (the row
 * doesn't exist yet).
 *
 * Write access to Settings requires ROLE_ADMIN server-side (`Post`/`Patch`
 * are both `security: "is_granted('ROLE_ADMIN')"`). A non-admin login gets
 * a 403, which is deliberately NOT special-cased here — it propagates as a
 * normal ApiClientError, same as every other write command, and the CLI
 * exits non-zero with the server's message. That's the "must crash if the
 * user has insufficient access" behavior the task asked for.
 */
@Injectable()
export class WebhookService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  enable(): Promise<Record<string, unknown>> {
    return this.upsertSetting('enable_webhook', 'true');
  }

  disable(): Promise<Record<string, unknown>> {
    return this.upsertSetting('enable_webhook', 'false');
  }

  setUrl(url: string): Promise<Record<string, unknown>> {
    return this.upsertSetting('webhook_url', url);
  }

  private async upsertSetting(
    name: string,
    value: string,
  ): Promise<Record<string, unknown>> {
    const id = `${SECTION}.${name}`;

    try {
      const raw = await this.apiClient.patch<Record<string, unknown>>(
        `/api/settings/${id}`,
        { value },
      );
      return this.hydra.shapeItem(raw);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        const raw = await this.apiClient.post<Record<string, unknown>>(
          '/api/settings',
          {
            section: SECTION,
            name,
            value,
            autoload: false,
            // Webhook config is admin-only operational config, not
            // something non-admin users/testers should be able to read —
            // see Settings.php's TesterScopeExtension, which limits
            // non-admins to public=true rows.
            public: false,
          },
        );
        return this.hydra.shapeItem(raw);
      }

      throw error;
    }
  }
}
