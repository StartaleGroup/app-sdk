import { ActionType, AnalyticsEventImportance, ComponentType, logEvent } from '../logEvent.js';

export const logRequestStarted = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'provider.request.started',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      signerType: 'app-sdk',
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestError = ({
  method,
  correlationId,
  errorMessage,
}: {
  method: string;
  correlationId: string | undefined;
  errorMessage: string;
}) => {
  logEvent(
    'provider.request.error',
    {
      action: ActionType.error,
      componentType: ComponentType.unknown,
      method,
      signerType: 'app-sdk',
      correlationId,
      errorMessage,
    },
    AnalyticsEventImportance.high
  );
};

export const logRequestResponded = ({
  method,
  correlationId,
}: {
  method: string;
  correlationId: string | undefined;
}) => {
  logEvent(
    'provider.request.responded',
    {
      action: ActionType.unknown,
      componentType: ComponentType.unknown,
      method,
      signerType: 'app-sdk',
      correlationId,
    },
    AnalyticsEventImportance.high
  );
};
