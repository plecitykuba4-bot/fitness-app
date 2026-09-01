# Fitness trenér

Webová aplikace pro osobního fitness trenéra a jeho klienty. Celé uživatelské
rozhraní je v češtině (`cs-CZ`) a navržené jako **senior-friendly** — velká
písma, velká tlačítka, jedna hlavní akce na obrazovku.

---

## Požadavky

- Node.js 20+ (vyvíjeno na 24)
- npm 10+
- Databáze: lokálně SQLite (nic se neinstaluje), v produkci PostgreSQL

## Instalace

```bash
npm install
```

```bash
cp .env.example .env
```

## Proměnné prostředí

| Proměnná | Popis |
| --- | --- |
| `DATABASE_URL` | Připojení k databázi. Lokálně `file:./dev.db`, v produkci `postgresql://…` |
| `AUTH_SECRET` | Tajemství pro session. Minimálně 32 znaků. |
| `STORAGE_ENDPOINT` | Endpoint S3-compatible storage pro média cviků |
| `STORAGE_ACCESS_KEY` | Přístupový klíč storage |
| `STORAGE_SECRET_KEY` | Tajný klíč storage |
| `STORAGE_BUCKET` | Název bucketu |
| `STORAGE_PUBLIC_URL` | Veřejná URL, ze které se média servírují |

Secrets nikdy nepatří do kódu. `.env` je v `.gitignore`.

## Databáze a Prisma

```bash
npx prisma migrate dev
```

```bash
npm run db:seed
```

Prisma 7 se připojuje přes **driver adapter**, ne přes URL ve schématu:

- runtime — `src/server/db.ts` (`@prisma/adapter-better-sqlite3`)
- CLI a migrace — `prisma.config.ts` (`datasource.url`)

### Přechod na PostgreSQL

1. V `prisma/schema.prisma` změň `provider = "sqlite"` na `"postgresql"`.
2. `npm install @prisma/adapter-pg pg` a v `src/server/db.ts` vyměň adapter.
3. Nastav `DATABASE_URL` na Postgres connection string.
4. Smaž `prisma/migrations` a vygeneruj migrace znovu (`npx prisma migrate dev --name init`).

Schéma je psané portovatelně — enumy jsou `String` validované přes Zod
v `src/lib/enums.ts`, váhy jsou `Float`. Nic se tedy při přechodu neláme.

## Spuštění

```bash
npm run dev
```

Aplikace běží na **http://localhost:3000**.

## Demo přihlášení

> ⚠️ **DEVELOPMENT ONLY.** Účty vytváří seed script se známými hesly.
> Seed odmítne běžet při `NODE_ENV=production`.

| Role | E-mail | Heslo |
| --- | --- | --- |
| Trenér | `trainer@example.com` | `ChangeMe123!` |
| Klient | `petr.novak@example.com` | `ChangeMe123!` |
| Klient | `tomas.dvorak@example.com` | `ChangeMe123!` |
| Klient | `martin.svoboda@example.com` | `ChangeMe123!` |
| Klient | `jana.maresova@example.com` | `ChangeMe123!` |
| Klient | `lukas.benes@example.com` | `ChangeMe123!` |
| Klient | `eva.horakova@example.com` | `ChangeMe123!` |

### Vývojový přepínač účtů

Nahoře na každé stránce je proužek **„Vývojový přepínač účtů"**. Po rozbalení
přepne jedním klikem mezi trenérem a kterýmkoli klientem — bez odhlašování
a bez hesla.

Je záměrně dostupný jen ve vývoji: `isDevSwitchEnabled()` v
`src/server/dev-switch.ts` vrací `false`, když je `NODE_ENV=production`.
Kontrola je i v samotné server action, takže ji nejde obejít zavoláním
napřímo. Hlídá to test `tests/dev-switch.test.ts`.

### Demo data a vývoj v čase

Seed vytvoří 30 cviků, 5 šablon, plány a zhruba 185 odcvičených tréninků za
14 týdnů. Každý klient má jinou **trajektorii**, aby bylo na grafech, v reportech
i v analytice vidět, jak aplikace vypadá v různých situacích:

| Klient | Trajektorie | Co je na něm vidět |
| --- | --- | --- |
| Petr Novák | `steady` | rovnoměrný růst, 64 let, vysoká konzistence |
| Tomáš Dvořák | `fast` | začátečnický skok, který se postupně zplošťuje |
| Martin Svoboda | `plateau` | růst a pak stagnace — podnět k deloadu |
| Jana Marešová | `comeback` | zranění, tři týdny výpadku, návrat zpět nahoru |
| Lukáš Beneš | `declining` | zhoršující se docházka, klesající výkon |
| Eva Horáková | `starting` | jen 4 týdny historie, málo dat |

Trajektorie jsou popsané v `prisma/seed-clients.ts`. Generátor je
deterministický (`makeRandom`), takže opakovaný seed dá stejná data —
změna v grafu tedy znamená změnu v aplikaci, ne v datech.

## Funkce

**Trenér:** přehled · klienti a jejich detail · databáze cviků · workout builder
(sestavení tréninku, řazení cviků) · tréninkové plány (týdenní rozvrh, přiřazení
klientovi) · analytika napříč klienty · týdenní report každého klienta ·
poznámky ke klientovi · oznámení

**Klient:** dnešní trénink · týdenní plán · workout mode (časovač, pauza,
minulý výkon, osobní rekordy) · historie · pokrok s grafy · týdenní report ·
poznámky k tréninku · oznámení · profil

## Testování

```bash
npm test
```

Pokrývá výpočty progresu, české formátování a — integračně proti skutečné
databázi — izolaci dat klientů, hashování hesel a idempotentní zápis sérií.

## Lint a build

```bash
npx eslint src prisma tests scripts
```

```bash
npm run build
```

## PWA

Manifest generuje `src/app/manifest.ts`, ikony `scripts/make-icons.mts`.
Aplikace jde přidat na domovskou obrazovku na Androidu i iOS a spustí se
v režimu `standalone`.

## Storage médií

Obrázky a videa cviků se **nikdy** neukládají do databáze — v `ExerciseMedia`
je jen `storageKey` odkazující do S3-compatible úložiště. Video se v aplikaci
načítá s `preload="none"` až po otevření techniky.

## Struktura projektu

```
prisma/          schema, migrace, seed
scripts/         vývojové pomůcky (ikony, čištění sessions)
src/app/         routy — (trainer) a (client) route groups
src/components/  ui/ (primitiva) a shared/ (složené komponenty)
src/hooks/       React hooks (časovač tréninku)
src/lib/         formátování, enumy, utility
src/server/      db, auth, guards, dotazy, server actions
src/services/    čisté výpočetní funkce (progres, statistiky)
tests/           testy
```

## Bezpečnost

- Hesla hashovaná bcryptem (12 rounds).
- Session v databázi + `httpOnly` cookie, `secure` v produkci.
- Veškerá autorizace v `src/server/auth/guards.ts`.
- **Ochrana proti IDOR:** každý přístup k datům klienta jde přes
  `requireOwnedClient()` / `resolveAccessibleClientId()`. Cizí zdroj vrací
  404, ne 403 — 403 by prozradilo, že záznam existuje.
- Validace vždy i na serveru (Zod), nikdy jen na klientovi.

## Produkční nasazení

Aplikace je připravená pro Vercel, Railway, Render i vlastní server.
Databáze i storage jsou oddělené služby, konfigurace jde přes proměnné
prostředí.

Před nasazením:

1. Přepni databázi na PostgreSQL (viz výše).
2. Vygeneruj silný `AUTH_SECRET`.
3. Nastav S3-compatible storage a doplň proměnné.
4. **Nespouštěj seed.**
