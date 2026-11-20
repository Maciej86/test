import { Button, Text } from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MY_LEAVE_PATH, type EmployeeDashboard } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { InfoCard } from '../../../common/InfoCard';
import { PoolCard } from '../../../common/PoolCard';

/** Pula pracownika (ta sama karta co w Moich urlopach) z przyciskiem wniosku; bez puli tylko zdanie. */
export const PoolBox = ({ pool }: { pool: EmployeeDashboard['pool'] }) => {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation();
  if (pool === null) {
    return (
      <InfoCard title={tc('nav.my_leave')}>
        <Text c="dimmed">{t('pool.no_pool')}</Text>
      </InfoCard>
    );
  }
  return (
    <PoolCard
      pool={pool}
      actions={<Button component={Link} to={MY_LEAVE_PATH} leftSection={<ButtonIcon action="add" />}>{t('pool.request')}</Button>}
    />
  );
};
