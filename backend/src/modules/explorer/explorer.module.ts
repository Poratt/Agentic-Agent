// FILE: src/modules/explorer/explorer.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExplorerController } from './explorer.controller';
import { ExplorerService } from './explorer.service';
import { User } from '../users/entities/user.entity';
import { ChatSession } from '../admin-agent/entities/chat-session.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User, ChatSession]),
  ],
  controllers: [ExplorerController],
  providers: [ExplorerService],
  exports: [ExplorerService],
})
export class ExplorerModule { }