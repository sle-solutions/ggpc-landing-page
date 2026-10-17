import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { noonCouponCode, outboundUrl } from "../lib/order/affiliate"

const keys = ["AMAZON_AE_ASSOCIATE_TAG", "NOON_LINK_TEMPLATE", "NOON_COUPON_CODE"]
afterEach(() => { for (const k of keys) delete process.env[k] })
const AMZ = "https://www.amazon.ae/dp/B0BBHD5D8Y?th=1"

test("Amazon gets the tag only when it is set", () => {
  assert.equal(outboundUrl("amazon_ae", AMZ, "B"), AMZ)
  process.env.AMAZON_AE_ASSOCIATE_TAG = "ggpc-21"
  const url = new URL(outboundUrl("amazon_ae", AMZ, "B")!)
  assert.equal(url.searchParams.get("tag"), "ggpc-21")
  assert.equal(url.searchParams.get("th"), "1")
})

test("noon wraps with the template and falls back to the plain URL", () => {
  const noon = "https://www.noon.com/uae-en/x/N1/p/"
  assert.equal(outboundUrl("noon", noon, "B"), noon)
  process.env.NOON_LINK_TEMPLATE = "https://go.example/r?u={url}"
  assert.equal(outboundUrl("noon", noon, "B"), `https://go.example/r?u=${encodeURIComponent(noon)}`)
  assert.equal(noonCouponCode(), null)
  process.env.NOON_COUPON_CODE = "GGPC"
  assert.equal(noonCouponCode(), "GGPC")
})

test("Lane A never gets affiliate links", () => {
  process.env.AMAZON_AE_ASSOCIATE_TAG = "ggpc-21"
  process.env.NOON_LINK_TEMPLATE = "https://go.example/r?u={url}"
  assert.equal(new URL(outboundUrl("amazon_ae", AMZ, "A")!).searchParams.has("tag"), false)
  assert.equal(outboundUrl("noon", "https://www.noon.com/p", "A"), "https://www.noon.com/p")
})

test("other stores are untouched and bad URLs return null", () => {
  process.env.AMAZON_AE_ASSOCIATE_TAG = "ggpc-21"
  assert.equal(outboundUrl("microless", "https://www.microless.com/p/1", "B"), "https://www.microless.com/p/1")
  assert.equal(outboundUrl("noon", "javascript:alert(1)", "B"), null)
  assert.equal(outboundUrl("noon", "not a url", "B"), null)
})
