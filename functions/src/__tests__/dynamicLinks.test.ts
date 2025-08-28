import { buildDynamicLink } from "../invites";

describe("buildDynamicLink", () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.DYNAMIC_LINK_DOMAIN;
    delete process.env.DYNAMIC_LINK_LINK_BASE;
    delete process.env.DYNAMIC_LINK_APN;
    delete process.env.DYNAMIC_LINK_IBI;
    delete process.env.DYNAMIC_LINK_ISI;
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns null when no domain configured", () => {
    const url = buildDynamicLink("homecontrol://invite?hid=H&inviteId=I&token=T");
    expect(url).toBeNull();
  });

  it("builds link with domain and link base wrapper", () => {
    process.env.DYNAMIC_LINK_DOMAIN = "hc.page.link";
    process.env.DYNAMIC_LINK_LINK_BASE = "https://homecontrol.app/invite";
    process.env.DYNAMIC_LINK_APN = "app.homecontrol";
    const url = buildDynamicLink("homecontrol://invite?hid=H&inviteId=I&token=T");
    expect(url).toContain("https://hc.page.link/?");
    expect(url).toContain("link=https%3A%2F%2Fhomecontrol.app%2Finvite%3Fd%3D");
    expect(url).toContain("apn=app.homecontrol");
  });

  it("builds link without base when base not provided", () => {
    process.env.DYNAMIC_LINK_DOMAIN = "hc.page.link";
    const url = buildDynamicLink("homecontrol://invite?hid=H&inviteId=I&token=T");
    expect(url).toContain("https://hc.page.link/?");
    expect(url).toContain("link=homecontrol%3A%2F%2Finvite");
  });
});
