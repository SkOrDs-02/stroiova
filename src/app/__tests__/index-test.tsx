import { render, screen } from '@testing-library/react-native';

import Index from '@/app/index';

describe('<Index />', () => {
  test('показує назву гри', async () => {
    await render(<Index />);
    expect(screen.getByRole('header')).toHaveTextContent('Стройова');
  });
});
