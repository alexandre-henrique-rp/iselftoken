"use client"

import { useCallback } from "react"
import FileUploader from "@/components/comp-545"
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

export type FileUploadFieldProps = {
  label: string
  description?: string
  onChange: (file: File | null) => void
  accept?: string
  maxSizeMB?: number
  value?: File | null
}

/**
 * Componente de upload de arquivo genérico para formulários
 * Integrado com react-hook-form via FormField
 */
export function FileUploadField({
  label,
  description,
  onChange,
  accept = "image/svg+xml,image/png,image/jpeg,image/jpg,image/gif,application/pdf",
  maxSizeMB = 5,
}: FileUploadFieldProps) {
  const handleFileChange = useCallback(
    (fileUnknown: unknown) => {
      const file = fileUnknown as File | null
      onChange(file ?? null)
    },
    [onChange]
  )

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <FileUploader
          accept={accept}
          maxSizeMB={maxSizeMB}
          onFileChange={handleFileChange}
        />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  )
}
