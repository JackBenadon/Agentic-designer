import { Exa } from "exa-js";
import { config } from "./config";

const exa = new Exa(config.exaApiKey);

const MAX_CATEGORIES = 4;
const RESULTS_PER_CATEGORY = 3;
const EVIDENCE_LENGTH = 320;

export type ProductSearchInput = {
  categories: string[];
  styleAndConstraints: string;
  budget?: number;
  currency?: string;
};

type ExaProductResult = {
  title?: string;
  url: string;
  image?: string;
  highlights?: string[];
};

export function extractListedPrice(
  evidence: string,
  fallbackCurrency = "USD",
): { price: number; currency: string } | null {
  const match = evidence.match(/(?:USD|US\$|\$)\s*([0-9]{1,5}(?:,[0-9]{3})*(?:\.\d{2})?)/i);
  if (!match) return null;

  const price = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(price) ? { price, currency: fallbackCurrency.toUpperCase() } : null;
}

function retailerFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Unknown retailer";
  }
}

function compactEvidence(highlights: string[] = []): string {
  return highlights.join(" ").replace(/\s+/g, " ").trim().slice(0, EVIDENCE_LENGTH);
}

async function searchCategory(category: string, input: ProductSearchInput) {
  const currency = input.currency?.toUpperCase() ?? "USD";
  const categoryBudget = input.budget
    ? Math.floor((input.budget / Math.max(input.categories.length, 1)) * 1.2)
    : null;
  const budgetHint = categoryBudget
    ? `Target a listed price at or below ${currency} ${categoryBudget} so the complete plan stays within budget.`
    : "Prefer good-value products.";
  const query = `${category} ${input.styleAndConstraints} buy online price dimensions ${budgetHint}`;

  const result = (await exa.search(query, {
    type: "auto",
    numResults: RESULTS_PER_CATEGORY,
    objective: `Find a direct retailer product page for a ${category}. ${budgetHint} Exclude blogs, listicles, search pages, and inspiration articles. Prefer pages showing a price and dimensions.`,
    contents: {
      highlights: {
        query: "product name current listed price dimensions material availability",
        maxCharacters: EVIDENCE_LENGTH,
      },
    },
  })) as { results: ExaProductResult[] };

  const candidates = result.results.map((item) => {
    const evidence = compactEvidence(item.highlights);
    return {
      category,
      name: item.title ?? "Untitled product",
      retailer: retailerFromUrl(item.url),
      url: item.url,
      imageUrl: item.image ?? null,
      listedPrice: extractListedPrice(evidence, currency),
      evidence,
      sourceCheckedAt: new Date().toISOString(),
      availabilityConfidence: "unconfirmed" as const,
    };
  });

  const pricedCandidates = candidates
    .filter((candidate) => candidate.listedPrice !== null)
    .sort((a, b) => a.listedPrice!.price - b.listedPrice!.price);
  const withinCategoryBudget = categoryBudget
    ? pricedCandidates.find((candidate) => candidate.listedPrice!.price <= categoryBudget)
    : pricedCandidates[0];

  return withinCategoryBudget ?? pricedCandidates[0] ?? candidates[0] ?? null;
}

export async function searchProducts(input: ProductSearchInput) {
  const categories = [...new Set(input.categories.map((value) => value.trim()).filter(Boolean))].slice(
    0,
    MAX_CATEGORIES,
  );

  const settled = await Promise.allSettled(categories.map((category) => searchCategory(category, input)));
  const products = settled.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
  const unresolvedCategories = categories.filter((_, index) => {
    const result = settled[index];
    return result.status === "rejected" || result.value === null;
  });

  return { products, unresolvedCategories };
}
