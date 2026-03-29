# Top 10 Customers Ranking Logic & Caveats

- Intended ranking metric: **lifetime customer revenue** (Shopify Admin `customers` sorted by `TOTAL_SPENT`, descending), because it is the most direct and reliable business value metric available for customer ranking.
- Units: USD (or the store currency returned by Shopify).
- Period: Lifetime (all-time) unless a time-bounded metric is explicitly requested.

## Caveats

- Database/API credentials were not available in this runtime, so no customer records could be retrieved.
- As required, no values were guessed; unknown fields are left blank or marked `N/A`.
