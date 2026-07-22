# AGENTS.md

# Project

This project is a modern e-commerce platform.

Your goal is to build production-ready software.

Prioritize maintainability, security, scalability and clean architecture over writing code quickly.

---

# Tech Stack

Backend

- Python 3.12
- FastAPI
- SQLAlchemy 2.x
- PostgreSQL
- Alembic

Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS

Infrastructure

- Docker
- Git
- Redis (Caching)
- Cloudinary (Images)

---

# General Rules

Always:

- Read related files before making changes.
- Reuse existing code.
- Keep code simple.
- Write readable code.
- Keep functions small.
- Prefer composition over inheritance.

Never:

- Delete existing code unless requested.
- Rename public APIs without approval.
- Break backward compatibility.
- Add unnecessary dependencies.

---

# Architecture

Backend layers must always be:

API
↓

Service
↓

Repository
↓

Database

Business logic must never exist inside API routes.

Database queries must never exist inside API routes.

---

# Database Rules

Always

- Use Alembic migrations.
- Use foreign keys correctly.
- Create indexes where appropriate.
- Use transactions when necessary.

Never

- Modify database schema without approval.
- Delete migrations.
- Write raw SQL unless absolutely necessary.

---

# API Rules

Every endpoint must

- validate request data
- validate permissions
- return proper HTTP status codes
- return consistent response models

Use REST conventions.

---

# Authentication

Always protect private endpoints.

Passwords must always be hashed.

Never store plain text passwords.

Never expose sensitive information.

---

# Security

Always

- Validate all user input
- Sanitize uploaded files
- Prevent SQL Injection
- Prevent XSS
- Prevent CSRF where applicable
- Validate permissions
- Store secrets in environment variables

Never

- Hardcode API keys
- Hardcode passwords
- Disable authentication
- Disable authorization

---

# E-commerce Rules

Products

- Soft delete preferred
- Slug required
- SEO-friendly URLs
- Image optimization

Orders

- Never trust frontend prices.
- Calculate totals on backend.
- Validate stock before purchase.
- Reduce stock only after successful payment.

Cart

- Prices should always be refreshed from database.
- Coupons validated on backend.

Payments

- Never trust payment callbacks without verification.
- Verify payment signatures.
- Store payment history.

Inventory

- Prevent negative stock.
- Handle concurrent purchases safely.

---

# Frontend

Use

- Functional components
- React Hooks
- TypeScript strict mode

Avoid

- any
- duplicated logic
- deeply nested components

---

# Code Quality

Every new code must

- include type hints
- be documented if necessary
- follow SOLID
- follow DRY
- follow KISS

Avoid large functions.

Avoid duplicated code.

---

# Error Handling

Always

- Log unexpected errors.
- Return user-friendly messages.
- Avoid exposing internal exceptions.

---

# Logging

Never log

- Passwords
- Tokens
- Payment details
- Credit card information
- Personal information

---

# Performance

Prefer

- Pagination
- Lazy loading
- Database indexes
- Batch queries
- Caching

Avoid

- N+1 queries
- Unnecessary API requests

---

# Testing

Every new feature should include

- Unit tests
- Edge case tests

Bug fixes should include regression tests.

---

# Documentation

When adding a new feature

Update

- API documentation
- Database documentation if needed
- README if setup changes

---

# Before Major Changes

For large features

Always

1. Explain the plan.
2. List affected files.
3. Explain risks.
4. Wait for approval.

---

# Definition of Done

A task is complete only if

- Code compiles
- Tests pass
- Linter passes
- No duplicated code
- Documentation updated
- No obvious security issues remain