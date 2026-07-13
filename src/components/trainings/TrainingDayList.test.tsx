import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Training } from "@/lib/supabaseDatabase";

const { deleteTrainingMock, toastMock, invalidateTrackerQueriesMock } = vi.hoisted(() => ({
  deleteTrainingMock: vi.fn(),
  toastMock: vi.fn(),
  invalidateTrackerQueriesMock: vi.fn(),
}));

vi.mock("@/lib/supabaseDatabase", () => ({
  supabaseDb: {
    deleteTraining: deleteTrainingMock,
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/queryCache", () => ({
  invalidateTrackerQueries: invalidateTrackerQueriesMock,
}));

vi.mock("@/components/trainings/TrainingEditDialog", () => ({
  TrainingEditDialog: ({ open }: { open: boolean }) => (open ? <div>TrainingEditDialog</div> : null),
}));

vi.mock("@/components/ui/responsiveFormModal", () => ({
  ResponsiveFormModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => true,
}));

import { TrainingDayList } from "@/components/trainings/TrainingDayList";

const trainings = [
  // Two sessions on Jul 6 (60 + 45 minutes), one on Jul 1.
  { id: "t1", user_id: "user-1", game: "Pool", title: "Pattern drills", training_date: "2026-07-06", duration_minutes: 60, notes: "Shape for the 8.", created_at: "", updated_at: "" },
  { id: "t2", user_id: "user-1", game: "Ping Pong", title: "Serve drills", training_date: "2026-07-06", duration_minutes: 45, notes: null, created_at: "", updated_at: "" },
  { id: "t3", user_id: "user-1", game: "Pool", title: "Break practice", training_date: "2026-07-01", duration_minutes: 30, notes: null, created_at: "", updated_at: "" },
] as unknown as Training[];

describe("TrainingDayList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups trainings under day headers with a total-time tally", () => {
    render(<TrainingDayList trainings={trainings} onTrainingUpdated={() => undefined} />);

    expect(screen.getByText(/Jul 6, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText("1h 45m trained")).toBeInTheDocument();
    expect(screen.getByText("30m trained")).toBeInTheDocument();
  });

  it("renders compact rows with duration", () => {
    render(<TrainingDayList trainings={trainings} onTrainingUpdated={() => undefined} />);

    expect(screen.getByText("Pattern drills")).toBeInTheDocument();
    expect(screen.getByText("60 min")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();
  });

  it("opens the detail sheet with notes, edit and delete", () => {
    render(<TrainingDayList trainings={trainings} onTrainingUpdated={() => undefined} />);

    fireEvent.click(screen.getByText("Pattern drills"));

    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("Shape for the 8.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument();
  });

  it("opens the edit dialog from the detail sheet", () => {
    render(<TrainingDayList trainings={trainings} onTrainingUpdated={() => undefined} />);

    fireEvent.click(screen.getByText("Serve drills"));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));

    expect(screen.getByText("TrainingEditDialog")).toBeInTheDocument();
  });
});
