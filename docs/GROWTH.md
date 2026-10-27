# Sub-markets, domains, SEO and the 90-day plan (research as at 27 Oct 2026)

## 1. Which sub-markets, and why

Brokers wrote a record **81.6%** of new home loans in the June 2026 quarter ([MFAA](https://www.mfaa.com.au/news/mortgage-broker-market-share-reaches-record-81-6)), so dependence on brokers is high everywhere. What separates segments is **rule complexity** (where a pre-check adds real value), **loan size**, and **how cheaply we can reach people**.

Referral fee, revenue estimates and settlement-rate assumptions are kept in the private growth plan shared with the broker, not in this public repo.

| Rank | Segment | Site |
|---|---|---|
| 1 | Doctors and dentists (LMI waiver to 95%) | **LMI Waiver Check** (`professionals`) |
| 2 | Nurses, midwives, allied health ($90k-income waiver) | **Nurse Home Loan Check** (`nurses`) |
| 3 | Self-employed, tradies, ABN holders | **Low Doc Check** (`self-employed`) |
| 4 | Australian expats / foreign income | **Expat Loan Check** (`expats`) |
| 5 | Lawyers, accountants, actuaries (90% waivers) | folded into LMI Waiver Check |
| hub | First home buyers and everyone else | **KeyReady** (`core`): duty & scheme content |

**Deprioritised:**
- **ADF / DHOAS:** only three approved DHOAS lenders ([DHOAS fact sheet](https://www.dhoas.gov.au/files/fas03_dhoas_fact_sheet_october_2026.pdf)), and only one of them works through brokers.
- **Temporary visa holders:** foreign persons are banned from buying established dwellings until **30 June 2029** ([FIRB guidance note 6](https://foreigninvestment.gov.au/sites/foreigninvestment.gov.au/files/2026-06/guidance-note-6-residential-land-v5.pdf)).
- **Credit-impaired, retirees, separating buyers:** vulnerable-consumer risk.
- **Generic first home buyers:** saturated, and the MFAA now runs a free readiness check of its own ([Broker News](https://www.brokernews.com.au/news/breaking-news/mfaa-launches-2026-consumer-push-to-funnel-more-borrowers-to-brokers-289029.aspx)).

Record `settled_amount` on each lead in the broker dashboard so the economics are visible by site.

## 2. Compliance — read before launch

- **Referrer exemption is unlikely to fit.** The regulations' referrer exemption (NCCP Regulations reg 25) allows only name, contact details and a brief description to be passed on, and only when the referral is *incidental* to another business. The FBAA told Treasury in May 2026 that "professional lead generation and referral businesses cannot rely on the referral exemption" ([FBAA submission](https://s3-ap-southeast-2.amazonaws.com/os-data-2/fbaa-com-au/documents/may_2026_submission_to_treasury_on_curbing_lead_generation_activity.pdf)). Goodlend is Credit Representative 556461 of Connective Credit Services (ACL 389328). **Recommended:** have Connective appoint the operator's entity as a credit representative too, sponsored by Goodlend, and get a credit lawyer to review the site copy and the referral agreement.
- **ASIC is actively pursuing this model.** It is suing Clark Family Pty Ltd over up to 70 "free assessment" sites that allegedly claimed to compare providers and give tailored recommendations ([ASIC 26-221MR](https://www.asic.gov.au/about-asic/news-centre/find-a-media-release/2026-releases/26-221mr-asic-sues-lead-generation-business-over-alleged-misleading-comparison-claims/)). RG 234, updated 9 June 2026, names lead generators as promoters. The sites therefore:
  - describe the check as a **self-check against lenders' published rules**, never a comparison or recommendation;
  - keep lender names masked;
  - name the **one** broker and its licence at every referral point;
  - disclose that the fee is flat, paid only on settlement, and the same whichever lender is chosen.
- **Privacy:** a privacy policy and collection notice (`/privacy/` on every site), express named-broker consent, no resale, and a note that some processors are overseas.
- **Spam Act:** the only email sent is the transactional confirmation. Any marketing needs separate consent and an unsubscribe link.
- **Community rules:** most finance subreddits ban self-promotion. Disclose your affiliation, answer the question in full in the post, and link only when the tool *is* the answer.

## 3. Domains (checked 27 Oct 2026; confirm at a registrar before buying)

| Site | Recommended | Also free | Notes |
|---|---|---|---|
| LMI Waiver Check | **lmiwaivercheck.com.au** | .au, .com | One site for doctors, dentists, lawyers and accountants, since search intent is shared. Fallback: docloancheck.com.au |
| Nurse Home Loan Check | **nursehomeloan.com.au** | .au (.com taken) | Brand alternative: nurseloancheck (free in all three) |
| Low Doc Check | **lowdoccheck.com.au** | .au, .com | Alternative: tradieloancheck |
| Expat Loan Check | **expatloancheck.com.au** | .au, .com | |
| KeyReady hub | **keyready.au** | — | keyready.com.au and keyready.com are registered by someone else |

- **.com.au rules:** you need an ABN, and keyword names currently qualify as a "service you provide". auDA approved in principle (Aug 2026) removing that keyword path ([auDA](https://www.auda.org.au/news-insights/statements/au-licensing-rules-review-completed-by-external-policy-advisory-panel/)). Register each brand as an **ASIC business name** ($47 for 1 year) and take the matching **.au** too.
- **Budget:** roughly A$20–40 per name per year.
- **When a domain is live:** set `domain` in the site's config and run `npm run build:sites -- --target=domains`. That gives a root-based build per site, ready for a free static host per domain such as Cloudflare Pages.

## 4. SEO and AI-assistant visibility

**Built in:**
- prerendered HTML for every landing page and guide;
- canonical, OpenGraph and JSON-LD (WebApplication, FAQPage, Article, BreadcrumbList);
- `sitemap.xml`;
- `robots.txt` that explicitly allows OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot and Google-Extended;
- `llms.txt`;
- dated, sourced lender-rule tables;
- the MCP server.

**Not done, on purpose:** a sitewide footer link network between sister sites. Google lists that as link spam ([spam policies](https://developers.google.com/search/docs/essentials/spam-policies)). Link contextually instead.

**To do when domains are live:**
- Submit sitemaps to Google Search Console **and Bing Webmaster Tools**. Testing suggests ChatGPT search relies heavily on Bing.
- Ping IndexNow on deploy.
- Make sure Brave indexes the sites; Claude's web search is reported to use it.

**Expectations:** long-tail rankings ("LMI waiver dentist", "ABN 18 months home loan") in 3–6 months, head terms in 12–24 months ([Ahrefs](https://ahrefs.com/blog/how-long-does-it-take-to-rank/)). SEO powers months 4–12. The first 90 days come from the channels below.

## 5. 90-day plan: 100 pre-qualified leads

| Channel | Target | Tactics |
|---|---|---|
| Communities | ~35 | r/ausjdocs, r/AusFinance, r/NursingAU, r/auscorp, r/ADF, Whirlpool, "Australians in London/Singapore/Dubai" groups, Advance.org. Answer questions first; offer AMA-style posts with moderator approval. |
| Partnerships | ~30 | **Accountants and bookkeepers** for self-employed clients after EOFY (highest yield). Hospital JMO societies, medical accountants, nurse union member-benefit pages, relocation agents and international tax accountants for expats. Use co-branded `?utm_source=` links. |
| PR and data stories | ~20 | "We analysed N lenders' Open Banking rates", "What an LMI waiver saves a doctor, by state", the TAS/ACT/WA duty changes. Pitch The Adviser, Mortgage Business, Domain and medical trade press. The weekly data refresh makes this repeatable. |
| Paid tests | ~15 | A$500–1,000 on exact-match long tail only ("nurse LMI waiver", "low doc home loan 1 year ABN"). AU finance CPC averages ~$13 ([Digital8](https://digital8.com.au/how-much-does-running-google-ads-cost-in-australia/)). Run Meta ads through the broker's verified account. |

**Measure everything in the broker dashboard:** leads, contacted and settled by site, plus the `utm_source` on each lead. Kill or double down on each sub-market at day 60.
