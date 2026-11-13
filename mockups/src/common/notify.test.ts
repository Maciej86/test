import { notifications } from '@mantine/notifications';
import { NOTIFICATION_AUTOCLOSE_MS, NOTIFICATION_ERROR_AUTOCLOSE_MS } from '@app/shared';
import { notify } from './notify';

describe('notify', () => {
  it('shows a green success bubble', () => {
    const show = vi.spyOn(notifications, 'show').mockReturnValue('id');
    notify.success('Zapisano');
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Zapisano', color: 'green', autoClose: NOTIFICATION_AUTOCLOSE_MS }),
    );
  });

  it('shows a red error bubble that stays longer', () => {
    const show = vi.spyOn(notifications, 'show').mockReturnValue('id');
    notify.error('Błąd serwera');
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Błąd serwera', color: 'red', autoClose: NOTIFICATION_ERROR_AUTOCLOSE_MS }),
    );
  });
});
