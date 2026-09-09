import { suite, test, expect, open, scriptOf, sandbox } from "./harness.mjs";
suite("harness smoke");
test("sandbox extracts pure helpers from tracker", () => {
  const { diffD } = sandbox(scriptOf("tracker.html"), ["diffD"]);
  expect(typeof diffD).toBe("function");
});
await test("browser opens tracker with no page errors", async () => {
  const p = await open("tracker.html");
  expect(p.__errors.length).toBe(0);
  expect(await p.locator("article.case").count()).toBeGreaterThan(0);
  await p.__ctx.close();
});
