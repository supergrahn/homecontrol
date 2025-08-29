import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/design/theme';
import { NavigationContainer } from '@react-navigation/native';
import { MainTabs } from '../src/firebase/providers/NavigationProvider';

describe('MainTabs', () => {
  it.skip('renders tab navigator without crashing', () => {
    const { toJSON } = render(
      <ThemeProvider>
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
      </ThemeProvider>
    );
    expect(toJSON()).toBeTruthy();
  });
});
