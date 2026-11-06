import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { OVERVIEW_TOUR, PROJECT_TOUR, placeTooltip, spotlightRect, targetScrollTop } from "../lib/tour.ts";

const viewport = { width: 1440, height: 900 };
const box = { width: 360, height: 220 };

test("the explanation box goes below, above, beside or over the target, always on screen", () => {
  assert.deepEqual(placeTooltip({ top: 100, left: 300, width: 400, height: 80 }, box, viewport), { top: 194, left: 320, placement: "bottom" });
  assert.equal(placeTooltip({ top: 600, left: 300, width: 400, height: 200 }, box, viewport).placement, "top");
  assert.equal(placeTooltip({ top: 100, left: 40, width: 500, height: 760 }, box, viewport).placement, "right");
  assert.equal(placeTooltip({ top: 100, left: 900, width: 500, height: 760 }, box, viewport).placement, "left");
  const huge = placeTooltip({ top: 20, left: 20, width: 1400, height: 860 }, box, viewport);
  assert.equal(huge.placement, "center");
  assert.ok(huge.top >= 12 && huge.top + box.height <= viewport.height - 12);
  const centred = placeTooltip(null, box, viewport);
  assert.deepEqual(centred, { top: 340, left: 540, placement: "center" });
  // Near the right edge the box is pulled back inside the screen.
  const edge = placeTooltip({ top: 100, left: 1380, width: 40, height: 40 }, box, viewport);
  assert.equal(edge.left, viewport.width - box.width - 12);
});

test("the spotlight pads the target and stays inside the screen", () => {
  assert.deepEqual(spotlightRect({ top: 100, left: 200, width: 300, height: 50 }, viewport), { top: 92, left: 192, width: 316, height: 66 });
  // Right edge = -10 + 600 + 8 = 598, left clipped to 6 → width 592; bottom clipped to 894 → height 888.
  assert.deepEqual(spotlightRect({ top: -200, left: -10, width: 600, height: 2000 }, viewport), { top: 6, left: 6, width: 592, height: 888 });
});

test("targets are scrolled to a readable spot on desktop and above the sheet on phones", () => {
  // Desktop: a 200px card ends up roughly centred, leaving room for the box.
  assert.equal(targetScrollTop({ top: 1500, left: 0, width: 300, height: 200 }, 1000, viewport, false), 1000 + 1500 - (700 / 2 - 70));
  // A very tall target starts near the top.
  assert.equal(targetScrollTop({ top: 1500, left: 0, width: 300, height: 800 }, 0, viewport, false), 1500 - 72);
  // Phone: below the 55px header, in the space above the bottom sheet.
  const phone = targetScrollTop({ top: 900, left: 0, width: 360, height: 100 }, 0, { width: 390, height: 800 }, true, 55);
  assert.equal(phone, Math.round(900 - (55 + 12 + (800 * 0.52 - 55 - 100) / 2)));
  assert.equal(targetScrollTop({ top: 10, left: 0, width: 100, height: 100 }, 0, viewport, false), 0, "never negative");
});

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
  });
}

test("every tour step points at something that exists in the components", () => {
  const source = [...sourceFiles("components"), ...sourceFiles("app")].join("\n");
  const marked = (name) => source.includes(`data-tour="${name}"`) || source.includes(`tourId="${name}"`) || source.includes(`data-tour={href === "/guide" ? "${name}"`);
  for (const step of [...OVERVIEW_TOUR, ...PROJECT_TOUR]) {
    for (const selector of [step.target, step.phoneTarget].filter(Boolean)) {
      const name = selector.match(/^\[data-tour="([^"]+)"\]$/)?.[1];
      assert.ok(name, `${step.id}: selector ${selector} uses data-tour`);
      assert.ok(marked(name), `${step.id}: no component marks data-tour="${name}"`);
    }
    if (step.scrollHint) {
      const id = step.scrollHint.match(/^#(.+)$/)?.[1];
      const anchor = step.scrollHint.match(/^\[data-tour-anchor="([^"]+)"\]$/)?.[1];
      assert.ok(id ? source.includes(`id="${id}"`) : source.includes(`data-tour-anchor="${anchor}"`), `${step.id}: scroll hint ${step.scrollHint} exists`);
    }
    assert.ok(step.title.length > 3 && step.body.length > 40, `${step.id} has a real explanation`);
  }
  const ids = [...OVERVIEW_TOUR, ...PROJECT_TOUR].map((step) => step.id);
  assert.equal(new Set(ids).size, ids.length, "step ids are unique");
});
