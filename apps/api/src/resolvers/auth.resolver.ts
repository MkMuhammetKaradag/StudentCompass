import { Inject } from '@nestjs/common';
import { Resolver, Query } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';

@Resolver('auth')
export class AuthResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: ClientProxy,
  ) {}
  @Query(() => String)
  async gethello() {
    // console.log('hello api');
    return 'hello';
  }
}
