import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createClient } from "@sanity/client";

const PROJECT_ID = "inq7tvs6";
const DATASET = "production";

function findToken() {
  if (process.env.SANITY_API_TOKEN?.trim()) return process.env.SANITY_API_TOKEN.trim();
  const candidates = [
    path.join(homedir(), ".config", "sanity", "auth.json"),
    path.join(homedir(), ".local", "share", "sanity", "auth.json"),
    path.join(homedir(), ".sanity", "auth.json"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const data = JSON.parse(readFileSync(file, "utf8"));
      const token = data.token || data.accessToken || data.access_token || data.apiToken;
      if (token) return token;
    } catch {
      // corrupt file — try next candidate
    }
  }
  return null;
}

const token = findToken();
if (!token) {
  console.error(
    "No Sanity token found.\n" +
      "Either:  cd studio && npx sanity login\n" +
      "Or set:  SANITY_API_TOKEN=sk... node scripts/seed-blog.mjs",
  );
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: "2026-11-03",
  useCdn: false,
  token,
  perspective: "published",
});

let n = 0;
const key = () => `k${++n}`;
const span = (text, marks = []) => ({ _type: "span", text, marks, _key: key() });
const blk = (children, opts = {}) => ({
  _type: "block",
  style: opts.style || "normal",
  listItem: opts.listItem,
  markDefs: opts.markDefs || [],
  children,
  _key: key(),
});
const t = (text, marks) => blk([span(text, marks)]);
const heading = (text, style) => ({ ...t(text), style });
const li = (text) => blk([span(text)], { listItem: "bullet" });
const linkBlk = (text, href) => {
  const markKey = key();
  return blk([span(text, [markKey])], { markDefs: [{ _key: markKey, _type: "link", href }] });
};

const IMG = {
  almonds: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/almonds_UOTtyTDyL.jpg",
  mixed: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/mixed_Cb6n5_mP1.jpg",
  gift: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/gift_JYpveUrx4.jpg",
  dates: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/dates_tpfc8hmvA.jpg",
  cashews: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/cashews_qi5c9czgu.jpg",
};

const posts = [
  {
    slug: "5-reasons-almonds-should-be-your-daily-snack",
    title: "5 Reasons Almonds Should Be Your Daily Snack",
    excerpt:
      "From heart health to steady energy — why a handful of almonds a day is one of the simplest habits you can build.",
    tags: ["Health", "Almonds"],
    publishedAt: "2026-10-30T09:00:00.000Z",
    image: IMG.almonds,
    seo: {
      metaTitle: "5 Reasons to Eat Almonds Daily | Dryfruit Adda Blog",
      metaDescription:
        "From heart health to steady energy — 5 science-backed reasons a handful of almonds a day makes a real difference. Serving tips inside.",
    },
    faq: [
      {
        question: "How many almonds should I eat in a day?",
        answer:
          "About 23 almonds (28 grams) is the widely recommended daily handful — enough to deliver good nutrition without loading up on calories.",
      },
      {
        question: "Is it better to soak almonds overnight?",
        answer:
          "Soaking softens the kernel, makes them easier to digest and slightly reduces phytic acid. Peel the skin after soaking for a milder taste — but raw, unsoaked almonds are perfectly fine too.",
      },
      {
        question: "Can people with diabetes eat almonds?",
        answer:
          "Almonds are low on the glycaemic index and their fibre, protein and fat slow how fast sugar enters the bloodstream. Many people include a handful in their daily plan — check with your doctor for what's right for you.",
      },
    ],
    body: [
      t("Almonds have been a staple in Indian kitchens for generations — offered to guests, stirred into milk, eaten raw on an empty stomach. But there is real science behind that habit. A small handful (about 23 almonds, or 28 grams) delivers a remarkable amount of nutrition for very few calories."),
      heading("1. They're good for your heart", "h2"),
      t("Almonds are rich in monounsaturated fat — the same heart-friendly fat found in olive oil — plus vitamin E and magnesium. Regular consumption is linked with lower LDL cholesterol, one of the key markers doctors watch for heart health."),
      heading("2. A brain-friendly snack", "h2"),
      t("Nuts rank among the most brain-friendly foods around. Almonds provide riboflavin and L-carnitine, nutrients associated with neurological activity, while vitamin E protects cells from oxidative stress. That mid-afternoon handful is a smarter pick than a sugary biscuit."),
      heading("3. Steady energy, no sugar crash", "h2"),
      t("Protein, fibre and healthy fat together slow down how fast carbohydrates hit your bloodstream. The result is steady energy for hours instead of the spike-and-crash cycle of refined snacks."),
      heading("4. Supports weight management", "h2"),
      t("It sounds counterintuitive — eating nuts to manage weight — but studies show the satiety almonds provide tends to reduce overall calorie intake later in the day. They're dense, crunchy and satisfying, so a measured portion genuinely curbs hunger."),
      heading("5. Skin and hair nutrition from within", "h2"),
      t("Vitamin E is one of the most studied antioxidants for skin health. Combined with biotin and zinc, daily almonds support skin elasticity and stronger hair — nutrition that shows up on the outside."),
      heading("How to make it a habit", "h3"),
      li("Soak 5–6 almonds overnight and eat them first thing in the morning"),
      li("Add slivered almonds to porridge, salads or yogurt"),
      li("Pair two almonds with a date for a naturally sweet, balanced snack"),
      li("Keep a small office stash in an airtight box so you never skip"),
      blk([span("The best snack is the one you'll actually reach for — make it the one that also does something for you.")], { style: "blockquote" }),
      linkBlk("Browse our raw almonds and cashews in the shop", "/shop?group=dry-fruits"),
    ],
  },
  {
    slug: "how-to-store-dry-fruits-fresh",
    title: "How to Store Dry Fruits So They Stay Fresh for Months",
    excerpt:
      "Air, moisture, heat and light are the four enemies of freshness. Here's how to keep every nut crisp for months.",
    tags: ["Guides", "Storage"],
    publishedAt: "2026-10-24T09:00:00.000Z",
    image: IMG.mixed,
    seo: {
      metaTitle: "How to Store Dry Fruits: Freshness Guide | Dryfruit Adda",
      metaDescription:
        "Air, moisture, heat and light ruin dry fruits fastest. Learn the exact fridge, freezer and pantry rules to keep nuts crisp for months.",
    },
    faq: [
      {
        question: "How long do dry fruits stay fresh?",
        answer:
          "Stored airtight in a cool, dark pantry: 3–6 months. In the fridge: up to 6 months. In the freezer: up to a year for high-oil nuts like walnuts and pistachios.",
      },
      {
        question: "Can I keep dry fruits in the fridge?",
        answer:
          "Yes — and in Indian summers you should. Refrigeration slows oil spoilage. Use airtight containers or our resealable pouches, and take out only what you'll eat that day.",
      },
      {
        question: "How do I know if dry fruits have gone bad?",
        answer:
          "A sharp, bitter or paint-like smell, a cardboard-ish taste and a soft or rubbery texture are the telltale signs. When in doubt, throw them out.",
      },
    ],
    body: [
      t("You can buy the best dry fruits in the world and still lose them to a loose lid or a sunny kitchen shelf. Freshness isn't complicated — it's mostly about denying four things: air, moisture, heat and light."),
      heading("The four enemies of freshness", "h2"),
      li("Air — oxygen slowly turns the natural oils in nuts rancid. The crunch goes first, then the taste."),
      li("Moisture — even a little dampness invites mould, and makes crisp nuts chewy."),
      li("Heat — warm kitchens and sunlight accelerate oil spoilage. A pantry away from the stove is ideal."),
      li("Light — direct light degrades colour and nutrients over time. Opaque containers beat clear jars."),
      heading("Airtight is non-negotiable", "h2"),
      t("Once a pouch is opened, transfer leftovers into an airtight container and press out as much air as you can. Our resealable pouches are built for this — squeeze the air out, zip it shut, and you're good for weeks without any extra work."),
      heading("The fridge and freezer trick", "h2"),
      t("In Indian summers, the fridge is your friend. Refrigerated dry fruits stay fresh for three to six months; walnuts and pistachios, which are higher in oil, benefit the most. For storage beyond six months, freeze them in airtight portions and thaw only what you need."),
      heading("How to tell if they've turned", "h2"),
      li("Smell — a sharp, paint-like or bitter odour means the oils have gone rancid."),
      li("Taste — if they taste bitter or cardboard-like instead of nutty, throw them out."),
      li("Texture — soft, rubbery or overly chewy nuts have absorbed moisture."),
      blk([span("When in doubt, throw it out — rancid oils taste bad and do nothing for you.")], { style: "blockquote" }),
      linkBlk("See how we pack for freshness", "/about"),
    ],
  },
  {
    slug: "art-of-gifting-dry-fruit-hampers",
    title: "The Art of Gifting Dry Fruit Hampers",
    excerpt:
      "Diwali, weddings, corporate gifting — a well-chosen dry fruit hamper says more than another box of sweets.",
    tags: ["Gifting", "Guides"],
    publishedAt: "2026-10-17T09:00:00.000Z",
    image: IMG.gift,
    seo: {
      metaTitle: "Dry Fruit Hampers: The Gifting Guide | Dryfruit Adda Blog",
      metaDescription:
        "Diwali, weddings, corporate gifts — how to pick, personalise and time a dry fruit hamper so it lands perfectly. Ordering deadlines inside.",
    },
    faq: [
      {
        question: "How far in advance should I order a gift hamper?",
        answer:
          "At least one week before you need to hand it over, and two weeks if you're shipping to multiple addresses. Festive weeks are our busiest — earlier is always safer.",
      },
      {
        question: "Do you ship dry fruit hampers across India?",
        answer:
          "Yes — we ship across India with tracking on every box. Free shipping applies on orders above ₹999; express options are available at checkout.",
      },
      {
        question: "Can I customise a hamper?",
        answer:
          "Tell us your budget and who it's for and we'll point you to the right box. For bulk or corporate orders with branding, reach us from the Contact page and we'll build it with you.",
      },
    ],
    body: [
      t("Sweets get eaten in a day. Clothes are hit or miss. A dry fruit hamper, on the other hand, sits on the table for weeks — offered to every guest, nibbled through the festive season. It's the rare gift that feels luxurious and is genuinely useful."),
      heading("Why dry fruits still win as a gift", "h2"),
      li("Universally liked — ages 8 to 80, there's something in every hamper for everyone"),
      li("Long shelf life — no fridge, no urgency, no waste"),
      li("Perceived value — premium nuts and dates signal real thought"),
      li("Health-positive — a gift people don't feel guilty accepting"),
      heading("How to pick the right hamper", "h2"),
      t("Match the hamper to the person, not the occasion. For parents and elders, dates and figs with a jar of saffron land better than anything flashy. For friends and family your own age, a mixed classic — cashews, almonds, pistachios — is the safe crowd-pleaser. For corporate gifting, keep it uniform and branded-looking: identical hampers across the team always photograph better."),
      heading("Presentation matters as much as content", "h2"),
      t("The same nuts in a thoughtful box feel ten times more expensive than loose pouches in a carry bag. Look for rigid boxes, clean lining and a proper seal — the unboxing is part of the gift, especially when it arrives by courier at someone's office."),
      heading("When to order", "h2"),
      t("Festive weeks are the busiest shipping period of the year. Order at least a week before you need to hand it over, and two weeks ahead for multiple addresses. We ship across India with tracking on every box."),
      linkBlk("Explore gift hampers for every budget", "/shop?group=gift-hampers"),
      blk([span("A gift they'll snack on for a month beats a gift they'll forget by evening.")], { style: "blockquote" }),
    ],
  },
  {
    slug: "dates-vs-figs-superfood",
    title: "Dates vs Figs: Which Superfruit Fits Your Day?",
    excerpt:
      "Both are ancient, both are sweet — but dates and figs do very different things for your body. Here's how to choose.",
    tags: ["Health", "Dates"],
    publishedAt: "2026-10-10T09:00:00.000Z",
    image: IMG.dates,
    seo: {
      metaTitle: "Dates vs Figs: Which Is Healthier? | Dryfruit Adda Blog",
      metaDescription:
        "Dates give quick energy; figs win on fibre and calcium. See how these two ancient superfruits compare and how to eat them daily.",
    },
    faq: [
      {
        question: "Are dates or figs better for quick energy?",
        answer:
          "Dates — they're dense in natural sugars that absorb fast, which is why they're the classic pre-workout and fast-breaking fruit. Figs give a slower, steadier rise instead.",
      },
      {
        question: "Can I eat dried dates and figs every day?",
        answer:
          "Yes, in sensible portions — 2–3 dates or 2–3 figs a day is a common amount. They're still dried fruit, so portion size matters if you're watching your sugar intake.",
      },
      {
        question: "Which is better for digestion?",
        answer:
          "Figs — they carry more fibre, which supports regular digestion and keeps you fuller between meals. Soaking dried figs overnight makes them even gentler.",
      },
    ],
    body: [
      t("Dates and figs have travelled with humans for thousands of years — carried across deserts, traded along silk routes, offered in every celebration from Iftar to Diwali. They're both sweet, both natural, but they're not interchangeable."),
      heading("Dates: the quick energy fruit", "h2"),
      t("Dates are dense in natural sugars — glucose and fructose that the body absorbs fast — which makes them the classic pre-workout and break-the-fast food. They're also rich in potassium and magnesium, two minerals that matter for muscle function. If you need energy that arrives quickly, dates are your fruit."),
      heading("Figs: the fibre champion", "h2"),
      t("Figs win on fibre and calcium. The fibre slows sugar absorption, so figs give a gentler, longer rise in energy — better for keeping hunger quiet between meals. Dried figs also carry more of the minerals that support bone health."),
      heading("A simple way to choose", "h2"),
      li("Workout or fast-breaking? Reach for dates"),
      li("Afternoon hunger pangs? A couple of figs will hold you"),
      li("Naturally constipated? The fibre in figs helps"),
      li("Craving dessert? Both beat a chocolate bar — dates stuffed with a walnut are unbeatable"),
      heading("How we like to eat them", "h3"),
      t("Soak both overnight for a softer bite and easier digestion. Stuff dates with almonds or walnuts for a two-ingredient dessert. Chop figs into porridge. Or do what we do at the warehouse — a date, a fig and three cashews, eaten straight from the box."),
      linkBlk("Shop dates, figs and everything in between", "/shop?group=dates-figs"),
      blk([span("Nature already made the perfect snack — our job is just to pack it well.")], { style: "blockquote" }),
    ],
  },
  {
    slug: "why-grade-matters-w240-cashews",
    title: "Why Grade Matters: Inside Our W240 Cashew Standard",
    excerpt:
      "W240, W320, W450 — cashew grades are confusing. Here's what the numbers actually mean and why we only stock one tier.",
    tags: ["Guides", "Cashews"],
    publishedAt: "2026-10-03T09:00:00.000Z",
    image: IMG.cashews,
    seo: {
      metaTitle: "What Is W240 Cashew Grade? Explained | Dryfruit Adda",
      metaDescription:
        "W240, W320, W450 — cashew grades decoded. What the numbers mean, why kernel size matters and what we reject before packing.",
    },
    faq: [
      {
        question: "What does W240 mean in cashews?",
        answer:
          "W stands for Whole and 240 is the number of kernels per pound. Fewer kernels per pound means bigger pieces — W240 is one of the largest commercial grades.",
      },
      {
        question: "Are bigger cashews more nutritious?",
        answer:
          "No — nutrition is the same across grades. Size affects texture, presentation and how evenly they roast, which is why big whole kernels cost more.",
      },
      {
        question: "How should I store cashews?",
        answer:
          "Keep them airtight in a cool, dark place — or in the fridge for longer life. Cashews are high in natural oils, so heat and air are what make them go stale.",
      },
    ],
    body: [
      t("Walk through any wholesale market and you'll hear grades thrown around like currency — W240, W320, W450, LWP, splits. If you've ever wondered what any of it means, here's the short version."),
      heading("Reading the numbers", "h2"),
      t("The W stands for Whole, and the number is how many kernels make up one pound. So W240 means 240 whole kernels per pound — fewer, bigger pieces. W320 means 320 per pound, and W450 means smaller kernels still. Same nut, different size, very different eating experience."),
      heading("Bigger kernels, better bite", "h2"),
      t("Large whole kernels roast more evenly, stay creamier when blended into pastes, and simply look better in a gift box or on a platter. Smaller grades aren't bad — they're just better suited to cooking, grinding and industrial use than to snacking."),
      heading("What we reject before packing", "h2"),
      li("Broken or split kernels — texture and presentation suffer"),
      li("Discoloured or spotted pieces — a sign of uneven processing"),
      li("Over-dried, shrivelled kernels — they turn bitter faster"),
      li("Anything above the moisture limit — the one thing that ruins a whole batch"),
      heading("Why it costs what it costs", "h2"),
      t("W240 costs more because yields are lower — processing plants get fewer usable large kernels from each cashew apple's nut, and grading out the smalls removes a meaningful share of the lot. We buy long-term from trusted processors, which lets us hold a consistent grade instead of gambling on whichever lot is cheapest that month."),
      blk([span("Grade isn't vanity — it's the difference between a snack you finish and a box you forget.")], { style: "blockquote" }),
      linkBlk("Taste the W240 difference in our shop", "/shop?group=nuts-seeds"),
    ],
  },
];

async function uploadCover(url, slug) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch failed: ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const asset = await client.assets.upload("image", buf, { filename: `${slug}.jpg` });
  return { _type: "image", asset: { _type: "reference", _ref: asset._id } };
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const post of posts) {
    const existing = await client.fetch(
      `*[_type == "post" && slug.current == $slug][0]._id`,
      { slug: post.slug },
    );
    if (existing) {
      await client.patch(existing).set({ seo: post.seo, faq: post.faq }).commit();
      updated++;
      console.log(`updated: ${post.slug}`);
      continue;
    }

    const mainImage = await uploadCover(post.image, post.slug);
    const doc = {
      _id: `post-${post.slug}`,
      _type: "post",
      title: post.title,
      slug: { _type: "slug", current: post.slug },
      excerpt: post.excerpt,
      mainImage,
      author: { _type: "object", name: "Dryfruit Adda Team" },
      publishedAt: post.publishedAt,
      tags: post.tags,
      seo: post.seo,
      faq: post.faq,
      body: post.body,
    };
    await client.createIfNotExists(doc);
    created++;
    console.log(`created: ${post.slug}`);
  }

  console.log(`done — created ${created}, updated ${updated}`);
}

main().catch((err) => {
  console.error("seed failed:", err.message);
  process.exit(1);
});
