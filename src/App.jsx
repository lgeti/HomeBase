import { useState, useEffect } from 'react'
import { scanReceipt } from './core/api/receiptsApi'
import { useAuth } from './core/auth/useAuth'
import { useChoresApi } from './core/hooks/useChoresApi'
import { useExpensesApi } from './core/hooks/useExpensesApi'
import { useFridgeApi } from './core/hooks/useFridgeApi'
import { useHousehold } from './core/hooks/useHousehold'
import { useRecipesApi } from './core/hooks/useRecipesApi'
import { useShoppingApi } from './core/hooks/useShoppingApi'
import { getJoinedMembers } from './core/utils/calculations'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import BottomNav from './components/BottomNav'
import HouseholdErrorScreen from './components/HouseholdErrorScreen'
import Icon from './components/Icon'
import LoadingScreen from './components/LoadingScreen'
import ProfileSetup from './components/ProfileSetup'
import AuthScreen from './modules/Auth/pages/AuthScreen'
import ChoreForm from './modules/Chores/components/ChoreForm'
import ChoresView from './modules/Chores/pages/ChoresView'
import SetNewPassword from './modules/Auth/pages/SetNewPassword'
import TransactionForm from './modules/Expenses/components/TransactionForm'
import MoneyView from './modules/Expenses/pages/MoneyView'
import FridgeItemForm from './modules/Fridge/components/FridgeItemForm'
import RecipeForm from './modules/Fridge/components/RecipeForm'
import FridgeView from './modules/Fridge/pages/FridgeView'
import RecipesView from './modules/Fridge/pages/RecipesView'
import HouseholdView from './modules/Household/pages/HouseholdView'
import ImportForm from './modules/Shopping/components/ImportForm'
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
  const chores = useChoresApi(household)
  const recipes = useRecipesApi(household)
  const [apiError, setApiError] = useState('')
  // What the bottom sheet shows: { type: 'expense' | 'item' | 'fridge' | 'recipe' | 'chore' | 'import', record } with the record being edited, or null
  const [sheet, setSheet] = useState(null)
  const [activeView, setActiveView] = useState('money')
  const [moneyTab, setMoneyTab] = useState('expenses')
  const [fridgeTab, setFridgeTab] = useState('items')
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
  const handleAddTransaction = async (expense, fromReceipt) => {
    const isHouseholdMember = getJoinedMembers(household?.members || []).some(
      (member) => member.household_member_id === expense.paidByMemberId
    )

    if (!isHouseholdMember) throw new Error('The selected payer is not connected to this household')

    await addExpense(expense)
    setSheet(null)
    if (fromReceipt) await saveReceiptExtras(fromReceipt)
  }

  // After a scanned receipt's expense is saved: put food in the fridge and tick off what was bought.
  // The expense is already saved, so a failure here is reported instead of offering to save again.
  const saveReceiptExtras = async ({ fridgeItems, boughtItems }) => {
    const failed = []
    for (const item of fridgeItems) {
      await fridge.addItem(item).catch(() => failed.push(item.name))
    }
    for (const item of boughtItems) await shopping.setItemStatus(item, 'bought')
    if (failed.length) setApiError(`The expense is saved, but these were not added to the fridge: ${failed.join(', ')}`)
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

  const handleSaveRecipe = async (body) => {
    if (sheet.record) {
      await recipes.editRecipe(sheet.record.id, body)
    } else {
      await recipes.addRecipe(body)
    }
    setSheet(null)
  }

  const handleDeleteRecipe = async () => {
    await recipes.removeRecipe(sheet.record.id)
    setSheet(null)
  }

  const handleSaveChore = async (body) => {
    if (sheet.record) {
      await chores.editChore(sheet.record.id, body)
    } else {
      await chores.addChore(body)
    }
    setSheet(null)
  }

  const handleDeleteChore = async () => {
    await chores.removeChore(sheet.record.id)
    setSheet(null)
  }

  // The + button adds whatever fits the section
  const openAddSheet = () => {
    const type = activeView === 'fridge'
      ? fridgeTab === 'recipes' ? 'recipe' : 'fridge'
      : activeView === 'chores'
        ? 'chore'
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
            onImportLink={(url) => setSheet({ type: 'import', record: { listId: activeListId, url } })}
          />
        ) : activeView === 'fridge' ? (
          <FridgeView
            tab={fridgeTab}
            onTabChange={setFridgeTab}
            recipesView={(
              <RecipesView
                recipes={recipes.recipes}
                fridgeItems={fridge.items}
                lists={shopping.lists}
                isLoading={recipes.isLoading}
                error={recipes.error}
                onFavourite={(recipe) => recipes.editRecipe(recipe.id, { isFavourite: !recipe.isFavourite })}
                onCooked={(recipe, cookedOn) => recipes.markCooked(recipe.id, cookedOn)}
                onAddMissing={(listId, missing) => shopping.importItems(listId, missing.map((name) => ({ name })))}
                onEditRecipe={(recipe) => setSheet({ type: 'recipe', record: recipe })}
                onSuggest={recipes.suggest}
                onSaveSuggestion={({ name, ingredients, steps }) => recipes.addRecipe({ name, ingredients, steps })}
              />
            )}
            items={fridge.items}
            lists={shopping.lists}
            isLoading={fridge.isLoading}
            error={fridge.error}
            onQuickAdd={fridge.addItem}
            onEditItem={(item) => setSheet({ type: 'fridge', record: item })}
            onUsedUp={handleUsedUp}
          />
        ) : activeView === 'chores' ? (
          <ChoresView
            chores={chores.chores}
            members={members}
            isLoading={chores.isLoading}
            error={chores.error}
            onDone={chores.markDone}
            onUndo={chores.undoDone}
            onEditChore={(chore) => setSheet({ type: 'chore', record: chore })}
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
        {sheet?.type === 'recipe' ? (
          <RecipeForm
            key={sheet.record?.id || 'new-recipe'}
            recipe={sheet.record}
            onSubmit={handleSaveRecipe}
            onDelete={handleDeleteRecipe}
            onCancel={closeSheet}
          />
        ) : sheet?.type === 'import' ? (
          <ImportForm
            key={`${sheet.record.listId}-${sheet.record.url}`}
            listName={shopping.lists.find((list) => list.id === sheet.record.listId)?.name}
            initialUrl={sheet.record.url}
            onPreview={(url) => shopping.previewImport(sheet.record.listId, url)}
            onImport={async (items) => {
              await shopping.importItems(sheet.record.listId, items)
              setSheet(null)
            }}
            onCancel={closeSheet}
          />
        ) : sheet?.type === 'chore' ? (
          <ChoreForm
            key={sheet.record?.id || 'new-chore'}
            chore={sheet.record}
            members={joinedMembers}
            onSubmit={handleSaveChore}
            onDelete={handleDeleteChore}
            onCancel={closeSheet}
          />
        ) : sheet?.type === 'fridge' ? (
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
            onScanReceipt={(file, today) => scanReceipt(household.household_id, file, today)}
            shoppingItems={shopping.items}
          />
        ) : null}
      </AddTransactionSheetWrapper>

      <BottomNav activeView={activeView} onNavigate={setActiveView} onAdd={openAddSheet} />
    </div>
  )
}
