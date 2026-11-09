import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useRaces } from "../hooks/useRaces";
import { canEditRace } from "../utils/races";
import CreateRace from "../components/CreateRace";
import EmptyState from "../components/ui/EmptyState";
import LoadingIndicator from "../components/ui/LoadingIndicator";

/**
 * /races/:id/edit - the race form in edit mode.
 *
 * Who may edit is canEditRace's call (the race's creator, for now; see
 * utils/races.js for making it admin-only). RLS enforces the same rule, so
 * this check is about showing a clear message, not about security.
 */
export default function EditRacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { races, loading, error, refresh } = useRaces(user?.id);

  const backToRaces = () => navigate("/profile");

  if (loading) return <LoadingIndicator />;

  // Checked before "not found": a failed load says nothing about the race.
  if (error) {
    return (
      <EmptyState
        icon={<FaTrophy />}
        title="Couldn't Load Races"
        description="Something went wrong loading this race."
        action={<Button onClick={() => refresh()}>Try Again</Button>}
      />
    );
  }

  // RLS only returns public races and your own, so a private race someone
  // else created reads as not found - which is the right answer for it.
  const race = races.find((r) => String(r.id) === String(id));

  if (!race) {
    return (
      <EmptyState
        icon={<FaTrophy />}
        title="Race Not Found"
        description="This race does not exist, or you cannot see it."
      />
    );
  }

  if (!canEditRace(race, user)) {
    return (
      <EmptyState
        icon={<FaTrophy />}
        title="You Can't Edit This Race"
        description="Only the member who created a race can edit it."
      />
    );
  }

  return (
    <div className="ui-container-content-card">
      {/* Keyed on the race: moving between two edit pages reuses this route's
          element, and the form would otherwise keep the first race's rows. */}
      <CreateRace
        key={race.id}
        userId={user.id}
        race={race}
        onCreated={backToRaces}
        onCancel={backToRaces}
      />
    </div>
  );
}
