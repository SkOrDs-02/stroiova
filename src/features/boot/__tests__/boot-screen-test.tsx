// 009 AC-19, FR-28: «коротке» — лише лого; після 1 с — «довге» з неписаною істиною, тап гортає.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { BootScreen } from '../BootScreen';

describe('<BootScreen />', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('0,6 с — коротке; 1,5 с — довге; тап гортає істину', async () => {
    await render(<BootScreen migrating={false} />);
    await act(async () => { jest.advanceTimersByTime(600); });
    expect(screen.queryByTestId('boot-truth')).toBeNull();
    await act(async () => { jest.advanceTimersByTime(900); });
    const first = screen.getByTestId('boot-truth').props.children;
    expect(screen.getByTestId('boot-truth')).toHaveTextContent(/Неписана істина №/);
    await fireEvent.press(screen.getByTestId('boot-truth'));
    expect(screen.getByTestId('boot-truth').props.children).not.toEqual(first);
  });

  test('міграція (FR-10)', async () => {
    await render(<BootScreen migrating />);
    expect(screen.getByTestId('boot-migration')).toHaveTextContent(/Переносимо особову справу/);
  });
});
