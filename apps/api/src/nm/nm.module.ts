import { Global, Module } from '@nestjs/common';
import { NmService } from './nm.service';

// @Global() para no tener que importarlo en cada módulo. La integración
// con Nuestro Momento es transversal (matches + admin) y stateless.
@Global()
@Module({
  providers: [NmService],
  exports: [NmService],
})
export class NmModule {}
