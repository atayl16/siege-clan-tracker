import React from "react";
import { ClanIcon, GemIcon } from "./RankIcons";
import { SKILLER_RANKS, FIGHTER_RANKS } from "../utils/rankUtils";
import "./ClanRanks.css";

export default function ClanRanks() {
  return (
    <table className="table table-dark table-hover table-sm table-responsive">
      <thead>
        <tr>
          <th style={{ textAlign: "center" }} colSpan="2">
            Clan Ranks
          </th>
        </tr>
      </thead>
      <tbody>
        {/* First 8 rows have both Skiller and Fighter ranks */}
        {SKILLER_RANKS.map((skillerRank, index) => (
          <tr key={skillerRank.name}>
            <td style={{ textAlign: "center" }}>
              <GemIcon gemType={skillerRank.name} color={skillerRank.color} />
              <span>{skillerRank.name} - {skillerRank.description}</span>
            </td>
            <td style={{ textAlign: "center" }}>
              <ClanIcon name={FIGHTER_RANKS[index]?.name} />
              {` ${FIGHTER_RANKS[index]?.name} - ${FIGHTER_RANKS[index]?.description}`}
            </td>
          </tr>
        ))}
        {/* Last row only has TzKal if it wasn't included above */}
        {FIGHTER_RANKS.length > SKILLER_RANKS.length && (
          <tr>
            <td></td>
            <td style={{ textAlign: "center" }}>
              <ClanIcon name="TzKal" />
              {` TzKal - 1500 EHB`}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
