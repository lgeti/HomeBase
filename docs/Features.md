# HomeBase Current Features

## Navigation

- Bottom bar: Money, Shopping, + (add), Home, Chores
- Money holds the expense list and the dashboard as two tabs
- Home holds three tabs: Fridge, Recipes and Inventory
- + adds what fits the section: an expense, a shopping item, a fridge item, a recipe, an inventory item, or a chore
- Household is the button in the header; tapping it again goes back

## Expenses

- Eight categories with emoji, colors and subcategories; adding from a category tab preselects it
- Add an expense: amount, category, type (subcategory), description, date, who paid, and "paid it all" or "split equally"
- The payer defaults to you; the date defaults to today (local date)
- Current-month list per category, newest first, with tap-to-delete (always visible on phones, with a confirmation)
- Tap an expense to edit it in the same sheet ("Edit Transaction", Save); unticking "Repeat this expense" stops a recurring expense. Edits to a recurring expense apply to future repeats; repeats already added stay, and changing its date or frequency never re-adds past ones. Automatically added repeats can be edited but not set to repeat
- Recurring expenses (weekly, monthly, yearly): the server creates each due occurrence automatically, including missed ones, labelled "Added automatically"
- Soft delete: deleted expenses stay in the database but are hidden

## Scan a receipt

- When adding an expense, **Scan receipt** takes a photo and **Photo or PDF** picks a photo or a digital receipt PDF (for example IKEA's); Google Gemini reads the shop, date, total, category and every line, turning receipt shorthand into readable English names ("MLEKO 1L 3.2%" → "Milk 1L 3.2%")
- Nothing is saved until you press Add: the expense fields are filled in and editable, and under them each line has an editable name and a choice of where it goes: **Fridge** (food starts here), an **inventory group** (non-food lines suggest one, such as Bathroom for toilet paper, listed first) or **Don't add** (where non-food starts)
- Open shopping list items that match what was bought are offered for ticking off in the same step
- Inventory items marked running low that the receipt restocks are offered under **Mark restocked** (ticked by default), which clears their running-low flag
- On Add: the expense is saved, lines go to the fridge (no expiry date; add one later) or the inventory (with the line's price and the receipt date), and the chosen shopping items are marked bought
- Photos are shrunk in the browser before upload and PDFs are sent as they are (at most 5 MB); neither is kept or logged; dates in the future or over a year old are ignored; a photo that isn't a readable receipt leaves the form as it was
- Needs `GEMINI_API_KEY` on the API server, like recipe suggestions; limited to 20 scans per household per hour

## Dashboard

- Month navigation with the monthly total and the two previous months
- Category breakdown
- What each member paid, their share, and who owes whom this month
- Totals always count the full amount; a split expense is shared equally between members who have joined

## Shopping

- One tab per list; a household starts with a "Groceries" list
- "+ New list" creates a list (for example Temu, IKEA or Marketplace); lists can be renamed and deleted from the ⋯ menu, with an in-app confirmation; names are unique within a household
- Quick add: type a name at the top of a list and press Enter
- + opens the full item sheet: buying or selling, name, list, quantity, price, link and note; tap an item to edit, move or delete it
- Tick an item when it's bought; a selling item is "Listed" until you tap "Mark sold"
- Bought and sold items move to a "Done" group that can be cleared (with a confirmation)
- Items show who added them; links open in a new tab and only web addresses are accepted
- **Import from link** (the link button next to quick add, or paste a link into quick add): a shared IKEA favourites list imports every item with its name, price, photo and quantity; any other shop's product link imports one item. You see the items first and choose which to add
- When a shop does not let HomeBase read its page (Temu, for example), the item keeps the link and a name guessed from it, which you can change before adding
- Importing a product that is already open on the list adds to its quantity instead of a duplicate
- The API only reads public https pages, with a time and size limit, and never private network addresses
- Deleted lists and items stay in the database but are hidden

## Fridge

- What's in the fridge: name, quantity, optional expiry date and note
- Quick add at the top; + opens the full sheet with quick expiry buttons (Today, 3 days, 1 week, 2 weeks)
- "Use soon" at the top: expired items (in red) and items expiring within 3 days, soonest first; then everything else, dated items first
- "Used up" removes an item and can put it on a shopping list you pick; "Just remove" only removes it
- Tap an item to edit or delete it (delete is for mistakes, with a confirmation)
- Removed items stay in the database but are hidden; the database records whether each was used up or deleted

## Recipes (Home → Recipes)

- The household's own recipes: name, ingredients (one per line), steps, an optional link, and a favourite star
- Ranked against what is in the fridge, best first: recipes that use food expiring soon (already expired a little more), then fewer missing ingredients, favourites higher, and lower if cooked in the last week
- Matching is forgiving: "50 g ham" finds "half a pack of ham", "tomatoes" finds "Cherry tomatoes"; salt, pepper, oil and water always count as at home
- Each recipe shows "You have 2 of 3", which fridge items it would use up, and what is missing; tap it for the ingredients (ticked or not), steps and link
- "Add missing to list" puts the missing ingredients on a shopping list you pick; "Cooked it" records today
- + on the Recipes tab adds a recipe; Edit changes or deletes one (with a confirmation)
- **Suggest recipes from the fridge:** Google Gemini suggests 3 recipes in English that use what is in the fridge, especially what expires soon; each shows what you have, and "Save recipe" keeps it. Only food names, quantities and expiry go to Google, never people's names. Needs `GEMINI_API_KEY` on the API server (and optionally `GEMINI_MODEL`); limited to 10 requests per household per hour. Gemini's free tier may use requests to improve Google's models

## Inventory (Home → Inventory)

- What the household owns beyond the fridge, in groups; a household starts with Appliances, Bathroom and Cleaning, and "+ New group" adds your own (rename or delete from the ⋯ menu, with a confirmation)
- An item has a name, quantity, price, purchase date, warranty end and note; quick buttons set a 1, 2, 3 or 5 year warranty from the purchase date
- Warranties show "Warranty until …", "Warranty ends in N days" (amber, within 60 days) or "Warranty ended …"
- **Running low** puts the item on a shopping list you pick (or just marks it) and moves it to the top in amber; **Restocked** clears it; each group tab counts what is running low
- Quick add at the top of a group; tap an item to edit, move or delete it

## Chores

- Chores that happen once, daily, weekly or monthly, each for one member or for anyone, with an optional note
- Grouped into Overdue, Today and Upcoming, soonest first; each row says when it is due and who last did it
- Tap the circle when it's done: it records who did it and moves the chore to its next date, or finishes a one-time chore; "Undo" right after reverses it
- By default the next date counts from the day it was done: a weekly chore due on the 15th but done on the 11th is next due on the 18th
- "Fixed day" keeps a repeating chore on its day, like bin day: a weekly Monday chore done on Wednesday is next due the following Monday, missed weeks are skipped rather than piling up, and monthly chores on the 31st stay at month end
- Tap a chore to edit or delete it (with a confirmation); a new date, frequency or Fixed day setting restarts the schedule from that date
- Only members who have joined can be given a chore

## Households and members

- Create a household when you first sign in
- Household screen: members with role (owner, admin, member) and status (joined, invited, not invited yet)
- Owners and admins create invite links for an email address; links work for 7 days and only for that email
- Opening an invite link before signing in keeps it through sign-in, sign-up and email confirmation, then joins the household
- Owners can remove anyone except themselves; admins can remove members (quiet ✕ with a confirmation)
- Only members who have joined can pay for or share expenses; invited people count once they accept
- Everyone can change their own display name (unique within the household)
- One household per person: accepting an invite is refused if you already belong to another household

## Sign-in

- Supabase Auth with Google or email and password (PKCE flow)
- Sign-up with password confirmation; sessions survive a refresh
- "Forgot your password?" sends a reset email; the link brings you back to choose a new password
- Sign out from the Household screen
- While the API is waking up (Render free plan), the loading screen explains the wait after 3 seconds

## Live updates

- Changes made on one device show up on the household's other devices within a second or two, without refreshing: expenses, shopping lists, fridge, recipes, inventory, chores and household members
- How: after every successful change, the API sends a short "this section changed" message on the household's private Supabase Realtime channel (`household:<id>`); the apps reload that section through the API. No household data travels through Realtime
- Only signed-in, joined members of a household can listen on its channel (an access rule on `realtime.messages`, `server/db/011_realtime_household_channels.sql`); nobody but the API can send
- Each open copy of the app ignores the news about its own changes; coming back to the app after 30 seconds or more, or reconnecting, reloads everything in case a message was missed
- Fits easily in Supabase's free plan (about 200 connections and 2 million messages a month)

## Security

- Every API route except the health check requires a valid Supabase sign-in token
- Household routes require active membership in that household
- Role rules for inviting and removing members are enforced by the server (`server/src/authorization.js`); the app shows the Remove control using the same file
- Only the live site and local development may call the API from a browser (CORS)
- The database blocks direct browser access (RLS on, no policies); only the API's server key can read and write

## Architecture

```text
React app on GitHub Pages
        |
        | Supabase sign-in token on every request
        v
Express API on Render  ---->  Supabase Auth and PostgreSQL
```

Known gaps and planned work are tracked in `BACKLOG.md`.
