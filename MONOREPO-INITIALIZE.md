3. Create the monorepo

Install current pnpm first.

npm install -g pnpm@12

Then:

mkdir my-product
cd my-product

git init

mkdir apps
mkdir packages

Create the root package.json:

{
"name": "my-product",
"private": true,
"packageManager": "pnpm@12.3.4",
"engines": {
"node": ">=22"
},
"scripts": {
"dev": "turbo dev",
"dev:web": "turbo dev --filter=@repo/web",
"dev:mobile": "turbo dev --filter=@repo/mobile",

    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",

    "check": "turbo lint typecheck test"

},
"devDependencies": {
"turbo": "^2.10.0",
"typescript": "^5"
}
}

I'm pinning pnpm at the repository level deliberately. As of September 2026, pnpm 12 is current; a packageManager declaration also ensures developers and CI use a consistent major/version rather than whatever happens to be installed globally.

4. Configure pnpm workspaces

Create:

pnpm-workspace.yaml

with:

packages:

- "apps/\*"
- "packages/\*"

That's the standard pnpm workspace structure Expo documents for monorepos.

Now:

pnpm install 5. Add Turborepo

Install Turbo at the workspace root:

pnpm add -Dw turbo

Create:

turbo.json
{
"$schema": "https://turborepo.dev/schema.json",
"tasks": {
"dev": {
"cache": false,
"persistent": true
},

    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "dist/**",
        "build/**"
      ]
    },

    "lint": {
      "dependsOn": ["^lint"]
    },

    "typecheck": {
      "dependsOn": ["^typecheck"]
    },

    "test": {
      "dependsOn": ["^test"],
      "outputs": ["coverage/**"]
    }

}
}

This follows Turborepo's recommended model: persistent uncached dev, dependency-aware builds, and cached build outputs.

6. Create Next.js + Payload

From your repository root:

pnpm dlx create-payload-app@latest apps/web -t blank

Choose:

Database:
PostgreSQL

Package manager:
pnpm

Payload's current CLI supports creating an app through create-payload-app, and its official blank/website templates are Next.js applications with Payload integrated.

Now open:

apps/web/package.json

and make sure its name is something useful:

{
"name": "@repo/web"
}

Make sure you have scripts resembling:

{
"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "eslint .",
"typecheck": "tsc --noEmit",
"payload": "payload"
}
}

Keep whatever additional flags the Payload template itself generates; don't overwrite working generated commands unnecessarily.

7. Create the React Native app

From repository root:

pnpm create expo-app apps/mobile

Expo detects workspace-based monorepos automatically. Modern Expo's Metro configuration handles monorepos without the old manual watchFolders / extraNodeModules hacks.

Change:

apps/mobile/package.json

to include:

{
"name": "@repo/mobile",
"scripts": {
"dev": "expo start",
"start": "expo start",
"android": "expo start --android",
"ios": "expo start --ios",
"web": "expo start --web",
"lint": "expo lint",
"typecheck": "tsc --noEmit"
}
}

Then from root:

pnpm install

You should now be able to run:

pnpm dev

and Turbo will start both applications.

Or individually:

pnpm dev:web

and:

pnpm dev:mobile 8. Your development workflow becomes very simple

From the root:

pnpm dev

Conceptually:

               pnpm dev
                   │
                 Turbo
             ┌─────┴─────┐
             ▼           ▼
       apps/web      apps/mobile
       :3000          Expo Metro
          │
          │ HTTPS/API
          └────────────► Mobile

Then:

pnpm lint
pnpm typecheck
pnpm test
pnpm build

operate across the whole repository.

That's one of the main benefits of the monorepo.

9. Create shared contracts

This is one of the most valuable parts of your setup.

Create:

packages/contracts/

with:

packages/contracts/package.json
{
"name": "@repo/contracts",
"version": "0.0.0",
"private": true,
"type": "module",
"exports": {
".": "./src/index.ts"
}
}

Then:

packages/contracts/src/index.ts

could contain Zod schemas:

import { z } from "zod"

export const UserSchema = z.object({
id: z.string(),
email: z.string().email(),
name: z.string()
})

export type User = z.infer<typeof UserSchema>

Your backend uses:

import {
UserSchema,
type User
} from "@repo/contracts"

and React Native uses the same schema:

import {
UserSchema,
type User
} from "@repo/contracts"

Install it in each application:

pnpm --filter @repo/web add @repo/contracts@workspace:_
pnpm --filter @repo/mobile add @repo/contracts@workspace:_

Now there's no publishing to npm.

workspace:\* means:

Use this package from this repository.

10. Also make a shared API client

Create:

packages/api-client/

Imagine:

export function createApiClient(baseUrl: string) {
return {
async getMe() {
const response = await fetch(`${baseUrl}/api/me`)

      if (!response.ok) {
        throw new Error("Failed to fetch user")
      }

      return response.json()
    }

}
}

Then both clients can use it.

Next.js:

const api = createApiClient(
process.env.NEXT_PUBLIC_API_URL!
)

React Native:

const api = createApiClient(
process.env.EXPO_PUBLIC_API_URL!
)

Architecture:

                 @repo/contracts
                       ▲
                       │
                 @repo/api-client
                  ▲            ▲
                  │            │
              Next.js      React Native
                  │            │
                  └──────┬─────┘
                         ▼
                      Payload

11. Don't share everything

This is important.

I would initially share:

contracts
schemas
types
API client
validation
business rules
utility functions
constants
LLM tool schemas

I would not immediately try to share all UI components between React Native and Next.js.

A React DOM component:

<div>

is fundamentally different from:

<View>

in React Native.

You can eventually introduce cross-platform UI with something like Tamagui or React Native Web, but don't make that complexity part of your initial architecture.

Your monorepo should begin:

shared logic: YES
shared types: YES
shared API: YES

shared UI: only when clearly beneficial 12. One important mobile API issue

During development:

http://localhost:3000

works from your browser.

But on a physical phone:

localhost

means:

the phone itself

not your laptop.

So for local development you may use your computer's LAN IP:

EXPO_PUBLIC_API_URL=http://192.168.1.50:3000

while production uses:

EXPO_PUBLIC_API_URL=https://api.example.com

Although in your architecture it could simply be:

EXPO_PUBLIC_API_URL=https://example.com

because Next + Payload are the same service.

13. Git setup

Your root .gitignore should cover things such as:

node_modules

.next
.expo
dist
build
coverage

.turbo

.env
.env.\*
!.env.example

.DS_Store

apps/mobile/android
apps/mobile/ios

Whether you ignore android/ and ios/ depends on whether you use Expo's Continuous Native Generation approach. A freshly created Expo application normally works well with native projects generated through EAS rather than committed. Expo's CI/CD docs use this workflow.

Then:

git add .
git commit -m "chore: initialize monorepo" 14. Push the monorepo to GitHub

Create one GitHub repository:

my-product

Then:

git branch -M main

git remote add origin \
git@github.com:YOUR_USERNAME/my-product.git

git push -u origin main

That's it.

You do not create separate repositories for:

web
mobile
Payload

GitHub contains:

github.com/you/my-product

    apps/web
    apps/mobile
    packages/*

15. Branch strategy

I would keep this simple too.

main
│
├── feat/mobile-profile
├── feat/ai-chat
├── feat/billing
└── fix/auth-refresh

Workflow:

feature branch
↓
Pull Request
↓
GitHub CI
↓
review / CI passes
↓
merge to main
│
├────► web production deployment
│
└────► mobile update/release when appropriate

Avoid maintaining:

frontend branch
backend branch
mobile branch

Those defeat much of the purpose of a monorepo.

16. GitHub Actions CI

Your CI should validate the whole product, but not deploy anything.

Create:

.github/workflows/ci.yml
name: CI

on:
pull_request:
push:
branches: - main

jobs:
check:
runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup pnpm and Node
        uses: pnpm/setup@v2
        with:
          version: 12
          runtime: node@22
          cache: true
          install: false

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

The current pnpm GitHub integration can install pnpm and Node together and cache dependencies, which simplifies CI setup.

Your PR now looks conceptually like:

PR opened
│
▼
pnpm install --frozen-lockfile
│
├─ lint web
├─ lint mobile
├─ lint packages
│
├─ typecheck web
├─ typecheck mobile
├─ typecheck packages
│
└─ tests
│
▼
PASS 17. Should CI also run pnpm build?

Eventually, yes.

I'd add:

      - name: Build
        run: pnpm build

but Payload sometimes makes CI builds more involved because the application can depend on database/environment configuration.

For proper integration CI, give GitHub Actions a temporary PostgreSQL service:

services:
postgres:
image: postgres:17
env:
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
POSTGRES_DB: app_ci
ports: - 5432:5432
options: >-
--health-cmd pg_isready
--health-interval 10s
--health-timeout 5s
--health-retries 5

Then:

env:
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/app_ci
PAYLOAD_SECRET: ci-only-not-production-secret

And eventually:

- run: pnpm --filter @repo/web payload migrate

- run: pnpm build

That database is disposable CI infrastructure — never connect PR CI to production Postgres.

18. Payload migrations

This part is very important once you use PostgreSQL.

During development, Payload can use Drizzle's push mode to keep your local DB synchronized automatically. For production, Payload recommends creating migration files and committing them to Git.

When changing collections:

cd apps/web

pnpm payload migrate:create

Commit:

apps/web/migrations/

to Git.

So your PR might contain:

apps/web/
src/collections/Users.ts

    migrations/
      20260909_add_user_profile.ts

Then production runs:

pnpm payload migrate

before the new application takes traffic.

Payload explicitly documents CI/deployment-time migration execution for PostgreSQL.

19. Web + Payload deployment

Connect your GitHub repository to your Node.js PaaS.

Your PaaS should deploy:

apps/web

but because this is a pnpm workspace, I usually prefer letting it build from the repository root.

Build command:

pnpm install --frozen-lockfile &&
pnpm --filter @repo/web build

Start command:

pnpm --filter @repo/web start

And if your PaaS supports a release/pre-deploy command:

pnpm --filter @repo/web payload migrate

Ideal process:

push main
│
▼
PaaS receives commit
│
▼
pnpm install
│
▼
payload migrate
│
▼
Next/Payload build
│
▼
start

Payload supports deployment anywhere Next.js can run, including ordinary Node/container environments.

20. Don't run production database migrations from general GitHub CI

Keep:

# GitHub Actions

verification

and:

# PaaS deployment

production migration

- production deployment

That's a safer separation.

Otherwise this can happen:

GitHub CI
│
└── modifies production DB

PaaS deployment
│
└── application deployment fails

Result:
DB migrated
old app still running

Much less desirable.

Instead:

PaaS release
├── migrate
└── deploy

if migration/deploy fails
→ release fails 21. Mobile CI/CD should be separate

This is where a lot of people make a mistake.

Don't rebuild iOS and Android every time you make:

Payload change
database migration
web CSS change
Next.js SEO change

Your mobile release cycle is different.

Use EAS Workflows for the mobile app.

Expo now provides managed workflows for:

development builds
preview updates
production builds
EAS Update
App Store submission
Play Store submission

and these workflows can trigger from GitHub events.

22. Initialize EAS

Go into the mobile app:

cd apps/mobile

Install/login:

pnpm add -g eas-cli

eas login

Configure:

eas build:configure

Expo's monorepo guidance says EAS commands should be executed from the mobile app directory and files such as eas.json should live there.

So:

apps/mobile/
eas.json

not:

/eas.json 23. Generate EAS workflows

Still inside:

apps/mobile

run:

eas workflow:create --template build

for development builds.

And:

eas workflow:create --template deploy

for production.

Expo's current deploy workflow can detect whether native code changed: if it did, it produces a new store build; otherwise it can send an EAS Update to an existing compatible build.

That is exactly what you want.

24. Resulting CI/CD architecture

Your complete pipeline becomes:

                         GitHub
                            │
                    Pull Request
                            │
                            ▼
                     GitHub Actions
                    ┌─────────────┐
                    │ lint        │
                    │ typecheck   │
                    │ test        │
                    │ build       │
                    └──────┬──────┘
                           │
                        merge
                           │
                           ▼
                         main
                   ┌───────┴────────┐
                   │                │
                   ▼                ▼
               Node PaaS           EAS
                   │                │
            apps/web changed    mobile release
                   │                │
                   ▼           ┌────┴─────┐
             Next + Payload    ▼          ▼
                   │          iOS       Android
                   ▼
              PostgreSQL

This separation is excellent.

25. I would not automatically publish mobile production builds on every main commit

Web deployments are cheap:

merge
→ deploy

Mobile releases are different.

You have:

native compilation
signing
TestFlight
Play Console
store submission/review
version numbers

So I prefer:

main
→ web deploy automatically

and:

mobile release
→ explicit release workflow

or something like tags:

git tag mobile-v1.4.0
git push origin mobile-v1.4.0

which triggers the EAS production workflow.

For JavaScript-only changes, EAS Update can often provide a faster delivery path without creating a new native binary. Expo's current generated deploy workflow is specifically designed around this native-change versus OTA-update distinction.

26. Local environment variables

I'd keep environment ownership clear.

Web:

apps/web/.env.local
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
OPENAI_API_KEY=...
S3_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

Mobile:

apps/mobile/.env.local
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000

Critical rule:

apps/web env
→ can contain secrets

apps/mobile EXPO*PUBLIC*\*
→ NEVER secrets

Anything bundled into your React Native app should be considered accessible to the user.

So never:

EXPO_PUBLIC_OPENAI_API_KEY=...

Instead:

React Native
↓
your Payload/Next API
↓
OpenAI 27. Your LLM architecture should therefore be
React Native
│
│ authenticated HTTPS
▼
Next.js + Payload
│
├── authentication
├── rate limits
├── authorization
├── usage accounting
│
▼
OpenAI / other LLM

Never:

React Native
│
▼
OpenAI

with your private API key embedded in the app.

28. Sharing Payload types

Payload can generate TypeScript types from your collections.

So eventually you can make your structure:

Payload collections
│
▼
generated TS types
│
▼
packages/contracts
│
┌──┴───┐
▼ ▼
Next Expo

Payload supports generated TypeScript interfaces and Next.js can transpile local monorepo packages via transpilePackages when needed.

However, I wouldn't blindly expose every generated database type to your mobile application.

Prefer:

database model
↓
API DTO/schema
↓
mobile

because your internal database representation and public API contract aren't always the same thing.

29. My final repo would look like this
    product/
    │
    ├── apps/
    │ │
    │ ├── web/ # deployable
    │ │ ├── src/
    │ │ │ ├── app/
    │ │ │ ├── collections/
    │ │ │ ├── lib/
    │ │ │ └── payload.config.ts
    │ │ ├── migrations/
    │ │ └── package.json
    │ │
    │ └── mobile/ # deployable
    │ ├── app/
    │ ├── eas.json
    │ ├── .eas/
    │ └── package.json
    │
    ├── packages/
    │ │
    │ ├── contracts/ # shared
    │ ├── api-client/ # shared
    │ ├── eslint-config/ # shared
    │ └── tsconfig/ # shared
    │
    ├── .github/
    │ └── workflows/
    │ └── ci.yml
    │
    ├── turbo.json
    ├── pnpm-workspace.yaml
    ├── pnpm-lock.yaml
    ├── package.json
    └── README.md

And the developer experience becomes:

git clone ...
cd product

pnpm install
pnpm dev

Then while working:

pnpm dev:web
pnpm dev:mobile

pnpm lint
pnpm typecheck
pnpm test
pnpm build

Then:

git checkout -b feat/ai-chat

develop across:

apps/web
apps/mobile
packages/contracts
packages/api-client

in one branch and one PR.

Once merged:

GitHub Actions
↓
CI
↓
main
│
├── Node PaaS → Next + Payload
│
└── EAS → mobile when you choose to release
The setup I'd choose

If this were my project, I would not use three repositories, microservices, separate Payload hosting, Nx, Docker Compose for everything, or complicated Git branching initially.

I would start with:

pnpm

- Turborepo
- one GitHub repo
- apps/web = Next + Payload
- apps/mobile = Expo
- packages/contracts
- packages/api-client
- GitHub Actions for CI
- PaaS Git deployment for web
- EAS Workflows for mobile
