import { Pagination } from '@mantine/core';
import type { ListResponse } from '@app/shared';

/** Numery stron pod listą z serwera (`ListResponse`); nic nie pokazuje, gdy wszystko mieści się na jednej stronie. */
export const ListPagination = ({ data, page, onChange }: {
  data: Pick<ListResponse<unknown>, 'total' | 'pageSize'>;
  page: number;
  onChange: (page: number) => void;
}) => {
  if (data.total <= data.pageSize) return null;
  return <Pagination total={Math.ceil(data.total / data.pageSize)} value={page} onChange={onChange} />;
};
