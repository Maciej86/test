import { useState, type ReactNode } from 'react';
import { TextInput } from '@mantine/core';
import { ConfirmModal } from './ConfirmModal';

/**
 * Usunięcie na stałe po wpisaniu nazwy (projekt, konto z archiwum): czerwony przycisk działa dopiero, gdy wpisany
 * tekst bez spacji na końcach jest równy `name`; `onConfirm` dostaje ten obcięty tekst (serwer sprawdza go jeszcze raz).
 *
 *   <ConfirmByNameModal title={t('delete_title')} confirmLabel={t('delete')} name={project.name}
 *                       inputLabel={t('type_name')} loading={remove.isPending} onConfirm={confirm} onClose={onClose}>
 *     <Text>{t('delete_text')}</Text>
 *   </ConfirmByNameModal>
 */
export const ConfirmByNameModal = ({ title, confirmLabel, name, inputLabel, loading = false, onConfirm, onClose, children }: {
  title: string;
  confirmLabel: string;
  name: string;
  inputLabel: string;
  loading?: boolean;
  onConfirm: (typedName: string) => void;
  onClose: () => void;
  children: ReactNode;
}) => {
  const [typed, setTyped] = useState('');
  const trimmed = typed.trim();
  return (
    <ConfirmModal
      title={title}
      confirmLabel={confirmLabel}
      confirmAction="delete"
      danger
      loading={loading}
      confirmDisabled={trimmed !== name}
      onConfirm={() => onConfirm(trimmed)}
      onClose={onClose}
    >
      {children}
      <TextInput label={inputLabel} value={typed} onChange={(e) => setTyped(e.currentTarget.value)} data-autofocus />
    </ConfirmModal>
  );
};
