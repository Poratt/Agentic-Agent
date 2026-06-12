Read AGENTS.md first.
Read C:\Users\porat\.claude\rules\nestjs-rules.md.

Before editing, state:
1. NestJS change type: controller, service, DTO, module, entity, or test
2. target files
3. nearby NestJS example you found
4. verification command

Rules:
- Keep controllers thin.
- Put business logic in services.
- Use DTOs for request and response shapes.
- Add Swagger metadata for agent-facing endpoints.
- Protect private endpoints with the existing auth guard pattern.
- Do not expose raw SQL or unchecked user input.
- Keep changes surgical.

Verify:
- Run `npm.cmd run build` from `backend`.
- Run focused backend tests if behavior changed.
- Update `backend/swagger-spec.json` if endpoint/tool metadata changed.