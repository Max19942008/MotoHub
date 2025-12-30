import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver } from "@nestjs/apollo";
import { DatabaseModule } from "./database/database.mudule";
import { AppResolver } from "./app.resolver";
import { ComponentsModule } from "./components/components.module";
import { T } from "./libs/types/common";
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      playground: true,
      uploads: false,
      autoSchemaFile: true,
      formatError: (error: T) => {
        const graphQLFormattedError = {
          code: error?.extensions.code,
          message:
            error?.extensions?.exceptions?.response?.message ||
            error?.extensions?.response?.message ||
            error?.message,
        };
        console.log("GRAPHQL GLOBAL ERR:", graphQLFormattedError);
        return graphQLFormattedError;
      },
    }),
    DatabaseModule,
    ComponentsModule,
    SocketModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
