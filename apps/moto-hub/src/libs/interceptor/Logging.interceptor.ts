import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { stringify } from "querystring";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger();

  public intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<any> {
    const recordTime = Date.now();
    const requestType = context.getType<GqlContextType>();

    if (requestType === "http") {
      // Develop if needed
      return next.handle().pipe();
    } else if (requestType === "graphql") {
      /** (1) Print Request **/
      const gqlContext = GqlExecutionContext.create(context);
      this.logger.log(
        `${this.stringify(gqlContext.getContext().req.body)}`,
        "REQUEST"
      );

      /** (2) Error handling vis GraphQL **/

      /** (3) No Errors giving Response  **/
      return next.handle().pipe(
        tap((context) => {
          const responseTime = Date.now() - recordTime;
          this.logger.log(
            `${this.stringify(context)}  ${responseTime}ms \n\n`,
            "RESPONSE"
          );
        })
      );
    }
  }
  /**
   * Request bodies carry plaintext passwords and responses carry freshly minted
   * tokens. Container logs outlive the request, so those values are masked
   * before anything is written.
   */
  private static readonly SECRET_KEYS = ["memberPassword", "accessToken", "refreshToken", "authorization"];

  private stringify(context: ExecutionContext): string {
    return JSON.stringify(context, (key, value) =>
      LoggingInterceptor.SECRET_KEYS.includes(key) ? "***" : value,
    ).slice(0, 75);
  }
}
