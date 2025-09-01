import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import SignInScreen from "../src/screens/SignInScreen";
import { ThemeProvider } from "../src/design/theme";

jest.mock("../src/firebase", () => ({ auth: {} }));

function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("SignInScreen", () => {
  it("renders inputs and enables sign in when valid", () => {
    const { getByTestId } = render(
      <SignInScreen navigation={{ replace: jest.fn() }} />,
      { wrapper: Providers }
    );
    const email = getByTestId("emailInput");
    const yourName = getByTestId("yourNameInput");
    const password = getByTestId("passwordInput");
    fireEvent.changeText(email, "user@example.com");
    fireEvent.changeText(yourName, "Jane Doe");
    fireEvent.changeText(password, "hunter2");
    expect(getByTestId("signInButton")).toBeTruthy();
  });
});
