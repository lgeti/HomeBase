import { useState, useEffect } from 'react'
import { useAuth } from './core/auth/useAuth'
import { useExpensesApi } from './core/hooks/useExpensesApi'
import { useFridgeApi } from './core/hooks/useFridgeApi'
import { useHousehold } from './core/hooks/useHousehold'
import { useShoppingApi } from './core/hooks/useShoppingApi'
import { getJoinedMembers } from './core/utils/calculations'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import BottomNav from './components/BottomNav'
import ComingSoon from './components/ComingSoon'
import HouseholdErrorScreen from './components/HouseholdErrorScreen'
import Icon from './components/Icon'
import LoadingScreen from './components/LoadingScreen'
import ProfileSetup from './components/ProfileSetup'
import AuthScreen from './modules/Auth/pages/AuthScreen'
import SetNewPassword from './modules/Auth/pages/SetNewPassword'
import TransactionForm from './modules/Expenses/components/TransactionForm'
import MoneyView from './modules/Expenses/pages/MoneyView'
import FridgeItemForm from './modules/Fridge/components/FridgeItemForm'
import FridgeView from './modules/Fridge/pages/FridgeView'
import HouseholdView from './modules/Household/pages/HouseholdView'
import ShoppingItemForm from './modules/Shopping/components/ShoppingItemForm'
import ShoppingView from './modules/Shopping/pages/ShoppingView'
import { resolveActiveListId, toggledStatus } from './modules/Shopping/shopping'

export default function App() {
  const {
    user: authUser,
    isLoading: authLoading,
    isConfigured,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    isRecoveringPassword,
    signOut,
  } = useAuth()
  const authUserId = authUser?.id
  const {
    household,
    isLoading: householdLoading,
    lookupError,
    inviteError,
    refreshHousehold,
    createHousehold,
  } = useHousehold(authUserId)
  const { expenses, addExpense, updateExpense, deleteExpense, error: expensesError } = useExpensesApi(household)
  const shopping = useShoppingApi(household)
  const fridge = useFridgeApi(household)
  const [apiError, setApiError] = useState('')
  // What the bottom sheet shows: { type: 'expense' | 'item' | 'fridge', record } with the record being edited, or null
  const [sheet, setSheet] = useState(null)
  const [activeView, setActiveView] = useState('money')
  const [moneyTab, setMoneyTab] = useState('expenses')
  const [selectedCategoryId, setSelectedCategoryId] = useState('groceries')
  const [chosenListId, setChosenListId] = useState(null)

  // Errors belong to the previous account once someone else signs in
  useEffect(() => {
    setApiError('')
  }, [authUserId])

  const handleProfileSet = async (profile) => {
    setApiError('')

    try {
      await createHousehold(profile)
    } catch (error) {
      setApiError(error.message)
    }
  }

  // These throw on failure so the sheet can show the error where the person is looking
  const handleAddTransaction = async (expense) => {
    const isHouseholdMember = getJoinedMembers(household?.members || []).some(
      (member) => member.household_member_id === expense.paidByMemberId
    )

    if (!isHouseholdMember) throw new Error('The selected payer is not connected to this household')

    await addExpense(expense)
    setSheet(null)
  }

  const handleEditTransaction = async (expense) => {
    await updateExpense(sheet.record.id, expense)
    setSheet(null)
  }

  const handleSaveItem = async (body) => {
    if (sheet.record) {
      await shopping.updateItem(sheet.record.id, body)
    } else {
      await shopping.addItem(body)
      setChosenListId(body.listId)
    }
    setSheet(null)
  }

  const handleDeleteItem = async () => {
    await shopping.removeItem(sheet.record.id)
    setSheet(null)
  }

  const handleSaveFridgeItem = async (body) => {
    if (sheet.record) {
      await fridge.updateItem(sheet.record.id, body)
    } else {
      await fridge.addItem(body)
    }
    setSheet(null)
  }

  const handleDeleteFridgeItem = async () => {
    await fridge.removeItem(sheet.record.id)
    setSheet(null)
  }

  const handleUsedUp = async (item, listId) => {
    const shoppingItem = await fridge.markUsedUp(item.id, listId)
    if (shoppingItem) shopping.showNewItem(shoppingItem)
  }

  // The + button adds whatever fits the section; Chores adds an expense until it exists
  const openAddSheet = () => {
    const type = activeView === 'fridge'
      ? 'fridge'
      : activeView === 'shopping' && shopping.lists.length > 0 ? 'item' : 'expense'
    setSheet({ type, record: null })
  }

  const closeSheet = () => setSheet(null)

  if (authLoading) return <LoadingScreen />

  // Came back from a password-reset email: choose a new password before anything else
  if (authUser && isRecoveringPassword) return <SetNewPassword onSave={updatePassword} />

  if (householdLoading) return <LoadingScreen />

  if (!authUser) {
    return (
      <AuthScreen
        isConfigured={isConfigured}
        onGoogleSignIn={signInWithGoogle}
        onPasswordSignIn={signInWithPassword}
        onSignUp={signUpWithPassword}
        onSendPasswordReset={sendPasswordReset}
      />
    )
  }

  if (!household) {
    if (lookupError) return <HouseholdErrorScreen message={lookupError} />

    const initialOwnerName = authUser.user_metadata?.full_name
      || authUser.user_metadata?.name
      || authUser.email?.split('@')[0]

    return (
      <ProfileSetup
        onProfileSet={handleProfileSet}
        initialOwnerName={initialOwnerName}
        errorMessage={apiError || inviteError}
      />
    )
  }

  // All members, for naming the payer of older expenses; only joined members pay and share new ones
  const members = household.members || []
  const joinedMembers = getJoinedMembers(members)
  const errorMessage = apiError || inviteError || expensesError
  const activeListId = resolveActiveListId(shopping.lists, chosenListId)
  const isHouseholdOpen = activeView === 'household'

  return (
    <div className="flex flex-col h-screen bg-hb-bg">
      <header className="bg-hb-surface/95 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-hb-text">{household.name}</h1>
          <p className="truncate text-xs text-hb-text2">
            {joinedMembers.map((member) => member.display_name).join(' · ')}
          </p>
        </div>
        {/* Household moved here to make room for the sections in the bottom bar; tapping it again goes back */}
        <button
          type="button"
          onClick={() => setActiveView(isHouseholdOpen ? 'money' : 'household')}
          aria-pressed={isHouseholdOpen}
          aria-label="Household"
          title="Household"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
            isHouseholdOpen ? 'border-hb-primary bg-hb-primary-tint text-hb-primary' : 'border-hb-border bg-hb-surface text-hb-text2'
          }`}
        >
          <Icon name="users" size={20} />
        </button>
      </header>

      {errorMessage && (
        <div className="bg-hb-danger-bg border-b border-hb-danger/30 px-4 py-2 text-sm text-hb-danger">
          {errorMessage}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeView === 'household' ? (
          <HouseholdView
            household={household}
            currentUserId={authUserId}
            onHouseholdChange={refreshHousehold}
            onSignOut={signOut}
          />
        ) : activeView === 'shopping' ? (
          <ShoppingView
            lists={shopping.lists}
            items={shopping.items}
            members={members}
            activeListId={activeListId}
            isLoading={shopping.isLoading}
            error={shopping.error}
            onSelectList={setChosenListId}
            onAddList={shopping.addList}
            onRenameList={shopping.renameList}
            onDeleteList={shopping.removeList}
            onQuickAdd={shopping.addItem}
            onToggleItem={(item) => shopping.setItemStatus(item, toggledStatus(item))}
            onEditItem={(item) => setSheet({ type: 'item', record: item })}
            onClearDone={shopping.clearDone}
          />
        ) : activeView === 'fridge' ? (
          <FridgeView
            items={fridge.items}
            lists={shopping.lists}
            members={members}
            isLoading={fridge.isLoading}
            error={fridge.error}
            onQuickAdd={fridge.addItem}
            onEditItem={(item) => setSheet({ type: 'fridge', record: item })}
            onUsedUp={handleUsedUp}
          />
        ) : activeView === 'chores' ? (
          <ComingSoon
            icon="chores"
            title="Chores"
            description="Repeating chores and who does them, grouped into overdue, today and upcoming."
          />
        ) : (
          <MoneyView
            tab={moneyTab}
            onTabChange={setMoneyTab}
            expenses={expenses}
            members={members}
            joinedMembers={joinedMembers}
            onEditExpense={(expense) => setSheet({ type: 'expense', record: expense })}
            onDeleteExpense={deleteExpense}
            onCategoryChange={setSelectedCategoryId}
          />
        )}
      </div>

      <AddTransactionSheetWrapper isOpen={Boolean(sheet)} onClose={closeSheet}>
        {sheet?.type === 'fridge' ? (
          <FridgeItemForm
            key={sheet.record?.id || 'new-fridge-item'}
            item={sheet.record}
            onSubmit={handleSaveFridgeItem}
            onDelete={handleDeleteFridgeItem}
            onCancel={closeSheet}
          />
        ) : sheet?.type === 'item' ? (
          <ShoppingItemForm
            key={sheet.record?.id || 'new-item'}
            lists={shopping.lists}
            listId={activeListId}
            item={sheet.record}
            onSubmit={handleSaveItem}
            onDelete={handleDeleteItem}
            onCancel={closeSheet}
          />
        ) : sheet?.type === 'expense' ? (
          <TransactionForm
            key={sheet.record?.id || 'new'}
            expense={sheet.record}
            members={joinedMembers}
            onSubmit={sheet.record ? handleEditTransaction : handleAddTransaction}
            onCancel={closeSheet}
            defaultCategoryId={selectedCategoryId}
            defaultPayerId={joinedMembers.find((member) => member.auth_user_id === authUserId)?.household_member_id}
          />
        ) : null}
      </AddTransactionSheetWrapper>

      <BottomNav activeView={activeView} onNavigate={setActiveView} onAdd={openAddSheet} />
    </div>
  )
}
