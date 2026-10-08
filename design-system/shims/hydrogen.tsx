/**
 * Stand-in for the two `@shopify/hydrogen` money helpers the bundled
 * components use (`useMoney`, `<Money />`). Hydrogen itself needs a router and
 * a storefront context, so the design-system bundle formats money with
 * `Intl.NumberFormat`, returning the same fields under the same names.
 */
type MoneyLike = { amount: string; currencyCode: string };

export function useMoney(money: MoneyLike) {
  const amount = Number.parseFloat(money?.amount ?? "0");
  const currency = money?.currencyCode || "USD";
  const fmt = (opts: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, ...opts });
  const whole = Number.isInteger(amount);
  const withoutTrailingZeros = fmt(
    whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {},
  ).format(amount);
  const narrow = fmt({ currencyDisplay: "narrowSymbol" });
  const currencyNarrowSymbol =
    narrow.formatToParts(amount).find((p) => p.type === "currency")?.value ??
    "";
  const number = new Intl.NumberFormat(
    "en-US",
    whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2 },
  ).format(amount);
  return {
    amount: String(amount),
    currencyCode: currency,
    currencyNarrowSymbol,
    localizedString: fmt({}).format(amount),
    withoutTrailingZeros,
    withoutTrailingZerosAndCurrency: number,
  };
}

export function Money({
  data,
  withoutTrailingZeros,
  className,
}: {
  data: MoneyLike;
  withoutTrailingZeros?: boolean;
  className?: string;
}) {
  const m = useMoney(data);
  return (
    <div className={className}>
      {withoutTrailingZeros ? m.withoutTrailingZeros : m.localizedString}
    </div>
  );
}
