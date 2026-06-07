import { ApiOperationOptions } from '@nestjs/swagger';

export type CustomApiOperationOptions = ApiOperationOptions & {
  summaryHe?: string;
  toolIcon?: string;
  genUiSpec?: string;


};
