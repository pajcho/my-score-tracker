import { vi } from "vitest";

export interface QueryBuilderMock {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

export interface SupabaseMockHarness {
  supabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
      onAuthStateChange: ReturnType<typeof vi.fn>;
      signUp: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    channel: ReturnType<typeof vi.fn>;
    removeChannel: ReturnType<typeof vi.fn>;
  };
  tableBuilders: Record<string, QueryBuilderMock>;
  getBuilder: (tableName: string) => QueryBuilderMock;
  reset: () => void;
}

const createQueryBuilderMock = (): QueryBuilderMock => {
  const builder: QueryBuilderMock = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.or.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.single.mockResolvedValue({ data: null, error: null });
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });

  return builder;
};

export const createSupabaseMockHarness = (): SupabaseMockHarness => {
  const tableBuilders: Record<string, QueryBuilderMock> = {};
  const channelObject = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channelObject.on.mockReturnValue(channelObject);
  channelObject.subscribe.mockReturnValue(channelObject);

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.com" } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((tableName: string) => {
      if (!tableBuilders[tableName]) {
        tableBuilders[tableName] = createQueryBuilderMock();
      }
      return tableBuilders[tableName];
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn(() => channelObject),
    removeChannel: vi.fn().mockResolvedValue({}),
  };

  const reset = () => {
    Object.keys(tableBuilders).forEach((tableName) => {
      delete tableBuilders[tableName];
    });
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.com" } } });
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    supabase.auth.signUp.mockResolvedValue({ data: null, error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    supabase.from.mockClear();
    supabase.rpc.mockClear();
    supabase.channel.mockClear();
    supabase.removeChannel.mockClear();

    channelObject.on.mockClear();
    channelObject.subscribe.mockClear();
    channelObject.on.mockReturnValue(channelObject);
    channelObject.subscribe.mockReturnValue(channelObject);
  };

  return {
    supabase,
    tableBuilders,
    getBuilder: (tableName: string) => {
      if (!tableBuilders[tableName]) {
        tableBuilders[tableName] = createQueryBuilderMock();
      }
      return tableBuilders[tableName];
    },
    reset,
  };
};
