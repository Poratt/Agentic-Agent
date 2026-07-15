import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentActionAuditLog, AuditAction } from '../entities/agent-action-audit-log.entity';

@Injectable()
export class AgentAuditService {
  private readonly logger = new Logger(AgentAuditService.name);

  constructor(
    @InjectRepository(AgentActionAuditLog)
    private readonly auditLogRepo: Repository<AgentActionAuditLog>,
  ) {}

  async log(params: {
    userId: number;
    actionType: AuditAction;
    functionName: string;
    sessionId: number;
    actionId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const entry = this.auditLogRepo.create({
        userId: params.userId,
        actionType: params.actionType,
        functionName: params.functionName,
        sessionId: params.sessionId,
        actionId: params.actionId,
        metadata: params.metadata ?? null,
      });
      await this.auditLogRepo.save(entry);
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${err}`);
    }
  }
}
