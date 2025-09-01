import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { act } from "react-test-renderer";
import AddTaskScreen from "../src/screens/AddTaskScreen";
import { Providers } from "../test-utils/Providers";

jest.mock("../src/firebase/providers/HouseholdProvider", () => ({
  useHousehold: () => ({ householdId: "hh1" }),
}));

jest.mock("../src/firebase", () => ({ auth: { currentUser: { uid: "u1" } } }));

jest.mock("../src/services/tasks", () => ({
  createTask: jest.fn(async () => "task1"),
}));

jest.mock("../src/services/templates", () => ({
  listTemplates: jest.fn(async () => []),
}));

jest.mock("../src/services/children", () => ({
  listChildren: jest.fn(async () => []),
}));

// Providers include Theme + Toast

describe("AddTaskScreen validation", () => {
  it("disables save when title empty", async () => {
    const { getByTestId } = render(
      <AddTaskScreen navigation={{ goBack: jest.fn() }} route={{}} />,
      { wrapper: Providers }
    );
    await act(async () => {});
    const save = getByTestId("saveButton");
    expect(save.props.accessibilityState.disabled).toBe(true);
  });

  it("event has today's date by default; enables save when title present", async () => {
    const { getByTestId, getByPlaceholderText, queryByText } = render(
      <AddTaskScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { type: "event" } }}
      />,
      { wrapper: Providers }
    );
    await act(async () => {});
    fireEvent.changeText(getByTestId("titleInput"), "Party");
    const save = getByTestId("saveButton");
    expect(save.props.accessibilityState.disabled).toBe(false);
    // No date error should be shown since defaults are today's date
    expect(queryByText(/dateRequiredForEvent/i)).toBeFalsy();
  });

  it("enables save for non-event when title present", async () => {
    const { getByTestId } = render(
      <AddTaskScreen navigation={{ goBack: jest.fn() }} route={{}} />,
      { wrapper: Providers }
    );
    await act(async () => {});
    fireEvent.changeText(getByTestId("titleInput"), "Laundry");
    expect(getByTestId("saveButton").props.accessibilityState.disabled).toBe(
      false
    );
  });

  it("invalid time shows error and disables save", async () => {
    const { getByTestId, getByPlaceholderText, queryByText } = render(
      <AddTaskScreen navigation={{ goBack: jest.fn() }} route={{}} />,
      { wrapper: Providers }
    );
    await act(async () => {});
    fireEvent.changeText(getByTestId("titleInput"), "Chore");
    // Select date via Select dropdowns
    fireEvent.press(getByTestId("dayInput"));
    fireEvent.press(getByTestId("dayInput-option-30"));
    fireEvent.press(getByTestId("monthInput"));
    fireEvent.press(getByTestId("monthInput-option-8"));
    fireEvent.press(getByTestId("yearInput"));
    fireEvent.press(getByTestId("yearInput-option-2025"));
    fireEvent.changeText(getByTestId("timeInput"), "25:99");
    const save = getByTestId("saveButton");
    expect(save.props.accessibilityState.disabled).toBe(true);
    expect(queryByText(/invalidTime/)).toBeTruthy();
  });
});
