# Phoenix full priced-product catalog run

The full 500-company public catalog workflow is triggered by this commit on September 8, 2026.

Collection rules:

- Include only products with a positive public numeric price.
- Exclude call-for-price, request-a-quote, login-only, account-only, and unpriced listings.
- Preserve published SKU, model, GTIN/UPC, specifications, product URL, price scope, and observation time.
- Preserve all discovered official product-image URLs and download available product photos into SKU-traceable image archives.
- Mark every supplier as complete, partial, blocked, unavailable, unpriced, or unverifiable; never invent missing data.
