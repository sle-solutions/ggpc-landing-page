import assert from "node:assert/strict"
import test from "node:test"
import { allowWhiteFridayPreview, isWhiteFridayActive, WHITE_FRIDAY } from "@/lib/campaign/white-friday"

test("White Friday window uses inclusive start and exclusive end in Dubai time", () => {
  assert.equal(new Date(WHITE_FRIDAY.startsAt).toISOString(), "2026-11-21T20:00:00.000Z")
  assert.equal(new Date(WHITE_FRIDAY.endsAt).toISOString(), "2026-11-29T20:00:00.000Z")
  assert.equal(isWhiteFridayActive(WHITE_FRIDAY.startsAt - 1), false)
  assert.equal(isWhiteFridayActive(WHITE_FRIDAY.startsAt), true)
  assert.equal(isWhiteFridayActive(WHITE_FRIDAY.endsAt - 1), true)
  assert.equal(isWhiteFridayActive(WHITE_FRIDAY.endsAt), false)
})

test("preview override works outside production only", () => {
  assert.equal(allowWhiteFridayPreview({ WHITE_FRIDAY_PREVIEW: "1", VERCEL_ENV: "preview", NODE_ENV: "production" }), true)
  assert.equal(allowWhiteFridayPreview({ WHITE_FRIDAY_PREVIEW: "1", VERCEL_ENV: "production", NODE_ENV: "production" }), false)
  assert.equal(allowWhiteFridayPreview({ WHITE_FRIDAY_PREVIEW: "1", NODE_ENV: "production" }), false)
  assert.equal(allowWhiteFridayPreview({ WHITE_FRIDAY_PREVIEW: "true", VERCEL_ENV: "preview" }), false)
  assert.equal(allowWhiteFridayPreview({ VERCEL_ENV: "preview" }), false)
})
