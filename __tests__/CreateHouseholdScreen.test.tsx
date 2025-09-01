import React from "react";
import { render } from "@testing-library/react-native";
import CreateHouseholdScreen from "../src/screens/CreateHouseholdScreen";
import { ThemeProvider } from "../src/design/theme";

jest.mock("../src/firebase/providers/HouseholdProvider", () => ({
  useHousehold: () => ({
    selectHousehold: jest.fn(),
    householdId: null,
    households: [],
  }),
}));

jest.mock("../src/firebase", () => ({ auth: { currentUser: null } }));

function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("CreateHouseholdScreen", () => {
  it("renders name inputs", () => {
    const { getByTestId } = render(
      <CreateHouseholdScreen
        navigation={{ replace: jest.fn(), navigate: jest.fn() }}
      />,
      { wrapper: Providers }
    );
    expect(getByTestId("yourNameInput")).toBeTruthy();
    expect(getByTestId("householdNameInput")).toBeTruthy();
  });
});
