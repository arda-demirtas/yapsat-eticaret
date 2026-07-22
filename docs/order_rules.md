# Order Rules

Checkout requires

Shipping address

Payment method

Billing address

---

Before creating an order

Verify

- stock
- product status
- latest price

Never trust frontend prices.

---

Order Status

Pending

Paid

Preparing

Shipped

Delivered

Cancelled

Refunded

---

Valid transitions

Pending → Paid

Paid → Preparing

Preparing → Shipped

Shipped → Delivered

Paid → Cancelled

Delivered → Refunded

Invalid transitions are rejected.

---

Payment

Order becomes paid only after payment gateway verification.

---

Inventory

Decrease stock after successful payment.

Never decrease stock before payment confirmation.

---

Guest checkout

Disabled.