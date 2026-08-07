import { IOpenActivityService } from '@/services/IOpenActivityService';
import { createOpenActivityService } from '@/composition/activityComposition';

export interface PlatformServiceContainer {
  openActivity(): IOpenActivityService;
}

export class LazyPlatformServiceContainer implements PlatformServiceContainer {
  private _openActivityService?: IOpenActivityService | undefined;

  public openActivity(): IOpenActivityService {
    if (!this._openActivityService) {
      this._openActivityService = createOpenActivityService();
    }
    return this._openActivityService;
  }
}
