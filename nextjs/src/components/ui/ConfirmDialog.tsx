'use client'

import React from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'primary'
  isLoading?: boolean
  highlightText?: string
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  highlightText,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground break-words">
          {highlightText ? (
            <>
              {message.split(highlightText)[0]}
              <span className="font-medium text-foreground break-all">{highlightText}</span>
              {message.split(highlightText)[1]}
            </>
          ) : (
            message
          )}
        </p>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
