# API Guidelines

REST only.

Plural resource names.

Examples

/products

/orders

/users

---

Response format

Success

{
    success: true,
    data: ...
}

Error

{
    success: false,
    message: ...
}

---

Status Codes

200

201

400

401

403

404

409

422

500