# bkit-gap-detector Agent Memory

## Project: abada-shop

### Architecture
- DDD + CQRS + Hexagonal, TypeScript + Fastify backend, Next.js 15 frontend, Expo mobile
- 8 design documents in `docs/02-design/features/`
- Analysis output: `docs/03-analysis/abada-shop.analysis.md`
- State file: `.bkit-memory.json` at project root

### Analysis History
- **Iteration 0**: 40.6% (initial baseline, 1 BC)
- **Iteration 1**: 59.9% (+19.3%, added Product+Order BC full stack, Docker Compose, scrypt, mypage pages)
- **Iteration 2**: 63% (+3.1%, Dockerfiles, deploy script, Payment domain model, React Hooks fixes)

### Key Gaps (persistent across iterations)
1. Cart/Inventory/Catalog/Shipping BCs = DB schema only, no domain code
2. API response format: `{ data }` vs designed `{ success, data, meta }`
3. Error format: plain string vs designed `{ error: { code, message, details } }`
4. Frontend: All CSR, design requires SSR/SSG per page
5. Payment: Domain model exists but no app/infra/interface layers
6. Product: No PrismaProductRepository, simplified model (no SKU/Options)
7. Order: ShippingInfo is single string, should be full entity

### Convention Notes
- "User" in code, "Member" in design docs -- decided to update design
- `/users/me` in code, `/members/me` in design -- decided to update design
- `addDomainEvent()` in code, `registerEvent()` in design -- decided to update design
- `axios` in code, `ky` in design -- functionally equivalent, update design
- Order uses DRAFT instead of PENDING -- recorded as intentional
- Payment `payment.ts` imports Money from order context -- needs shared kernel refactor

### Scoring Weights
DB:10%, User:12%, Product:12%, Order:12%, Payment:5%, Cart+3BCs:10%, API:10%, Frontend:10%, Mobile:7%, Infra:7%, Arch:3%, Convention:2%
