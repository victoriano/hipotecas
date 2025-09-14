## Calculadora de bonificaciones de hipoteca

- Producción: [hipotecas.victoriano.me](https://hipotecas.victoriano.me)
- Repositorio: https://github.com/victoriano/hipotecas

### Desarrollo local (Bun)

```bash
bun install
bun run dev
```

### Build

```bash
bun run build
bun run preview
```

### Compartir estado

El botón "Compartir" copia una URL con el estado completo (capital, plazo, tipo base y todas las bonificaciones), codificado en `?s=` como Base64 JSON. Al abrir el enlace se restaura el estado.


