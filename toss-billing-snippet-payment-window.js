// v0.1 - 결제창(리다이렉트) 전용 스니펫 JS (2026-01-15)
// - 목적: 고객사 사이트에 <script> 하나로 "결제창" 연동
// - 사용 키: API 개별 연동 키(클라이언트/시크릿)
//
// 사용 예) 1) JS 객체로 직접 초기화
// <script src="https://your.cdn.com/toss-billing-snippet-payment-window.js"></script>
// <script>
//   window.TossPaymentWindow.init({
//     apiBase: "https://<PROJECT_REF>.supabase.co/functions/v1",
//     tenantKey: "tenant_key_goatpbn_ko",
//     clientKey: "test_ck_...",
//     amount: 10000,
//     orderName: "구독 결제 1개월",
//     payButtonSelector: "#pay-button",
//     method: "CARD", // 기본값
//     customerKey: "USER_001" // 선택 (없으면 비회원 결제)
//   });
// </script>
//
// 사용 예) 2) data-* 속성으로 자동 초기화(범용)
// <button id="pay-button">결제하기</button>
// <script
//   src="https://your.cdn.com/toss-billing-snippet-payment-window.js"
//   data-api-base="https://<PROJECT_REF>.supabase.co/functions/v1"
//   data-tenant-key="tenant_key_goatpbn_ko"
//   data-client-key="test_ck_..."
//   data-amount="10000"
//   data-order-name="구독 결제 1개월"
//   data-pay-button-selector="#pay-button"
//   data-method="CARD"
// ></script>

(function (global) {
  "use strict";

  function ensureSdkLoaded() {
    return new Promise(function (resolve, reject) {
      if (global.TossPayments) {
        resolve();
        return;
      }
      var script = document.createElement("script");
      script.src = "https://js.tosspayments.com/v2/standard";
      script.async = true;
      script.onload = function () {
        if (!global.TossPayments) {
          reject(new Error("토스 SDK 로딩 실패"));
          return;
        }
        resolve();
      };
      script.onerror = function () {
        reject(new Error("토스 SDK 스크립트 로딩 실패"));
      };
      document.head.appendChild(script);
    });
  }

  function validateConfig(config) {
    if (!config) throw new Error("config가 필요합니다.");
    if (!config.apiBase) throw new Error("apiBase가 필요합니다.");
    if (!config.tenantKey) throw new Error("tenantKey가 필요합니다.");
    if (!config.clientKey) throw new Error("clientKey가 필요합니다.");
    if (!config.amount || Number(config.amount) < 1) throw new Error("amount는 1 이상이어야 합니다.");
    if (!config.orderName) throw new Error("orderName이 필요합니다.");
    if (!config.payButtonSelector) throw new Error("payButtonSelector가 필요합니다.");
  }

  async function createOrder(config) {
    var resp = await fetch(config.apiBase.replace(/\/$/, "") + "/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Key": config.tenantKey,
      },
      body: JSON.stringify({
        amount: Number(config.amount),
        orderName: String(config.orderName),
        metadata: config.metadata || null,
      }),
    });

    var data = await resp.json();
    if (!resp.ok) {
      throw new Error(data && data.error ? data.error : "create-order 실패");
    }
    return data;
  }

  async function attachPayButton(config) {
    await ensureSdkLoaded();

    var button = document.querySelector(config.payButtonSelector);
    if (!button) throw new Error("payButtonSelector 요소를 찾을 수 없습니다.");

    var tossPayments = global.TossPayments(config.clientKey);
    var customerKey = config.customerKey || global.TossPayments.ANONYMOUS;
    var payment = tossPayments.payment({ customerKey: customerKey });

    button.addEventListener("click", async function () {
      try {
        var order = await createOrder(config);
        await payment.requestPayment({
          method: config.method || "CARD",
          amount: { currency: "KRW", value: Number(order.amount) },
          orderId: order.orderId,
          orderName: order.orderName,
          successUrl: order.successUrl,
          failUrl: order.failUrl,
          customerEmail: config.customerEmail,
          customerName: config.customerName,
          customerMobilePhone: config.customerMobilePhone,
        });
      } catch (e) {
        if (typeof config.onError === "function") {
          config.onError(e);
          return;
        }
        alert(e && e.message ? e.message : "결제 요청 중 오류가 발생했습니다.");
      }
    });
  }

  async function init(config) {
    validateConfig(config);
    await attachPayButton(config);
  }

  global.TossPaymentWindow = {
    init: init,
  };

  // 한국어 주석: data-* 속성으로 자동 초기화(옵션)
  // - 여러 사이트에서 "키/금액/버튼 셀렉터"만 바꿔 쉽게 재사용 가능
  (function autoInitFromScriptTag() {
    try {
      var current = document.currentScript;
      if (!current) return;

      var apiBase = current.getAttribute("data-api-base");
      var tenantKey = current.getAttribute("data-tenant-key");
      var clientKey = current.getAttribute("data-client-key");
      var amount = current.getAttribute("data-amount");
      var orderName = current.getAttribute("data-order-name");
      var payButtonSelector = current.getAttribute("data-pay-button-selector");
      var method = current.getAttribute("data-method") || "CARD";

      // 필수값이 없으면 자동 초기화는 건너뜀(수동 init 사용 가능)
      if (!apiBase || !tenantKey || !clientKey || !amount || !orderName || !payButtonSelector) {
        return;
      }

      init({
        apiBase: apiBase,
        tenantKey: tenantKey,
        clientKey: clientKey,
        amount: Number(amount),
        orderName: orderName,
        payButtonSelector: payButtonSelector,
        method: method,
      });
    } catch (e) {
      // 한국어 주석: 자동 초기화 실패는 조용히 무시(수동 init 가능)
      console.warn("[TossPaymentWindow] auto init failed:", e);
    }
  })();
})(window);

