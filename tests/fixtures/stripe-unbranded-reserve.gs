// Exact pre-branding reservation functions from ef4d0bc; synthetic VM compatibility control.
function checkoutRequestBinding(input) {
  const value = JSON.stringify([CHECKOUT_PROTOCOL, input.intent, input.binding, input.email, input.memberCode])
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(n => ((n + 256) % 256).toString(16).padStart(2, "0")).join("")
}
function checkoutReserveV2(input) {
  try {
    if (!input || Object.keys(input).sort().join(",") !== "binding,email,intent,memberCode,ogOrder,order,protocol,requestBinding" || input.protocol !== CHECKOUT_PROTOCOL || !validIntent(input.intent) || !validBinding(input.binding) || !validBinding(input.requestBinding) || input.requestBinding !== checkoutRequestBinding(input)) return checkoutUnavailable()
    let credential = null, rows
    if (input.memberCode !== null) {
      if (!input.memberCode || Object.keys(input.memberCode).sort().join(",") !== "digest,version") return memberCodeUnavailable()
      const payload = { version: input.memberCode.version, email: input.email, digest: input.memberCode.digest }
      memberCodeInput(payload, "check")
      const record = memberCodeFrozen(payload, false).selected
      if (!record.complete || record.digest !== payload.digest) return memberCodeUnavailable()
      credential = { digest: record.digest, issuanceId: record.issuanceId, issuedAt: record.issuedAt }
      rows = memberCodeOrders() // Read-only, including unavailable-code paths.
    }
    const result = checkoutReserve(input, credential, false, rows)
    if (!result.ok) return result
    return { ok: true, protocol: CHECKOUT_PROTOCOL, intent: input.intent, binding: input.binding, requestBinding: input.requestBinding, orderId: result.orderId, og: result.og, replayed: result.replayed, memberCodeMatched: credential !== null }
  } catch (error) { return error && error.message === "member_code_unavailable" ? memberCodeUnavailable() : checkoutUnavailable() }
}
