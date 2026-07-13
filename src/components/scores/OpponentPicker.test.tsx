import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OpponentPicker } from "@/components/scores/OpponentPicker";

const friends = [
  { id: "friend-1", name: "Mladen Pajic" },
  { id: "friend-2", name: "Marko Djedovic" },
];

describe("OpponentPicker", () => {
  it("renders shortened friend chips and selects a friend", () => {
    const onSelectFriend = vi.fn();
    render(
      <OpponentPicker
        friends={friends}
        selectedFriendId=""
        customName=""
        onSelectFriend={onSelectFriend}
        onCustomNameChange={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Mladen P." }));
    expect(onSelectFriend).toHaveBeenCalledWith("friend-1");
    expect(screen.queryByPlaceholderText("Opponent's name")).not.toBeInTheDocument();
  });

  it("reveals the custom input on demand", () => {
    const onCustomNameChange = vi.fn();
    render(
      <OpponentPicker
        friends={friends}
        selectedFriendId=""
        customName=""
        onSelectFriend={() => undefined}
        onCustomNameChange={onCustomNameChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("Opponent's name"), { target: { value: "Luka" } });
    expect(onCustomNameChange).toHaveBeenCalledWith("Luka");
  });

  it("keeps the custom input open when a custom name is already set", () => {
    render(
      <OpponentPicker
        friends={friends}
        selectedFriendId=""
        customName="Luka"
        onSelectFriend={() => undefined}
        onCustomNameChange={() => undefined}
      />
    );

    expect(screen.getByPlaceholderText("Opponent's name")).toHaveValue("Luka");
  });

  it("shows the input directly when there are no friends", () => {
    render(
      <OpponentPicker
        friends={[]}
        selectedFriendId=""
        customName=""
        onSelectFriend={() => undefined}
        onCustomNameChange={() => undefined}
      />
    );

    expect(screen.getByPlaceholderText("Opponent's name")).toBeInTheDocument();
    expect(screen.getByText("Add friends to pick them with one tap.")).toBeInTheDocument();
  });
});
