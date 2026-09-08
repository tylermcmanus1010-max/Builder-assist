# Phoenix priced building-supply catalog pipeline

This branch replaces the earlier 90-row pilot with a reproducible collection and packaging workflow for the 500-company Phoenix supplier universe.

The collector evaluates every supplier, uses only public unauthenticated sources, checks robots.txt, and retains only listings with a positive numeric public price. It supports public Shopify and WooCommerce catalogs, official product sitemaps, Schema.org Product/Offer data, and conservative product-page metadata. It records a status for every supplier rather than fabricating products, prices, SKUs, or domains when a site is blocked, unpriced, quote-only, account-only, or unavailable.

The release includes compressed CSV datasets, SQLite, a formatted Excel workbook, official image URLs, compressed cover-image archives, supplier coverage, validation results, and checksums. A `COMPLETE_PUBLIC_PRICED_SNAPSHOT` status is the only status that supports a claim of complete public priced-catalog coverage for that supplier. All `PARTIAL`, blocked, or unavailable outcomes remain explicit.
