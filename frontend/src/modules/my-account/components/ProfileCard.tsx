import { Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MyAccount } from '@app/shared';
import { DateText } from '../../../common/DateText';
import { DetailRow } from '../../../common/DetailRow';
import { InfoCard } from '../../../common/InfoCard';
import { RoleBadge } from '../../../common/RoleBadge';

/** „Moje dane”: tylko do odczytu, zmienia je administrator w Pracownikach. */
export const ProfileCard = ({ account }: { account: MyAccount }) => {
  const { t } = useTranslation('my-account');
  const { t: tCommon } = useTranslation();
  return (
    <InfoCard title={t('data')}>
      <Stack gap={10}>
        <Text ff="heading" fw={600} fz="xl">{account.name}</Text>
        <DetailRow label={t('login')}>{account.login}</DetailRow>
        <DetailRow label={t('role')}><RoleBadge role={account.role} /></DetailRow>
        <DetailRow label={t('hired_on')}><DateText value={account.hiredOn} /></DetailRow>
        <DetailRow label={t('contract_type')}>
          {account.contractTypeName ?? <Text span size="sm" c="dimmed">{tCommon('empty_value')}</Text>}
        </DetailRow>
      </Stack>
      <Text size="xs" c="dimmed" mt="xs">{t(account.role === 'admin' ? 'readonly_hint_admin' : 'readonly_hint')}</Text>
    </InfoCard>
  );
};
