| Responsibility               | Tool                                  |
| ---------------------------- | ------------------------------------- |
| Package manager / workspaces | **pnpm**                              |
| Monorepo task runner         | **Turborepo**                         |
| Web + backend                | **Next.js + Payload in one app**      |
| Mobile                       | **Expo + React Native**               |
| Source control               | **GitHub**                            |
| CI                           | **GitHub Actions**                    |
| Web/backend CD               | **Your Node.js PaaS Git integration** |
| Mobile CD                    | **EAS Workflows**                     |
| Database                     | PostgreSQL                            |
| File storage                 | S3/R2                                 |

GitHub monorepo
│
├── apps/web ──────► Node.js PaaS
│ Next + Payload
│
├── apps/mobile ──────► EAS
│ Expo / RN ├─ iOS
│ └─ Android
│
└── packages/\*
shared TS code

    my-product/

│
├── apps/
│ │
│ ├── web/
│ │ ├── src/
│ │ │ ├── app/
│ │ │ │ ├── (frontend)/
│ │ │ │ └── (payload)/
│ │ │ ├── collections/
│ │ │ └── payload.config.ts
│ │ ├── migrations/
│ │ ├── package.json
│ │ └── .env.local
│ │
│ └── mobile/
│ ├── app/
│ ├── assets/
│ ├── package.json
│ ├── app.json
│ ├── eas.json
│ └── .eas/
│
├── packages/
│ │
│ ├── contracts/
│ │ └── shared DTOs / Zod schemas / types
│ │
│ ├── api-client/
│ │ └── shared typed API client
│ │
│ ├── tsconfig/
│ │
│ └── eslint-config/
│
├── .github/
│ └── workflows/
│ └── ci.yml
│
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── .gitignore
└── README.md

pnpm = packages/dependencies

Turbo = tasks/caching/dependency graph
