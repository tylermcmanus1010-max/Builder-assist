# Phoenix full priced-product catalog pipeline

This branch replaces the 90-record starter with an executable 500-company collection and release workflow.

## Collection rules

- Attempts every company in the 500-company source list.
- Uses only public, unauthenticated website content.
- Checks robots.txt and does not bypass login, CAPTCHA, paywalls, account-only pricing, or access controls.
- Includes only records with a positive numeric public price.
- Excludes quote-only, call-for-price, login-only, account-only, zero-price, and unpriced listings.
- Preserves the published SKU/model/MPN/GTIN/UPC when supplied and never invents missing identifiers.
- Captures every official product-image URL discovered for each included product and attempts to download every accessible image as a compressed WebP thumbnail.
- Records source URL, product URL, image URL, Phoenix location reference, and observation timestamp.

## Honest meaning of complete

`COMPLETE_PUBLIC_PRICED_SNAPSHOT` means all qualifying records exposed through the site's public catalog method were collected during the run. `PARTIAL`, blocked, unavailable, no-site, and no-public-price statuses are retained and must not be represented as complete.

A static catalog cannot guarantee every item hidden behind a store selector, logged-in trade account, JavaScript-only private API, CAPTCHA, quote request, or blocked crawler. The release therefore includes a supplier-level status and validation report instead of filling those gaps with fabricated products.

## Release output

The GitHub Actions workflow publishes a GitHub Release containing:

- Complete priced-product CSV
- Complete product-image manifest
- Supplier collection status and brand summary
- Searchable SQLite database
- Formatted Excel workbook
- Split product-image ZIP archives
- Validation report, checksums, and release manifest

Prices and stock are point-in-time observations and can vary by ZIP code, store, account, quantity, promotion, tax, delivery method, and date. Phoenix ZIP 85001 is used as the location reference.