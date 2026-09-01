import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Přepínač účtů obchází hesla, takže v běžné produkci nesmí být dostupný.
 * Výjimkou je výslovně zapnutý DEMO_MODE pro neveřejnou prezentaci.
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
    vi.stubEnv("DEMO_MODE", "false");
    const { isDevSwitchEnabled } = await loadModule();
    expect(isDevSwitchEnabled()).toBe(false);
  });

  it("v produkci nevrátí žádné účty", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
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

  it("je zapnutý v prezentačním režimu", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    const { isDevSwitchEnabled } = await loadModule();
    expect(isDevSwitchEnabled()).toBe(true);
  });
});
