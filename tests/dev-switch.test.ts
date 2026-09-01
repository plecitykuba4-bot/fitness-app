import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Přepínač účtů obchází hesla, takže v produkci nesmí být dostupný ani omylem.
 * Tenhle test hlídá právě to — kdyby někdo podmínku obrátil nebo smazal,
 * spadne dřív, než se to dostane na produkci.
 */

const loadModule = async () => {
  // Modul čte NODE_ENV při volání, ale cache resetujeme pro jistotu.
  vi.resetModules();
  return import("@/server/dev-switch");
};

afterEach(() => {
  // unstubAllEnvs vrátí NODE_ENV na původní hodnotu samo.
  vi.unstubAllEnvs();
});

describe("vývojový přepínač účtů", () => {
  it("je v produkci vypnutý", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { isDevSwitchEnabled } = await loadModule();
    expect(isDevSwitchEnabled()).toBe(false);
  });

  it("v produkci nevrátí žádné účty", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { listDevUsers } = await loadModule();
    await expect(listDevUsers()).resolves.toEqual([]);
  });

  it("je zapnutý ve vývoji", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { isDevSwitchEnabled } = await loadModule();
    expect(isDevSwitchEnabled()).toBe(true);
  });

  it("je zapnutý při testech", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { isDevSwitchEnabled } = await loadModule();
    expect(isDevSwitchEnabled()).toBe(true);
  });
});
