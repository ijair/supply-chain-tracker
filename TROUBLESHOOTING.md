# Troubleshooting Guide

## Error: "missing revert data (CALL_EXCEPTION)"

### Problema

Este error ocurre cuando el frontend intenta interactuar con un contrato que no existe en la dirección configurada. Esto sucede comúnmente cuando:

1. **Anvil se reinició**: Anvil es una blockchain local en memoria que pierde todo el estado cuando se reinicia. Si reinicias Anvil, todos los contratos desplegados se pierden.

2. **El contrato no ha sido desplegado**: El contrato puede no haberse desplegado después de iniciar Anvil.

3. **La dirección del contrato cambió**: Si el contrato se desplegó en una dirección diferente, el frontend seguirá intentando usar la dirección anterior.

### Solución

El frontend ahora detecta automáticamente cuando el contrato no existe y muestra un mensaje de error claro. Para solucionarlo:

1. **Verifica que Anvil esté corriendo**:
   ```bash
   cd sc
   ./scripts/anvil.sh start
   ```

2. **Despliega el contrato nuevamente**:
   ```bash
   cd sc
   ./scripts/deploy.sh
   ```

3. **Verifica que el contrato se desplegó correctamente**:
   El script de despliegue mostrará la dirección del contrato. Verifica que coincida con la dirección en `web/src/contracts/config.ts`.

4. **Recarga el frontend**:
   Si el frontend ya estaba abierto, recarga la página para que use la nueva configuración.

### Prevención

Para evitar que esto vuelva a pasar:

1. **Siempre despliega el contrato después de reiniciar Anvil**:
   - Si reinicias Anvil, siempre ejecuta `./scripts/deploy.sh` antes de usar el frontend.

2. **Usa un script de inicio automatizado**:
   Puedes crear un script que inicie Anvil y despliegue el contrato automáticamente:

   ```bash
   # scripts/start-dev.sh
   #!/bin/bash
   cd sc
   ./scripts/anvil.sh start
   sleep 2  # Espera a que Anvil esté listo
   ./scripts/deploy.sh
   ```

3. **Verifica el estado del contrato antes de desarrollar**:
   El frontend ahora verifica automáticamente si el contrato existe antes de intentar usarlo, mostrando un mensaje claro si no está desplegado.

### Cambios Implementados

Se han implementado las siguientes mejoras:

1. **Función `checkContractExists()`**: Verifica si un contrato existe en una dirección antes de intentar usarlo.

2. **Función `isContractNotFoundError()`**: Detecta errores relacionados con contratos no encontrados.

3. **Manejo de errores mejorado**: El frontend ahora muestra mensajes claros cuando el contrato no está desplegado, en lugar de errores crípticos.

4. **Verificaciones automáticas**: El frontend verifica automáticamente la existencia del contrato en:
   - Conexión de wallet
   - Actualización de datos de usuario
   - Carga de usuarios (admin)
   - Registro de usuarios

### Cómo Verificar Manualmente

Puedes verificar manualmente si el contrato existe usando `cast`:

```bash
cast code 0x5FbDB2315678afecb367f032d93F642f64180aa3 --rpc-url http://127.0.0.1:8545
```

Si el resultado es `0x`, el contrato no existe. Si hay código, el contrato está desplegado.

### Notas Importantes

- **Anvil es una blockchain en memoria**: Todos los datos se pierden al reiniciar.
- **Para desarrollo local**: Siempre despliega el contrato después de reiniciar Anvil.
- **Para producción**: Usa una red de prueba (como Sepolia) o una red principal donde los contratos persistan.

