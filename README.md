# Tenstack Monorepo

Monorepo con aplicaciones y paquetes compartidos (UI, i8n, etc.) usando **pnpm workspaces**.

## Requisitos

- Node.js 20+
- pnpm 9+
- Bun 1.3.6+

## Estructura del repo

```text
apps/
  web/        # Next.js frontend
  backend/    # API (Elysia)
packages/
  ui/         # Componentes compartidos (shadcn/ui)
  i8n/        # Diccionarios y utilidades de internacionalización
```

## Instalación

Desde la raíz del repo:

```bash
bun install
```

## Desarrollo

### Levantar todo (si existe script global)

```bash
pnpm dev
```

### Levantar apps por separado

```bash
pnpm --filter ./apps/web dev
pnpm --filter ./apps/backend dev
```

## Build

```bash
pnpm build
```

o por app:

```bash
pnpm --filter ./apps/web build
pnpm --filter ./apps/backend build
```

## Uso de paquetes internos (`@workspace/*`)

Para importar paquetes del monorepo (ej: `@workspace/i8n`):

1. El paquete debe tener `name` correcto en su `package.json`:
   - `"name": "@workspace/i8n"`
2. La app debe declararlo como dependencia:
   - `"@workspace/i8n": "workspace:*"`
3. Si la app es Next.js y consume TS directo desde `packages/`, agregar:
   - `transpilePackages: ["@workspace/i8n"]` en `apps/web/next.config.*`

## Agregar componentes de shadcn/ui

Desde la raíz:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Los componentes se generan en `packages/ui/src/components`.

Uso:

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Comandos útiles

```bash
# Ver todos los workspaces detectados
pnpm -r list --depth -1

# Instalar dependencia solo en web
pnpm --filter ./apps/web add <paquete>

# Instalar dependencia solo en backend
pnpm --filter ./apps/backend add <paquete>
```
