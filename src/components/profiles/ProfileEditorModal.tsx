'use client';

import React from 'react';
import { AppTranslations } from '@/i18n';
import { ProfileCategory } from '@/types';
import { ModalShell } from '../ui/ModalShell';

interface ProfileEditorModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formName: string;
  formCategory: ProfileCategory;
  formError: string | null;
  t: AppTranslations;
  onNameChange: (val: string) => void;
  onCategoryChange: (cat: ProfileCategory) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Accessible dialog form for creating or editing a household environmental profile. */
export function ProfileEditorModal({
  isOpen,
  isEditing,
  formName,
  formCategory,
  formError,
  t,
  onNameChange,
  onCategoryChange,
  onClose,
  onSubmit,
}: ProfileEditorModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="profile-editor-title"
      title={isEditing ? t.exposure.editMember : t.exposure.addMember}
      maxWidthClassName="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <div>
          <label htmlFor="profile-name-field" className="block font-semibold text-slate-800 mb-1">
            {t.exposure.memberName}
          </label>
          <input
            id="profile-name-field"
            type="text"
            maxLength={60}
            required
            value={formName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="profile-cat-field" className="block font-semibold text-slate-800 mb-1">
            {t.exposure.ageGroup}
          </label>
          <select
            id="profile-cat-field"
            value={formCategory}
            onChange={(e) => onCategoryChange(e.target.value as ProfileCategory)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
          >
            <option value="GENERAL">{t.exposure.roles.GENERAL}</option>
            <option value="CHILD">{t.exposure.roles.CHILD}</option>
            <option value="TEEN">{t.exposure.roles.TEEN}</option>
            <option value="ADULT">{t.exposure.roles.ADULT}</option>
            <option value="SENIOR">{t.exposure.roles.SENIOR}</option>
          </select>
        </div>
        {formError && (
          <p role="alert" className="text-rose-700 font-medium">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
          >
            {t.common.save}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
