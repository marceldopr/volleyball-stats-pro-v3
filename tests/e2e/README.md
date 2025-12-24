# E2E Testing with Playwright

## Setup

### 1. Install Dependencies
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Configure Test Credentials
Create a `.env.test` file or set environment variables:
```bash
E2E_TEST_EMAIL=your-test-account@example.com
E2E_TEST_PASSWORD=YourTestPassword123
```

**Note**: Make sure you have a test account in your Supabase instance.

### 3. Start Development Server
```bash
npm run dev
```

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Specific Test
```bash
npx playwright test match-creation.spec.ts
```

## Test Structure

```
tests/e2e/
├── global-setup.ts          # Auth setup (runs once)
├── helpers/
│   └── test-data.ts          # Data generators & selectors
└── specs/
    ├── match-creation.spec.ts
    ├── match-convocation.spec.ts
    ├── live-match-basic.spec.ts
    └── match-analysis.spec.ts
```

## Test Independence

Each test is **fully independent** and:
- Creates its own match
- Has its own convocation
- Does not depend on other tests
- Can run in any order

## Stable Assertions

Tests use **stable selectors** and assertions:
- ✅ `data-testid` attributes
- ✅ Score numbers
- ✅ Timeline entry counts
- ✅ Server indicators
- ❌ <s>Fragile text content</s>
- ❌ <s>Rotation by click counts</s>

## CI Integration

Tests run automatically on:
- Push to `main`
- Pull Requests

GitHub Secrets needed:
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

## Troubleshooting

### Tests Not Finding Elements
- Verify `data-testid` attributes are added (see DATA_TESTIDS.md)
- Check selectors in `tests/e2e/helpers/test-data.ts`

### Auth Failing
- Verify test credentials are correct
- Check `.auth/user.json` was created

### Timeouts
- Increase timeout in specific test: `test.setTimeout(60000)`
- Check dev server is running on port 5173

## Adding New Tests

1. Create spec file in `tests/e2e/specs/`
2. Import from `test-data.ts`
3. Ensure test is independent (creates own data)
4. Use stable selectors from `SELECTORS` object
5. Add assertions on state, not UI text

## Reports

After test run, view HTML report:
```bash
npx playwright show-report
```

## Next Steps

Implement `data-testid` attributes in components (see DATA_TESTIDS.md).
