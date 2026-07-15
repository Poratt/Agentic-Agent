// FILE: src/modules/admin-agent/services/swagger-tools.parser.ts

import { Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fs from 'fs';
import { REQUIRES_CONFIRMATION_KEY } from '../decorators/requires-confirmation.decorator';

interface LlmToolFunctionSchema {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface LlmToolSchema {
  type: 'function';
  function?: LlmToolFunctionSchema;
}

@Injectable()
export class SwaggerToolsParser {
  private readonly logger = new Logger(SwaggerToolsParser.name);
  private swaggerTools: LlmToolSchema[] = [];
  private requiresConfirmationOps = new Set<string>();

  private swaggerEndpointsMap = new Map<
    string,
    {
      path: string;
      method: string;
      summary?: string;
      toolIcon?: string;
      genUiSpec?: string;
      requiresConfirmation?: boolean;
    }
  >();

  private swaggerSpecMtimeMs = 0;

  constructor(private readonly reflector: Reflector) {
    this.loadSwaggerAsTools();
  }

  getTools(): LlmToolSchema[] {
    this.refreshSwaggerToolsIfChanged();

    return this.swaggerTools.map((t) => {
      const params = t.function?.parameters;

      const cleaned = this.cleanSchema(params);
      const sanitized = this.sanitizeJson(cleaned);
      const finalParams = this.filterRequired(sanitized);

      return {
        ...t,
        function: {
          ...t.function,
          parameters: finalParams ?? {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
      } as LlmToolSchema;
    });
  }

  getEndpoint(operationId: string) {
    this.refreshSwaggerToolsIfChanged();

    return this.swaggerEndpointsMap.get(operationId);
  }

  requiresConfirmation(operationId: string): boolean {
    return this.requiresConfirmationOps.has(operationId);
  }

  resolveArguments(
    path: string,
    method: string,
    args: Record<string, any>,
    baseUrl: string,
  ) {
    let targetUrl = `${baseUrl}${path}`;
    const body: Record<string, any> = {};
    const queryParams: Record<string, any> = {};

    for (const [key, value] of Object.entries(args || {})) {
      if (path.includes(`{${key}}`)) {
        targetUrl = targetUrl.replace(`{${key}}`, String(value));
      } else if (method.toLowerCase() === 'get') {
        queryParams[key] = value;
      } else {
        body[key] = value;
      }
    }

    return { targetUrl, body, queryParams };
  }

  private dereference(schema: any, components: any, visited = new Set<string>()): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    if (Array.isArray(schema)) {
      return schema.map((item) => {
        return this.dereference(item, components, new Set(visited));
      });
    }

    if (schema.$ref && typeof schema.$ref === 'string') {
      const schemaName = schema.$ref.split('/').pop();
      if (!schemaName) {
        return { type: 'string' };
      }

      if (visited.has(schemaName)) {
        return { type: 'object', properties: {}, additionalProperties: false };
      }

      const resolved = components?.[schemaName];

      if (resolved) {
        const nextVisited = new Set(visited);
        nextVisited.add(schemaName);
        return this.dereference(resolved, components, nextVisited);
      }

      return { type: 'string' };
    }

    const dereferenced: any = {};
    for (const [key, value] of Object.entries(schema)) {
      dereferenced[key] = this.dereference(value, components, new Set(visited));
    }

    return dereferenced;
  }

  private hasRef(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    if (Array.isArray(obj)) {
      return obj.some((item) => this.hasRef(item));
    }

    if ('$ref' in obj) {
      return true;
    }

    return Object.values(obj).some((val) => this.hasRef(val));
  }

  private cleanSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    if (Array.isArray(schema)) {
      return schema.map((item) => this.cleanSchema(item));
    }

    const cleaned: any = { ...schema };

    if (cleaned.type === 'object' && !('additionalProperties' in cleaned)) {
      cleaned.additionalProperties = false;
    }

    if (cleaned.properties && typeof cleaned.properties === 'object') {
      const nextProperties: Record<string, any> = {};

      for (const [key, value] of Object.entries(cleaned.properties)) {
        if (this.hasRef(value)) {
          this.logger.warn(`Property "${key}" has unresolved $ref. Fallback to generic object.`);
          nextProperties[key] = { type: 'object', description: 'Generic object data', additionalProperties: false };
          continue;
        }

        const cleanedValue = this.cleanSchema(value);
        if (cleanedValue !== undefined) {
          nextProperties[key] = cleanedValue;
        }
      }

      cleaned.properties = nextProperties;
    }

    if (cleaned.items && typeof cleaned.items === 'object') {
      if (this.hasRef(cleaned.items)) {
        delete cleaned.items;
      } else {
        cleaned.items = this.cleanSchema(cleaned.items);
      }
    }

    const compositions = ['allOf', 'anyOf', 'oneOf'];
    for (const comp of compositions) {
      if (Array.isArray(cleaned[comp])) {
        cleaned[comp] = cleaned[comp]
          .filter((s: any) => !this.hasRef(s))
          .map((s: any) => this.cleanSchema(s));

        if (cleaned[comp].length === 0) {
          delete cleaned[comp];
        }
      }
    }

    return cleaned;
  }

  private sanitizeJson(obj: any): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeJson(item)).filter((item) => item !== undefined);
    }
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitized = this.sanitizeJson(value);
        if (sanitized !== undefined && sanitized !== null) {
          result[key] = sanitized;
        }
      }
      return result;
    }
    return obj;
  }

  private filterRequired(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    if (Array.isArray(schema)) {
      return schema.map((item) => this.filterRequired(item));
    }

    const result = { ...schema };

    if (result.properties && typeof result.properties === 'object') {
      const nextProperties: Record<string, any> = {};
      for (const [key, value] of Object.entries(result.properties)) {
        nextProperties[key] = this.filterRequired(value);
      }
      result.properties = nextProperties;

      if (Array.isArray(result.required)) {
        const filtered = result.required.filter((k: string) => {
          return (
            nextProperties[k] !== undefined &&
            nextProperties[k] !== null &&
            Object.prototype.hasOwnProperty.call(nextProperties, k)
          );
        });

        if (filtered.length > 0) {
          result.required = filtered;
        } else {
          delete result.required;
        }
      }
    } else {
      if ('required' in result) {
        delete result.required;
      }
    }

    if (result.items && typeof result.items === 'object') {
      result.items = this.filterRequired(result.items);
    }

    const compositions = ['allOf', 'anyOf', 'oneOf'];
    for (const comp of compositions) {
      if (Array.isArray(result[comp])) {
        result[comp] = result[comp].map((item: any) => this.filterRequired(item));
      }
    }

    return result;
  }

  private loadSwaggerAsTools() {
    try {
      const swaggerPath = './swagger-spec.json';
      if (!fs.existsSync(swaggerPath)) {
        return;
      }

      const fileContent = fs.readFileSync(swaggerPath, 'utf8');
      if (!fileContent.trim()) {
        return;
      }

      let swagger;
      try {
        swagger = JSON.parse(fileContent);
      } catch (e) {
        this.logger.warn(
          'Failed to parse swagger-spec.json (might be in the middle of being written). Keeping previous tools.'
        );
        return;
      }

      this.swaggerSpecMtimeMs = fs.statSync(swaggerPath).mtimeMs;
      const tools: LlmToolSchema[] = [];
      const schemas = swagger.components?.schemas || {};

      for (const [path, pathObj] of Object.entries(swagger.paths)) {
        for (const [method, operationObj] of Object.entries(pathObj as any)) {
          const op = operationObj as any;
          if (!op.operationId) {
            continue;
          }

          const requiresConfirmation = op['x-requires-confirmation'] === true;

          this.swaggerEndpointsMap.set(op.operationId, {
            path,
            method,
            summary: op.summaryHe || op.summary,
            toolIcon: op.toolIcon,
            genUiSpec: op.genUiSpec,
            requiresConfirmation,
          });

          if (requiresConfirmation) {
            this.requiresConfirmationOps.add(op.operationId);
          }

          const properties: Record<string, any> = {};
          const requiredFields: string[] = [];

          if (op.parameters) {
            for (const param of op.parameters) {
              const resolvedParamSchema = this.dereference(param.schema, schemas);

              properties[param.name] = {
                type: 'string',
                ...resolvedParamSchema,
                description: param.description || resolvedParamSchema?.description || `${param.name} parameter`,
              };

              if (param.required) {
                requiredFields.push(param.name);
              }
            }
          }

          const requestBodySchema = op.requestBody?.content?.['application/json']?.schema;
          if (requestBodySchema) {
            const resolvedBody = this.dereference(requestBodySchema, schemas);

            if (resolvedBody.properties) {
              for (const [propName, propSchema] of Object.entries(resolvedBody.properties)) {
                properties[propName] = propSchema;
              }
              if (Array.isArray(resolvedBody.required)) {
                requiredFields.push(...resolvedBody.required);
              }
            }
          }

          const normalizedRequired = Array.from(new Set(requiredFields)).filter((k) => {
            return Object.prototype.hasOwnProperty.call(properties, k);
          });

          tools.push({
            type: 'function',
            function: {
              name: op.operationId,
              description: [
                op.summaryHe || op.summary,
                op.description,
                op.genUiSpec ? `AGENT_INSTRUCTION: ${op.genUiSpec}` : null,
              ].filter(Boolean).join('\n'),
              parameters: {
                type: 'object',
                properties,
                ...(normalizedRequired.length ? { required: normalizedRequired } : {}),
                additionalProperties: false,
              },
            },
          });
        }
      }

      this.swaggerTools = tools;
      this.logger.log(`Successfully auto-loaded ${this.swaggerTools.length} tools from Swagger Spec! 🚀`);
    } catch (error) {
      this.logger.error('Failed to parse swagger-spec.json as AI tools', error);
    }
  }

  private refreshSwaggerToolsIfChanged(): void {
    const swaggerPath = './swagger-spec.json';
    if (!fs.existsSync(swaggerPath)) {
      return;
    }

    const mtimeMs = fs.statSync(swaggerPath).mtimeMs;
    if (mtimeMs !== this.swaggerSpecMtimeMs) {
      this.loadSwaggerAsTools();
    }
  }
}