import React, { useState, useEffect } from 'react'
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"
import type { AccountTemplate } from '../../../../types/auth'

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingFields: string[]
  onSave: (account: AccountTemplate) => void
}

const formatKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

export const AddAccountModal = React.memo(function AddAccountModal({ 
  open, 
  onOpenChange, 
  existingFields, 
  onSave 
}: AddAccountModalProps) {
  const [newAccount, setNewAccount] = useState<AccountTemplate>({})

  // Initialize all fields as empty strings when modal opens
  useEffect(() => {
    if (open) {
      const initialAccount: AccountTemplate = {}
      existingFields.forEach(field => {
        initialAccount[field] = ''
      })
      setNewAccount(initialAccount)
    }
  }, [open, existingFields])

  const updateField = (field: string, value: any) => {
    setNewAccount({ ...newAccount, [field]: value })
  }

  const handleSave = () => {
    // Only include non-empty fields
    const accountToSave: AccountTemplate = {}
    Object.entries(newAccount).forEach(([key, value]) => {
      if (value && String(value).trim() !== '') {
        accountToSave[key] = value
      }
    })
    
    if (Object.keys(accountToSave).length > 0) {
      onSave(accountToSave)
      onOpenChange(false)
    }
  }

  const isValid = Object.values(newAccount).some(value => value && String(value).trim() !== '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Fill in the account details. All fields are required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 pr-2">
          <div className="space-y-4 py-4">
            {existingFields.map(field => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field} className="text-sm">
                  {formatKey(field)} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field}
                  value={newAccount[field] || ''}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={`Enter ${formatKey(field).toLowerCase()}`}
                  required
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid}
          >
            Add Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})