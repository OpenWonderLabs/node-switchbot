# Test Suite Structure

This directory contains all automated tests for the project, organized by domain for clarity and maintainability.

- **devices/**: Tests for individual device classes and features
- **apis/**: Tests for API integrations and endpoints
- **types/**: Type/interface validation and type-level tests
- **utils/**: Shared test utilities, mocks, and their own tests
- **integration/**: End-to-end or scenario-based integration tests

## Conventions
- Place each device or feature test in its respective folder.
- Use the utils/ folder for reusable mocks, fixtures, and helpers.
- Add new folders as the project grows, following this pattern.

---

Feel free to update this file as the test suite evolves.