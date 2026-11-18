import { z } from 'zod';
import { CONTRACT_TYPE_NAME_MAX } from '../constants/contractTypes';
import { personName } from './fields';

/** Okno „Dodaj typ umowy” / „Edytuj typ” (POST i PUT /api/contract-types). */
export const contractTypeSchema = z.object({
  // personName robi dokładnie to, czego trzeba: obcięte spacje, 2–max znaków, puste → wymagane.
  name: personName(CONTRACT_TYPE_NAME_MAX),
});

export type ContractTypeInput = z.input<typeof contractTypeSchema>;
export type ContractTypeData = z.output<typeof contractTypeSchema>;

/** Wiersz listy typów (GET /api/contract-types). */
export interface ContractTypeItem {
  id: number;
  name: string;
  hidden: boolean;
  /** Ilu pracowników ma ten typ (także osoby w archiwum). */
  employeesCount: number;
}

export interface ContractTypesListResponse {
  items: ContractTypeItem[];
}

/** Typ do wyboru w oknie pracownika (tylko widoczne). */
export type SelectableContractType = Pick<ContractTypeItem, 'id' | 'name'>;
