"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}

export function CustomModal({ isOpen, onClose, trigger, title, children }: CustomModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {title && (
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-100 text-lg sm:text-xl">{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 w-full sm:w-auto"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
