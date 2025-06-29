import React, { useCallback, useMemo } from 'react'
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Checkbox } from "../../ui/checkbox"
import { CreditCard, Check, Search, Plus, X, Settings, RotateCcw } from "lucide-react"
import type { LoginState, LoginAction } from './login-reducer'
import { PARENT_PROFILES, ENVIRONMENTS } from './login-constants'
import { getAccountTemplates } from '../../../../data/account-templates'
import { AddAccountForm } from './AddAccountForm'
import type { AccountTemplate } from '../../../../types/auth'

interface AccountsTabProps {
  state: LoginState
  dispatch: React.Dispatch<LoginAction>
}

// Helper function moved outside component
const formatKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

export const AccountsTab = React.memo(function AccountsTab({ state, dispatch }: AccountsTabProps) {
  const { config, accountSearch, showAllAccounts, showFieldSelector, selectedFields, showAddAccount, customAccounts, hiddenDefaultAccounts, saveDefaultAccount } = state
  const selectedProfile = PARENT_PROFILES.find((p) => p.id === config.parentProfile)
  const selectedEnvironment = ENVIRONMENTS.find((e) => e.id === config.environment)
  
  const key = useMemo(() => 
    config.parentProfile && config.environment ? `${config.parentProfile}_${config.environment}` : null, 
    [config.parentProfile, config.environment]
  )

  const handleAccountSelect = useCallback((account: AccountTemplate | null) => {
    dispatch({ type: 'SELECT_ACCOUNT', payload: account })
  }, [dispatch])

  const handleAddAccount = useCallback((newAccount: AccountTemplate) => {
    if (key) {
      dispatch({ type: 'ADD_CUSTOM_ACCOUNT', payload: { key, account: newAccount } })
    }
  }, [key, dispatch])

  const handleRemoveAccount = useCallback((isCustomAccount: boolean, index: number, account: AccountTemplate, isSelected: boolean) => {
    if (!key) return
    
    if (isCustomAccount) {
      const visibleDefaultAccounts = getAccountTemplates(config.parentProfile, config.environment).filter((_: AccountTemplate, idx: number) => !hiddenDefaultAccounts[key]?.has(idx))
      const accountIndex = index - visibleDefaultAccounts.length
      dispatch({ type: 'REMOVE_CUSTOM_ACCOUNT', payload: { key, index: accountIndex } })
    } else {
      const defaultAccounts = getAccountTemplates(config.parentProfile, config.environment)
      const defaultIndex = defaultAccounts.findIndex(
        (acc: AccountTemplate) => JSON.stringify(acc) === JSON.stringify(account)
      )
      if (defaultIndex !== -1) {
        dispatch({ type: 'HIDE_DEFAULT_ACCOUNT', payload: { key, index: defaultIndex } })
      }
    }
    
    // Also deselect if this account was selected
    if (isSelected) {
      handleAccountSelect(null)
    }
  }, [config.parentProfile, config.environment, hiddenDefaultAccounts, key, dispatch, handleAccountSelect])

  const handleResetAccounts = useCallback(() => {
    if (key) {
      dispatch({ type: 'RESET_ACCOUNTS', payload: { key } })
    }
  }, [key, dispatch])

  const accounts = useMemo(() => {
    if (!key) return { allAccounts: [], visibleDefaultAccounts: [], availableFields: [] }
    
    const defaultAccounts = getAccountTemplates(config.parentProfile, config.environment)
    const hiddenIndices = hiddenDefaultAccounts[key] || new Set()
    const visibleDefaultAccounts = defaultAccounts.filter((_: AccountTemplate, index: number) => !hiddenIndices.has(index))
    const userAccounts = customAccounts[key] || []
    const allAccounts = [...visibleDefaultAccounts, ...userAccounts]
    
    // Get all unique fields from all accounts
    const allFields = new Set<string>()
    allAccounts.forEach(account => {
      Object.keys(account).forEach(key => allFields.add(key))
    })
    const availableFields = Array.from(allFields).sort()
    
    return { allAccounts, visibleDefaultAccounts, availableFields }
  }, [key, config.parentProfile, config.environment, customAccounts, hiddenDefaultAccounts])

  // Initialize selected fields if empty
  React.useEffect(() => {
    if (selectedFields.length === 0 && accounts.availableFields.length > 0) {
      dispatch({ type: 'SET_UI_STATE', payload: { field: 'selectedFields', value: accounts.availableFields.slice(0, 3) } })
    }
  }, [selectedFields.length, accounts.availableFields, dispatch])

  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts.allAccounts
    
    const searchLower = accountSearch.toLowerCase()
    return accounts.allAccounts.filter(account => {
      return Object.entries(account).some(([key, value]) => {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
        return valueStr.toLowerCase().includes(searchLower) || key.toLowerCase().includes(searchLower)
      })
    })
  }, [accounts.allAccounts, accountSearch])

  const INITIAL_DISPLAY_COUNT = 5
  const displayAccounts = showAllAccounts 
    ? filteredAccounts 
    : filteredAccounts.slice(0, INITIAL_DISPLAY_COUNT)

  const fieldsToShow = selectedFields.length > 0 ? selectedFields : accounts.availableFields.slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-foreground">Select Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose one account to use for this session
          </p>
        </div>
        {config.parentProfile && config.environment && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAddAccount', value: !showAddAccount } })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Account
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAccounts}
              title="Reset to default accounts"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {config.parentProfile && config.environment && (
        <div className="p-3 bg-muted border border-border rounded-md">
          <span className="text-sm font-medium text-foreground/80">
            {selectedProfile?.name || config.parentProfile} - {selectedEnvironment?.name || config.environment} Accounts
          </span>
        </div>
      )}

      {config.parentProfile && config.environment ? (
        <div className="space-y-3">
          {/* Search and settings bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search accounts..."
                value={accountSearch}
                onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'accountSearch', value: e.target.value } })}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showFieldSelector', value: !showFieldSelector } })}
              title="Select fields to display"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Add Account Form */}
          {showAddAccount && (
            <div className="p-4 border border-dashed border-border rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-3">Add New Account</h4>
              <AddAccountForm
                existingFields={accounts.availableFields}
                onSave={handleAddAccount}
                onCancel={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAddAccount', value: false } })}
              />
            </div>
          )}

          {/* Field selector panel */}
          {showFieldSelector && (
            <div className="p-4 border border-border rounded-lg bg-muted space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Select table columns</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_ALL_FIELDS', payload: accounts.availableFields })}
                >
                  Select all
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {accounts.availableFields.map((field) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted-foreground/10 p-1 rounded"
                  >
                    <Checkbox
                      checked={selectedFields.includes(field)}
                      onCheckedChange={() => dispatch({ type: 'TOGGLE_FIELD_SELECTION', payload: field })}
                    />
                    <span>{formatKey(field)}</span>
                  </label>
                ))}
              </div>
              {selectedFields.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Select at least one field to display</p>
              )}
            </div>
          )}

          {/* Table view */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    {fieldsToShow.map(field => (
                      <th key={field} className="px-3 py-2 text-left text-xs font-medium text-foreground/80 uppercase tracking-wider whitespace-nowrap">
                        {formatKey(field)}
                      </th>
                    ))}
                    <th className="w-10 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {displayAccounts.map((account, index) => {
                    const isSelected = config.selectedAccounts?.some(
                      (a: AccountTemplate) => JSON.stringify(a) === JSON.stringify(account)
                    )
                    const isCustomAccount = index >= accounts.visibleDefaultAccounts.length
                    
                    return (
                      <tr
                        key={index}
                        className={`group transition-colors ${
                          isSelected
                            ? "bg-accent hover:bg-accent/80"
                            : "hover:bg-muted"
                        }`}
                      >
                        <td 
                          className="px-3 py-2 cursor-pointer"
                          onClick={() => handleAccountSelect(isSelected ? null : account)}
                        >
                          {isSelected && (
                            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </td>
                        {fieldsToShow.map(field => (
                          <td 
                            key={field} 
                            className="px-3 py-2 text-sm text-foreground whitespace-nowrap cursor-pointer"
                            onClick={() => handleAccountSelect(isSelected ? null : account)}
                          >
                            {account[field] !== undefined ? (
                              typeof account[field] === 'object' 
                                ? JSON.stringify(account[field]) 
                                : String(account[field])
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveAccount(isCustomAccount, index, account, !!isSelected)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            title={isCustomAccount ? "Delete account" : "Remove account"}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Show more/less button */}
          {filteredAccounts.length > INITIAL_DISPLAY_COUNT && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { field: 'showAllAccounts', value: !showAllAccounts } })}
              className="w-full"
            >
              {showAllAccounts 
                ? `Show less` 
                : `Show all ${filteredAccounts.length} accounts`}
            </Button>
          )}

          {/* No results message */}
          {filteredAccounts.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No accounts found matching "{accountSearch}"
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center border border-border rounded-lg bg-muted">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Please select both Parent Profile and Environment first
          </p>
        </div>
      )}

      {config.selectedAccounts && config.selectedAccounts.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Account selected
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={saveDefaultAccount}
              onCheckedChange={(checked: boolean) => dispatch({ type: 'SET_UI_STATE', payload: { field: 'saveDefaultAccount', value: checked } })}
            />
            <span className="text-sm text-foreground/80">Set as default account for {selectedProfile?.name} - {selectedEnvironment?.name}</span>
          </label>
        </div>
      )}
      
      {(!config.selectedAccounts || config.selectedAccounts.length === 0) && config.parentProfile && config.environment && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Please select an account to continue
          </p>
        </div>
      )}
    </div>
  )
})