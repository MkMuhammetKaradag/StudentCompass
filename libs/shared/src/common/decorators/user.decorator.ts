import { AuthenticatedRequest } from '@app/shared/Type/request/authenticatedRequest';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedRequest['user'] | undefined,
    context: ExecutionContext,
  ) => {
    const { user } = GqlExecutionContext.create(context).getContext()
      .req as AuthenticatedRequest;

    return data ? user?.[data] : user;
  },
);
