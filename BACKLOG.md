# HomeBase Backlog

Known issues and planned work. **Priority levels:** a higher number means more urgent. Level 0 is the lowest.

## Prioritized

| Level | Item | Details |
| --- | --- | --- |
| – | Nothing prioritized right now | |

## Planned: Shopping, Fridge and Chores (agreed 2026-10-11)

Three new sections next to Money. Everything is shared by the household, like expenses.

### Navigation (built)

The bottom bar becomes **Money · Shopping · ＋ · Fridge · Chores**.

- **Money** holds today's expense list and the dashboard as two tabs.
- **＋** adds whatever fits the section you are in: an expense, a shopping item, a fridge item or a chore.
- **Household** moves to a button in the header.

### Shopping (built; see docs/Features.md)

- One section with a tab per list, for example Groceries, Market, Temu, Amazon, Vinted, Facebook Marketplace or IKEA. It starts with a single "Groceries" list.
- **+ New list** creates a list with a name. Lists can be renamed and deleted (with an in-app confirmation).
- Every list works the same way. An item has a name, an optional link, price, quantity and note, and shows who added it. Tick an item when it's bought; ticked items move to a "Done" group that can be cleared.
- **Selling:** any item can be marked "Selling" instead of "Buying", mainly for Facebook Marketplace and Vinted. A selling item has an asking price and a status of *Listed* or *Sold* instead of a tick.

### Fridge (built; see docs/Features.md)

- Its own section, built around what's in the fridge rather than what to buy.
- An item has a name, quantity, an optional expiry date and a note, and shows who added it.
- Items expiring in the next few days show as "Use soon", and expired ones are flagged.
- **Used up** removes the item, and can add it to a shopping list you pick.

### Later: who owns a fridge item

- An optional owner on a fridge item ("Ana's yogurt"), set when adding or editing.
- A household setting, **off by default**, that the owner or an admin can turn on. While it's off, the fridge shows no names at all.
- The database already records who added each item (`added_by_member_id`); it is not shown anywhere.

### Chores (built; see docs/Features.md)

- Its own section, with chores that repeat (daily, weekly, monthly) or happen once.
- Each chore has an assignee. "Done" records who did it and when, then schedules the next time.
- Grouped as Overdue, Today and Upcoming.
- Later: rotating the assignee between members.

### Not in the first version

- Logging an expense when a shopping item is ticked off
- Live updates; the other person's changes appear after a refresh, as with expenses today

## Planned: shopping imports and fridge recipes (agreed 2026-10-11)

### Import into a shopping list from a link (built; see docs/Features.md)

- In a list, **Import from link** takes either a shared list link or a single product link. The items are added to the list you are in, and you see them before they are saved.
- **IKEA shared lists** (the IKEA app's "share favourites"): the link itself holds every item number and quantity, for example `.../favourites/receive-share/10401484:1,20620061:1,...`. For each item, the API reads the public product page `ikea.com/<country>/<lang>/p/-<item number>/` and takes the name, price and photo (`og:title`, `og:image`, and the product's structured data). Checked on 2026-10-11 with a real 10-item share link: name, photo and price (€12.99) all came through.
- **Single product links** (IKEA, Temu, AliExpress, any shop): the API reads the page's name, photo and price where the shop provides them. Some shops (Temu, AliExpress) may block this; the item is then added with the link and you type the name. HomeBase does not try to get around a shop's blocking.
- Items get a small photo when one was found. Importing the same product again into a list adds to its quantity instead of a duplicate.
- The API only fetches `https` pages, with a short timeout and a size limit, and never from private or local network addresses.

### Later: screenshot import

- Read items from screenshots (for example a Temu cart) with AI. Not needed now.

### Recipes from the fridge (built; see docs/Features.md)

- A **Recipes** tab inside Fridge.
- **Our own recipes:** save recipes with a name, ingredients, steps and an optional link. HomeBase shows which ones the fridge can make, and what is missing.
- **AI suggestions:** a "Suggest something" button sends the fridge contents (names and expiry dates only, no names of people) to an AI model and shows a few dishes, in English. A suggestion you like can be saved as one of our recipes.
- **Ranking**, highest first:
  - Recipes that use items expiring soon (the fridge's "Use soon")
  - Fewer missing ingredients
  - Favourites
  - Lower when cooked recently ("Cooked it" records the date)
- **Missing ingredients → shopping list:** one tap adds what is missing to a list you pick.
- Recipes and suggestions are in English. Matching fridge items to ingredients needs to be forgiving ("half a pack of ham" should count as ham); AI can help with this too.

### AI provider and cost (decided 2026-10-12: Google Gemini, free tier)

- The model is called from the API server only, with the key in Render's environment settings, never in the app.
- Anthropic's API is pay-as-you-go; a Claude subscription does not cover an app's API use. A small model (Claude Haiku) costs well under a cent per suggestion, so a household's use should cost cents a month. A monthly spending limit can be set in the Anthropic console.
- Free alternative: some providers (for example Google's Gemini API) have a free tier with rate limits; free tiers may use the requests to train their models.
- The provider sits behind one small server module, so it can be switched later.

## Planned: scan a receipt (idea 2026-10-11)

One of the main features: one photo of a receipt adds the expense and fills the fridge.

- When adding an expense, **Scan receipt** takes a photo or uploads one.
- The API sends the image to an AI model with vision, which reads the shop, date, total and each line item. This uses the same AI provider as recipe suggestions (Google Gemini, see above).
- **Review before saving.** Nothing is saved until you confirm:
  - The expense, filled in: total, date, shop, category (for example Groceries). Editable.
  - The line items, each with a tick for **Add to fridge**. Food is ticked by default. Non-food (cleaning, bathroom) is not, and goes to the inventory once that exists.
  - Short receipt names ("MLEKO 1L 3.2%") are turned into readable ones ("Milk 1 L"), with the quantity.
- Fridge items from a receipt have no expiry date; you can add one afterwards.
- Optional: items on the Groceries list that match what was bought can be ticked off in the same step.
- The photo is not kept by default. Keeping it with the expense can come later.
- If the photo can't be read, you get the normal expense form and nothing is lost.

## Later: household inventory

- A list of what the household owns beyond the fridge, grouped as **Appliances**, **Bathroom** and **Cleaning**, with your own groups possible.
- Appliances: purchase date, price and warranty end; a scanned receipt could be attached as proof of purchase.
- Bathroom and cleaning supplies: quantity, and **Running low** adds them to a shopping list.
- Receipt scanning sends non-food items here.

## Not yet prioritized

- **The API sleeps when idle.** Render's free plan stops the API after about 15 idle minutes, and the next visit waits about 20 seconds (measured: 22 s cold, 0.13 s warm). The app shows a "waking up" message after 3 seconds. Fixes if it becomes a problem: Render's paid plan, or a scheduled ping that keeps it awake.
- **No database access rules (RLS policies): decided to skip for now (2026-10-10).** Row level security is on with no policies, so browsers cannot touch the database at all; only the API (with the secret key) can, and it checks every request. Policies would only add a second layer. Revisit if the browser ever needs direct database access, for example for live updates.
