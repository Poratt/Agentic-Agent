npm start run:dev

> backend@0.0.1 start
> nest start run:dev

src/core/seeds/user.seed.ts:3:26 - error TS2307: Cannot find module '../core/enums/user-role.enum' or its corresponding type declarations.

3 import { UserRole } from '../core/enums/user-role.enum';
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
src/core/seeds/user.seed.ts:4:22 - error TS2307: Cannot find module '../modules/users/entities/user.entity' or its corresponding type declarations.

4 import { User } from '../modules/users/entities/user.entity';
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
src/modules/auth/auth.controller.ts:47:65 - error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.

47   login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
                                                                   ~~~~~~~~

  src/modules/auth/auth.controller.ts:2:10
    2 import { Response } from 'express';
               ~~~~~~~~
    'Response' was imported here.
src/modules/auth/auth.controller.ts:61:23 - error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.

61   refresh(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
                         ~~~~~~~~~~~~~~~

  src/modules/auth/auth.controller.ts:18:10
    18 import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
                ~~~~~~~~~~~~~~~
    'RequestWithUser' was imported here.
src/modules/auth/auth.controller.ts:61:73 - error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.

61   refresh(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
                                                                           ~~~~~~~~

  src/modules/auth/auth.controller.ts:2:10
    2 import { Response } from 'express';
               ~~~~~~~~
    'Response' was imported here.
src/modules/auth/auth.controller.ts:79:22 - error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.

79   logout(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
                        ~~~~~~~~~~~~~~~

  src/modules/auth/auth.controller.ts:18:10
    18 import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
                ~~~~~~~~~~~~~~~
    'RequestWithUser' was imported here.
src/modules/auth/auth.controller.ts:79:72 - error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.

79   logout(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
                                                                          ~~~~~~~~

  src/modules/auth/auth.controller.ts:2:10
    2 import { Response } from 'express';
               ~~~~~~~~
    'Response' was imported here.
src/modules/auth/auth.controller.ts:96:18 - error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.

96   me(@Req() req: RequestWithUser) {
                    ~~~~~~~~~~~~~~~

  src/modules/auth/auth.controller.ts:18:10
    18 import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
                ~~~~~~~~~~~~~~~
    'RequestWithUser' was imported here.
src/modules/users/users.controller.ts:49:18 - error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.

49   me(@Req() req: Request) {
                    ~~~~~~~

  src/modules/users/users.controller.ts:2:10
    2 import { Request } from 'express';
               ~~~~~~~
    'Request' was imported here.
src/modules/users/users.service.ts:14:7 - error TS2559: Type 'string[]' has no properties in common with type 'FindOptionsSelect<User>'.

14       select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt', 'lastLoginAt'],
         ~~~~~~
src/modules/users/users.service.ts:29:7 - error TS2559: Type 'string[]' has no properties in common with type 'FindOptionsSelect<User>'.

29       select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt', 'lastLoginAt'],
         ~~~~~~

  node_modules/typeorm/find-options/FindOneOptions.d.ts:18:5
    18     select?: FindOptionsSelect<Entity>;
           ~~~~~~
    The expected type comes from property 'select' which is declared here on type 'FindOneOptions<User>'
src/modules/users/users.service.ts:48:7 - error TS2559: Type 'string[]' has no properties in common with type 'FindOptionsSelect<User>'.

48       select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt'],
         ~~~~~~

  node_modules/typeorm/find-options/FindOneOptions.d.ts:18:5
    18     select?: FindOptionsSelect<Entity>;
           ~~~~~~
    The expected type comes from property 'select' which is declared here on type 'FindOneOptions<User>'
src/modules/users/users.service.ts:67:7 - error TS2559: Type 'string[]' has no properties in common with type 'FindOptionsSelect<User>'.

67       select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt'],
         ~~~~~~

  node_modules/typeorm/find-options/FindOneOptions.d.ts:18:5
    18     select?: FindOptionsSelect<Entity>;
           ~~~~~~
    The expected type comes from property 'select' which is declared here on type 'FindOneOptions<User>'

Found 13 error(s).

PS C:\Porat\Practice\ai\agentic_admin\backend> 