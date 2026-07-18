import { Module } from '@nestjs/common';
import { McpBridgeService } from './mcp-bridge.service';

@Module({
  providers: [McpBridgeService],
  exports: [McpBridgeService],
})
export class McpBridgeModule {}
