import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { PropertyModule } from './property/property.module';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';
import { LikeModule } from './like/like.module';
import { ViewModule } from './view/view.module';
import { BoardArticleModule } from './board-article/board-article.module';


@Module({
  imports: [
    MemberModule, 
    PropertyModule,
    AuthModule,
    CommentModule, 
    LikeModule, 
    ViewModule, 
    BoardArticleModule],
  providers: []
})
export class ComponentsModule {}
