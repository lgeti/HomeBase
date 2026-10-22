import Icon from '../../../components/Icon'
import Logo from '../../../components/Logo'
import { PLANS } from '../../../config/plans'

const FEATURES = [
  {
    icon: 'receipt',
    title: 'Scan a receipt, skip the typing',
    text: 'One photo adds the expense, ticks off the shopping list and puts the food in the fridge.',
  },
  {
    icon: 'wallet',
    title: 'Shared money without the awkwardness',
    text: 'See who paid for what and who owes who, without a spreadsheet.',
  },
  {
    icon: 'cart',
    title: 'Shopping lists everyone can see',
    text: 'Add from any phone and watch items tick off live while someone is at the shop.',
  },
  {
    icon: 'fridge',
    title: 'Fridge, pantry and recipe ideas',
    text: 'Know what expires soon and get recipe suggestions from what you already have.',
  },
  {
    icon: 'chores',
    title: 'Chores that share themselves out',
    text: 'Daily, weekly or monthly chores, each for one person or for whoever gets there first.',
  },
  {
    icon: 'tag',
    title: 'Inventory and warranties',
    text: 'Keep track of what the household owns and get a heads-up before a warranty ends.',
  },
]

const STEPS = [
  { title: 'Create your household', text: 'Sign up with Google or email and name your home.' },
  { title: 'Invite the people you live with', text: 'Send a link to a partner, family or flatmates.' },
  { title: 'Run the house together', text: 'Everyone sees the same lists, money and chores, live.' },
]

const scrollToPricing = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })

// What signed-out visitors see: what HomeBase does, what it costs, and the way in
export default function LandingPage({ onSignIn, onSignUp }) {
  return (
    <div className="min-h-screen bg-hb-bg text-hb-text">
      <header className="sticky top-0 z-10 border-b border-hb-border bg-hb-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-lg font-semibold">HomeBase</span>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={scrollToPricing} className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-hb-text2 hover:text-hb-text sm:block">
              Pricing
            </button>
            <button type="button" onClick={onSignIn} className="rounded-lg px-3 py-2 text-sm font-semibold text-hb-text2 hover:text-hb-text">
              Sign in
            </button>
            <button type="button" onClick={onSignUp} className="rounded-lg bg-hb-primary px-3 py-2 text-sm font-semibold text-hb-on-primary hover:opacity-90">
              Get started
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:pt-20">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hb-primary">For every kind of household</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Your home, organized together.</h1>
            <p className="text-lg text-hb-text2">
              HomeBase keeps shared money, shopping, the fridge and chores in one calm app,
              for couples, families and flatmates alike.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onSignUp} className="rounded-lg bg-hb-primary px-6 py-3 font-semibold text-hb-on-primary hover:opacity-90">
                Create a free account
              </button>
              <button type="button" onClick={onSignIn} className="rounded-lg border border-hb-input bg-hb-surface px-6 py-3 font-semibold text-hb-text hover:bg-hb-surface2">
                I already have an account
              </button>
            </div>
            <p className="text-sm text-hb-text3">Free to start. No card needed. Works on any phone.</p>
          </div>

          <HeroPreview />
        </section>

        <section className="border-y border-hb-border bg-hb-surface2/60">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-center text-3xl font-bold">Everything the house runs on</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-hb-text2">
              Small, focused tools that share one household, so nothing gets typed twice.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-hb-border bg-hb-surface p-5">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-hb-primary-tint text-hb-primary">
                    <Icon name={feature.icon} size={22} />
                  </span>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-hb-text2">{feature.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-4 rounded-2xl border border-hb-border bg-hb-surface p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hb-primary-tint text-hb-primary">
                <Icon name="link" size={22} />
              </span>
              <div>
                <h3 className="font-semibold">
                  Works with your AI assistant
                  <span className="ml-2 rounded-full bg-hb-primary-tint px-2 py-0.5 text-xs font-semibold text-hb-primary">Pro</span>
                </h3>
                <p className="mt-1 text-sm text-hb-text2">
                  Connect Claude or another assistant and ask it to add to the shopping list or log an expense for you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">Up and running in a minute</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-2xl border border-hb-border bg-hb-surface p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hb-primary font-semibold text-hb-on-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-hb-text2">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing" className="scroll-mt-16 border-t border-hb-border bg-hb-surface2/60">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-hb-text2">
              Start free. Upgrade the whole household when you want more of the AI.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border bg-hb-surface p-6 ${
                    plan.isHighlighted ? 'border-hb-primary ring-1 ring-hb-primary' : 'border-hb-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    {plan.isHighlighted && (
                      <span className="rounded-full bg-hb-primary-tint px-2.5 py-1 text-xs font-semibold text-hb-primary">Coming soon</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-hb-text2">{plan.summary}</p>
                  <p className="mt-5">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="ml-2 text-sm text-hb-text2">{plan.period}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm">
                        <Icon name="check" size={18} className="mt-0.5 shrink-0 text-hb-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={onSignUp}
                    className={`mt-6 rounded-lg py-3 font-semibold ${
                      plan.isHighlighted
                        ? 'bg-hb-primary text-hb-on-primary hover:opacity-90'
                        : 'border border-hb-input bg-hb-surface text-hb-text hover:bg-hb-surface2'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-hb-text3">Pro is on its way. Prices may change before it launches.</p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 text-center">
          <Logo size={48} className="mx-auto" />
          <h2 className="mt-4 text-3xl font-bold">Bring your household together</h2>
          <p className="mx-auto mt-3 max-w-md text-hb-text2">It takes a minute to set up, and it's free for as long as you like.</p>
          <button type="button" onClick={onSignUp} className="mt-6 rounded-lg bg-hb-primary px-6 py-3 font-semibold text-hb-on-primary hover:opacity-90">
            Create a free account
          </button>
        </section>
      </main>

      <footer className="border-t border-hb-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-hb-text3 sm:flex-row">
          <span>© {new Date().getFullYear()} HomeBase</span>
          <button type="button" onClick={onSignIn} className="hover:text-hb-text">Sign in</button>
        </div>
      </footer>
    </div>
  )
}

// A glimpse of the app, drawn with the same colors, so the page needs no screenshots that go stale
function HeroPreview() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-sm rounded-[2rem] border border-hb-border bg-hb-surface p-4 shadow-lg">
      <div className="rounded-2xl bg-hb-hero p-4 text-hb-on-hero">
        <p className="text-xs opacity-80">This month</p>
        <p className="mt-1 text-3xl font-bold">€842.60</p>
        <p className="mt-1 text-sm opacity-80">Alex owes Sam €36.20</p>
      </div>

      <p className="mt-4 px-1 text-xs font-semibold uppercase tracking-[0.15em] text-hb-text3">Groceries list</p>
      <ul className="mt-2 divide-y divide-hb-border rounded-2xl border border-hb-border">
        {[
          { name: 'Oat milk', done: true },
          { name: 'Tomatoes', done: true },
          { name: 'Dish soap', done: false },
        ].map((item) => (
          <li key={item.name} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${item.done ? 'border-hb-primary bg-hb-primary text-hb-on-primary' : 'border-hb-input'}`}>
              {item.done && <Icon name="check" size={14} strokeWidth={3} />}
            </span>
            <span className={item.done ? 'text-hb-text3 line-through' : 'text-hb-text'}>{item.name}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-hb-warning-bg px-3 py-2.5 text-sm text-hb-warning">
        <Icon name="fridge" size={18} />
        Spinach expires tomorrow
      </div>
      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-hb-success-bg px-3 py-2.5 text-sm text-hb-success">
        <Icon name="chores" size={18} />
        Jordan took out the bins
      </div>
    </div>
  )
}
