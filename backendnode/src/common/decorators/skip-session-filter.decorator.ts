import { SetMetadata } from '@nestjs/common';

export const SKIP_SESSION_FILTER_KEY = 'skipSessionFilter';

export const SkipSessionFilter = () =>
  SetMetadata(SKIP_SESSION_FILTER_KEY, true);
