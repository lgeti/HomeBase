import { useEffect, useState } from 'react'
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Transaction</h2>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount *
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
          <input
            id="amount"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition"
          />
        </div>
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition appearance-none"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.emoji} {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tag / Subcategory */}
      {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
        <div>
          <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="tag"
            name="tag"
            value={formData.tag}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition appearance-none"
          >
            <option value="">Select a type...</option>
            {selectedCategory.subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <input
          id="description"
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Weekly groceries"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition"
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          id="date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition"
        />
      </div>

      {/* Who Paid */}
      <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Who paid?</label>
        <div className="space-y-2">
            {members.map((member) => (
              <label key={member.household_member_id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paidByMemberId"
                  value={member.household_member_id}
                  checked={formData.paidByMemberId === member.household_member_id}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{member.display_name}</span>
              </label>
            ))}
        </div>
      </div>

      {/* Split Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">How to split?</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="splitType"
              value="one"
              checked={formData.splitType === 'one'}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">{getMemberName(members, formData.paidByMemberId)} paid it all</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="splitType"
              value="split"
              checked={formData.splitType === 'split'}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Split equally</span>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-spring-mint/50 bg-spring-mint/10 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            name="isRecurring"
            checked={formData.isRecurring}
            onChange={(e) => setFormData((prev) => ({ ...prev, isRecurring: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-spring-sage-deep focus:ring-spring-sage-deep"
          />
          Repeat this expense
        </label>
        {formData.isRecurring && (
          <div className="mt-3">
            <label htmlFor="recurringFrequency" className="block text-xs font-medium text-gray-600 mb-1">
              Frequency
            </label>
            <select
              id="recurringFrequency"
              name="recurringFrequency"
              value={formData.recurringFrequency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition appearance-none"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-spring-sage-deep text-white rounded-lg font-medium hover:opacity-90 transition"
        >
          Add
        </button>
      </div>
    </form>
  )
}
