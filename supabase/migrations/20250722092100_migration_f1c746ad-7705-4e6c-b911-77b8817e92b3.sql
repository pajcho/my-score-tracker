-- Allow receiver_id to be nullable for pending invitations
-- This allows sending invitations to emails of users who haven't signed up yet
ALTER TABLE public.friend_invitations 
ALTER COLUMN receiver_id DROP NOT NULL;