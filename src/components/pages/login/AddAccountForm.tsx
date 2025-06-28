import React, { useState } from 'react'
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Checkbox } from "../../ui/checkbox"
import type { AccountTemplate } from '../../../../types/auth'

interface AddAccountFormProps {
  existingFields: string[]
  onSave: (account: AccountTemplate) => void
  onCancel: () => void
}

const formatKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

export const AddAccountForm = React.memo(function AddAccountForm({ existingFields, onSave, onCancel }: AddAccountFormProps) {
  const [newAccount, setNewAccount] = useState<AccountTemplate>({})
  const [fieldInputs, setFieldInputs] = useState<Record<string, boolean>>({})

  const handleFieldToggle = (field: string) => {
    if (fieldInputs[field]) {
      const updated = { ...newAccount }
      delete updated[field]
      setNewAccount(updated)
    }
    setFieldInputs({ ...fieldInputs, [field]: !fieldInputs[field] })
  }

  const updateField = (field: string, value: any) => {
    setNewAccount({ ...newAccount, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select fields to include:</Label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded">
          {existingFields.map(field => (
            <label key={field} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
              <Checkbox
                checked={fieldInputs[field] || false}
                onCheckedChange={() => handleFieldToggle(field)}
              />
              <span>{formatKey(field)}</span>
            </label>
          ))}
        </div>
      </div>

      {Object.keys(fieldInputs).filter(f => fieldInputs[f]).length > 0 && (
        <div className="space-y-3 border-t pt-3">
          {Object.keys(fieldInputs).filter(f => fieldInputs[f]).map(field => (
            <div key={field} className="space-y-2">
              <Label className="text-sm">{formatKey(field)}</Label>
              <Input
                value={newAccount[field] || ''}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder={`Enter ${formatKey(field).toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t">
        <Button
          size="sm"
          onClick={() => onSave(newAccount)}
          disabled={Object.keys(newAccount).length === 0}
        >
          Add Account
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
})