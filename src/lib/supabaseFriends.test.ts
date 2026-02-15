import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMockHarness, type SupabaseMockHarness } from "@/test/supabaseMock";

let harness: SupabaseMockHarness;
let supabaseFriends: typeof import("@/lib/supabaseFriends").supabaseFriends;

describe("supabaseFriends", () => {
  beforeEach(async () => {
    vi.resetModules();
    harness = createSupabaseMockHarness();
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: harness.supabase,
    }));
    ({ supabaseFriends } = await import("@/lib/supabaseFriends"));
  });

  it("rejects self invitation", async () => {
    await expect(supabaseFriends.sendFriendInvitation("user@example.com")).rejects.toThrow(
      "You cannot send a friend invitation to yourself"
    );
  });

  it("throws when unauthenticated user sends invitation", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.sendFriendInvitation("friend@example.com")).rejects.toThrow("User not authenticated");
  });

  it("sends invitation when receiver exists but users are not friends", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    const profilesBuilder = harness.getBuilder("profiles");
    invitationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    profilesBuilder.maybeSingle.mockResolvedValueOnce({
      data: { user_id: "friend-2" },
      error: null,
    });
    harness.supabase.rpc.mockResolvedValueOnce({
      data: false,
      error: null,
    });
    invitationsBuilder.single.mockResolvedValueOnce({
      data: { id: "inv-false", receiver_email: "friend@example.com", status: "pending" },
      error: null,
    });

    const invitation = await supabaseFriends.sendFriendInvitation("friend@example.com");
    expect(invitation.id).toBe("inv-false");
  });

  it("rejects when invitation already exists", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    invitationsBuilder.maybeSingle.mockResolvedValue({
      data: { id: "invitation-1" },
      error: null,
    });

    await expect(supabaseFriends.sendFriendInvitation("friend@example.com")).rejects.toThrow(
      "A pending invitation already exists for this email"
    );
  });

  it("creates invitation when checks pass", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    const profilesBuilder = harness.getBuilder("profiles");

    invitationsBuilder.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    profilesBuilder.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    invitationsBuilder.single.mockResolvedValue({
      data: { id: "invitation-1", receiver_email: "friend@example.com", status: "pending" },
      error: null,
    });

    const invitation = await supabaseFriends.sendFriendInvitation("friend@example.com", "Join me");
    expect(invitation.id).toBe("invitation-1");
    expect(invitationsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_id: "user-1",
        receiver_email: "friend@example.com",
        message: "Join me",
        status: "pending",
      })
    );
  });

  it("loads received invitations with sender names", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");

    profilesBuilder.single.mockResolvedValueOnce({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.order.mockResolvedValue({
      data: [{ id: "inv-1", sender_id: "friend-1", receiver_email: "user@example.com", status: "pending" }],
      error: null,
    });
    profilesBuilder.maybeSingle.mockResolvedValue({
      data: { name: "Friend Name" },
      error: null,
    });

    const receivedInvitations = await supabaseFriends.getReceivedInvitations();
    expect(receivedInvitations[0].sender_name).toBe("Friend Name");
  });

  it("returns empty received invitation list when data is null", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    profilesBuilder.single.mockResolvedValueOnce({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.order.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    const result = await supabaseFriends.getReceivedInvitations();
    expect(result).toEqual([]);
  });

  it("accepts invitation by creating friendship and updating status", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    const friendshipsBuilder = harness.getBuilder("friendships");

    profilesBuilder.single.mockResolvedValue({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.single.mockResolvedValue({
      data: { id: "inv-1", sender_id: "friend-2", receiver_email: "user@example.com", status: "pending" },
      error: null,
    });

    await supabaseFriends.acceptInvitation("inv-1");

    expect(friendshipsBuilder.insert).toHaveBeenCalledWith({
      user1_id: "friend-2",
      user2_id: "user-1",
    });
    expect(invitationsBuilder.update).toHaveBeenCalledWith({ status: "accepted" });
  });

  it("orders friendship ids when sender id is greater than current user id", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    const friendshipsBuilder = harness.getBuilder("friendships");

    profilesBuilder.single.mockResolvedValue({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.single.mockResolvedValue({
      data: { id: "inv-2", sender_id: "z-user", receiver_email: "user@example.com", status: "pending" },
      error: null,
    });

    await supabaseFriends.acceptInvitation("inv-2");

    expect(friendshipsBuilder.insert).toHaveBeenCalledWith({
      user1_id: "user-1",
      user2_id: "z-user",
    });
  });

  it("declines invitation", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");

    profilesBuilder.single.mockResolvedValue({
      data: { email: "user@example.com" },
      error: null,
    });
    await supabaseFriends.declineInvitation("inv-1");
    expect(invitationsBuilder.update).toHaveBeenCalledWith({ status: "declined" });
  });

  it("gets friends list through rpc", async () => {
    harness.supabase.rpc.mockResolvedValue({
      data: [{ friend_id: "friend-1", friend_name: "Ana", friend_email: "ana@example.com" }],
      error: null,
    });
    const friends = await supabaseFriends.getFriends();
    expect(friends).toHaveLength(1);
    expect(harness.supabase.rpc).toHaveBeenCalledWith("get_user_friends", {
      target_user_id: "user-1",
    });
  });

  it("uses provided auth context without calling getUser for friends list", async () => {
    harness.supabase.rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await supabaseFriends.getFriends("known-user-id");

    expect(harness.supabase.auth.getUser).not.toHaveBeenCalled();
    expect(harness.supabase.rpc).toHaveBeenCalledWith("get_user_friends", {
      target_user_id: "known-user-id",
    });
  });

  it("uses provided auth context without calling getUser for received invitations", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    invitationsBuilder.order.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await supabaseFriends.getReceivedInvitations("known-user-id", "known@example.com");

    expect(harness.supabase.auth.getUser).not.toHaveBeenCalled();
    expect(invitationsBuilder.eq).toHaveBeenCalledWith("receiver_email", "known@example.com");
  });

  it("returns null when searching own email", async () => {
    const result = await supabaseFriends.searchUserByEmail("user@example.com");
    expect(result).toBeNull();
  });

  it("throws when unauthenticated user requests sent invitations", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.getSentInvitations()).rejects.toThrow("User not authenticated");
  });

  it("throws when sent invitations query returns error", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    invitationsBuilder.order.mockResolvedValueOnce({
      data: null,
      error: new Error("sent query failed"),
    });
    await expect(supabaseFriends.getSentInvitations()).rejects.toThrow("sent query failed");
  });

  it("returns empty array when sent invitations data is null", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    invitationsBuilder.order.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    const sentInvitations = await supabaseFriends.getSentInvitations();
    expect(sentInvitations).toEqual([]);
  });

  it("returns empty array when friends rpc data is null", async () => {
    harness.supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(supabaseFriends.getFriends()).resolves.toEqual([]);
  });

  it("rejects invitation when users are already friends", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    const profilesBuilder = harness.getBuilder("profiles");
    invitationsBuilder.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    profilesBuilder.maybeSingle.mockResolvedValue({
      data: { user_id: "friend-2" },
      error: null,
    });
    harness.supabase.rpc.mockResolvedValueOnce({
      data: true,
      error: null,
    });

    await expect(supabaseFriends.sendFriendInvitation("friend@example.com")).rejects.toThrow(
      "You are already friends with this user"
    );
  });

  it("removes friend by deleting friendship relation", async () => {
    const friendshipsBuilder = harness.getBuilder("friendships");
    await supabaseFriends.removeFriend("friend-9");
    expect(friendshipsBuilder.or).toHaveBeenCalledWith(
      "and(user1_id.eq.user-1,user2_id.eq.friend-9),and(user1_id.eq.friend-9,user2_id.eq.user-1)"
    );
  });

  it("throws when invitation to accept is missing", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    profilesBuilder.single.mockResolvedValue({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.single.mockResolvedValue({
      data: null,
      error: new Error("missing"),
    });
    await expect(supabaseFriends.acceptInvitation("inv-missing")).rejects.toThrow(
      "Invitation not found or already processed"
    );
  });

  it("searches user by email and returns null on query error", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    profilesBuilder.single.mockResolvedValueOnce({
      data: { user_id: "user-2", name: "Friend", email: "friend@example.com" },
      error: null,
    });
    const foundUser = await supabaseFriends.searchUserByEmail("friend@example.com");
    expect(foundUser?.name).toBe("Friend");

    profilesBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: "not found" },
    });
    const missingUser = await supabaseFriends.searchUserByEmail("missing@example.com");
    expect(missingUser).toBeNull();
  });

  it("throws when unauthenticated user searches by email", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.searchUserByEmail("friend@example.com")).rejects.toThrow("User not authenticated");
  });

  it("throws when invitation insert fails", async () => {
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    const profilesBuilder = harness.getBuilder("profiles");

    invitationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    profilesBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    invitationsBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error("insert failed"),
    });

    await expect(supabaseFriends.sendFriendInvitation("friend@example.com")).rejects.toThrow("insert failed");
  });

  it("handles unauthenticated and missing-profile branches for received invitations", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.getReceivedInvitations()).rejects.toThrow("User not authenticated");

    const profilesBuilder = harness.getBuilder("profiles");
    harness.supabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", email: null },
      },
    });
    profilesBuilder.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(supabaseFriends.getReceivedInvitations()).rejects.toThrow("User profile not found");
  });

  it("throws when received invitation query fails", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");

    profilesBuilder.single.mockResolvedValueOnce({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.order.mockResolvedValueOnce({
      data: null,
      error: new Error("received failed"),
    });

    await expect(supabaseFriends.getReceivedInvitations()).rejects.toThrow("received failed");
  });

  it("uses Unknown User fallback when sender profile is missing", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");

    profilesBuilder.single.mockResolvedValueOnce({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.order.mockResolvedValueOnce({
      data: [{ id: "inv-1", sender_id: "friend-1", receiver_email: "user@example.com", status: "pending" }],
      error: null,
    });
    profilesBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const invitations = await supabaseFriends.getReceivedInvitations();
    expect(invitations[0].sender_name).toBe("Unknown User");
  });

  it("covers accept invitation auth/profile/friendship/update error branches", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.acceptInvitation("inv-1")).rejects.toThrow("User not authenticated");

    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");
    const friendshipsBuilder = harness.getBuilder("friendships");

    harness.supabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", email: null },
      },
    });
    profilesBuilder.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(supabaseFriends.acceptInvitation("inv-1")).rejects.toThrow("User profile not found");

    profilesBuilder.single.mockResolvedValueOnce({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.single.mockResolvedValueOnce({
      data: { id: "inv-1", sender_id: "friend-2", receiver_email: "user@example.com", status: "pending" },
      error: null,
    });
    friendshipsBuilder.insert.mockResolvedValueOnce({
      error: new Error("friendship failed"),
    });
    await expect(supabaseFriends.acceptInvitation("inv-1")).rejects.toThrow("friendship failed");

    profilesBuilder.single.mockResolvedValueOnce({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.single.mockResolvedValueOnce({
      data: { id: "inv-1", sender_id: "friend-2", receiver_email: "user@example.com", status: "pending" },
      error: null,
    });
    friendshipsBuilder.insert.mockResolvedValueOnce({
      error: null,
    });
    const updateEqMock = vi.fn().mockResolvedValueOnce({
      error: new Error("update failed"),
    });
    invitationsBuilder.update.mockReturnValueOnce({
      eq: updateEqMock,
    } as never);
    await expect(supabaseFriends.acceptInvitation("inv-1")).rejects.toThrow("update failed");
  });

  it("covers decline invitation auth/profile/error branches", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.declineInvitation("inv-1")).rejects.toThrow("User not authenticated");

    const profilesBuilder = harness.getBuilder("profiles");
    const invitationsBuilder = harness.getBuilder("friend_invitations");

    harness.supabase.auth.getUser.mockResolvedValueOnce({
      data: {
        user: { id: "user-1", email: null },
      },
    });
    profilesBuilder.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(supabaseFriends.declineInvitation("inv-1")).rejects.toThrow("User profile not found");

    profilesBuilder.single.mockResolvedValueOnce({
      data: { email: "user@example.com" },
      error: null,
    });
    invitationsBuilder.eq.mockReturnValueOnce(invitationsBuilder).mockResolvedValueOnce({
      error: new Error("decline failed"),
    });
    await expect(supabaseFriends.declineInvitation("inv-1")).rejects.toThrow("decline failed");
  });

  it("covers getFriends and removeFriend error branches", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.getFriends()).rejects.toThrow("User not authenticated");

    harness.supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("friends failed"),
    });
    await expect(supabaseFriends.getFriends()).rejects.toThrow("friends failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseFriends.removeFriend("friend-1")).rejects.toThrow("User not authenticated");

    const friendshipsBuilder = harness.getBuilder("friendships");
    friendshipsBuilder.or.mockResolvedValueOnce({
      error: new Error("remove failed"),
    });
    await expect(supabaseFriends.removeFriend("friend-1")).rejects.toThrow("remove failed");
  });

  it("covers areUsersFriends rpc error and false fallback", async () => {
    harness.supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("rpc failed"),
    });
    await expect(supabaseFriends.areUsersFriends("u1", "u2")).rejects.toThrow("rpc failed");

    harness.supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(supabaseFriends.areUsersFriends("u1", "u2")).resolves.toBe(false);
  });
});
