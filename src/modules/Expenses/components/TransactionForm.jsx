import { useEffect, useState } from 'react'
import Icon, { CategoryIcon } from '../../../components/Icon'
import { CATEGORIES } from '../../../config/categories'
import { getMemberName, todayDateString } from '../../../core/utils/calculations'

export default function TransactionForm({ members, onSubmit, onCancel, defaultCategoryId = 'groceries', defaultPayerId }) {
  const defaultPayer = defaultPayerId || members[0]?.household_member_id || ''
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: defaultCategoryId,
    tag: '',
    description: '',
    date: todayDateString(),
    paidByMemberId: defaultPayer,
    splitType: 'one',
    isRecurring: false,
    recurringFrequency: 'monthly',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setFormData((prev) => ({ ...prev, categoryId: defaultCategoryId }))
  }, [defaultCategoryId])

  const selectedCategory = CATEGORIES.find((cat) => cat.id === formData.categoryId)

  // Each category has its own types, so a new category clears the chosen type
  const chooseCategory = (categoryId) => {
    setFormData((prev) => ({ ...prev, categoryId, tag: prev.categoryId === categoryId ? prev.tag : '' }))
  }

  const choose = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }))

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) return

    const expense = {
      categoryId: formData.categoryId,
      amount: parseFloat(formData.amount),
      tag: formData.tag || undefined,
      description: formData.description || undefined,
      date: formData.date,
      paidByMemberId: formData.paidByMemberId,
      splitType: formData.splitType,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.recurringFrequency,
    }

    onSubmit(expense)
    setFormData({
      amount: '',
      categoryId: defaultCategoryId,
      tag: '',
      description: '',
      date: todayDateString(),
      paidByMemberId: defaultPayer,
      splitType: 'one',
      isRecurring: false,
      recurringFrequency: 'monthly',
    })
  }

  const label = 'block text-[13px] font-semibold text-hb-text2 mb-1.5'
  const field = 'w-full rounded-xl border border-hb-input bg-hb-field px-3 py-[11px] text-sm text-hb-text focus:outline-none focus:ring-2 focus:ring-hb-primary transition'
  const segment = (isOn) => `rounded-[10px] px-2 py-2.5 text-sm transition ${
    isOn ? 'bg-hb-seg-on text-hb-text font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-hb-text2 font-medium'
  }`

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <h2 className="text-xl font-semibold text-hb-text">Add Transaction</h2>

      <div>
        <label htmlFor="amount" className={label}>Amount</label>
        <div className="flex items-center gap-1.5 rounded-[14px] border-2 border-hb-input bg-hb-field px-3.5 py-2 transition focus-within:border-hb-primary focus-within:ring-4 focus-within:ring-hb-primary/15">
          <span className="text-[22px] font-semibold text-hb-text2" aria-hidden="true">€</span>
          <input
            id="amount"
            type="number"
            name="amount"
            inputMode="decimal"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full border-none bg-transparent text-2xl font-bold text-hb-text outline-none"
          />
        </div>
        {errors.amount && <p className="text-hb-danger text-xs mt-1">{errors.amount}</p>}
      </div>

      <fieldset>
        <legend className={label}>Category</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const isOn = formData.categoryId === category.id
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => chooseCategory(category.id)}
                aria-pressed={isOn}
                className={`flex items-center gap-1.5 rounded-xl border-[1.5px] px-3 py-2 text-[13px] font-semibold transition ${
                  isOn ? 'text-hb-on-cat' : 'bg-hb-field text-hb-text border-hb-input'
                }`}
                style={isOn ? { backgroundColor: category.color, borderColor: category.color } : undefined}
              >
                <CategoryIcon category={isOn ? { ...category, color: 'currentColor' } : category} size={16} />
                {category.name}
              </button>
            )
          })}
        </div>
        {errors.categoryId && <p className="text-hb-danger text-xs mt-1">{errors.categoryId}</p>}
      </fieldset>

      <div className={`grid gap-2.5 ${selectedCategory?.subcategories?.length ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {selectedCategory?.subcategories?.length > 0 && (
          <div>
            <label htmlFor="tag" className={label}>Type</label>
            <select id="tag" name="tag" value={formData.tag} onChange={handleChange} className={field}>
              <option value="">Choose...</option>
              {selectedCategory.subcategories.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="date" className={label}>Date</label>
          <input id="date" type="date" name="date" value={formData.date} onChange={handleChange} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={label}>Description</label>
        <input
          id="description"
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Weekly groceries"
          className={field}
        />
      </div>

      <div>
        <p id="who-paid" className={label}>Who paid?</p>
        <div
          role="radiogroup"
          aria-labelledby="who-paid"
          className="grid gap-1 rounded-[14px] bg-hb-surface2 p-1"
          style={{ gridTemplateColumns: `repeat(${Math.min(members.length, 3) || 1}, minmax(0, 1fr))` }}
        >
          {members.map((member) => {
            const isOn = formData.paidByMemberId === member.household_member_id
            return (
              <button
                key={member.household_member_id}
                type="button"
                role="radio"
                aria-checked={isOn}
                onClick={() => choose('paidByMemberId', member.household_member_id)}
                className={`truncate ${segment(isOn)}`}
              >
                {member.display_name}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p id="how-to-split" className={label}>How to split?</p>
        <div role="radiogroup" aria-labelledby="how-to-split" className="grid grid-cols-2 gap-1 rounded-[14px] bg-hb-surface2 p-1">
          {[
            { value: 'one', text: `${getMemberName(members, formData.paidByMemberId)} paid it all` },
            { value: 'split', text: 'Split equally' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={formData.splitType === option.value}
              onClick={() => choose('splitType', option.value)}
              className={`truncate ${segment(formData.splitType === option.value)}`}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[14px] bg-hb-primary-tint px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="isRecurring" className="flex items-center gap-2 text-sm font-semibold text-hb-primary">
            <Icon name="repeat" size={16} />
            Repeat this expense
          </label>
          <input
            id="isRecurring"
            type="checkbox"
            name="isRecurring"
            checked={formData.isRecurring}
            onChange={(e) => choose('isRecurring', e.target.checked)}
            className="h-5 w-5"
          />
        </div>
        {formData.isRecurring && (
          <div className="mt-3">
            <label htmlFor="recurringFrequency" className={label}>How often?</label>
            <select
              id="recurringFrequency"
              name="recurringFrequency"
              value={formData.recurringFrequency}
              onChange={handleChange}
              className={field}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 grid grid-cols-2 gap-2.5 bg-hb-sheet pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[14px] border border-hb-input bg-hb-sheet py-3.5 text-[15px] font-semibold text-hb-text hover:bg-hb-surface2 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-[14px] bg-hb-primary py-3.5 text-[15px] font-semibold text-hb-on-primary hover:opacity-90 transition"
        >
          Add
        </button>
      </div>
    </form>
  )
}
