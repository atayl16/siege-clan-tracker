import React from "react";
import { ClanIcon, GemIcon } from "./RankIcons";
import { SKILLER_RANKS, FIGHTER_RANKS } from "../utils/rankUtils";
import "./ClanRanks.css";

export default function ClanRanks() {
  return (
    <div className="ui-table-container">
      <table className="ui-table ui-clan-ranks-table">
        <thead>
          <tr>
            <th className="ui-clan-ranks-subheader">Skiller Path</th>
            <th className="ui-clan-ranks-subheader">Combat Path</th>
          </tr>
        </thead>
        <tbody>
          {/* First 8 rows have both Skiller and Fighter ranks */}
          {SKILLER_RANKS.map((skillerRank, index) => (
            <tr key={skillerRank.name} className="ui-rank-row">
              <td className="ui-clan-ranks-cell">
                <div className="ui-rank-name-container">
                  <div className="ui-rank-icon">
                    <GemIcon gemType={skillerRank.name} color={skillerRank.color} />
                  </div>
                  <div className="ui-rank-details">
                    <span className="ui-rank-name">{skillerRank.name}</span>
                    <span className="ui-rank-description">
                      {skillerRank.description}
                    </span>
                  </div>
                </div>
              </td>
              <td className="ui-clan-ranks-cell">
                {FIGHTER_RANKS[index] && (
                  <div className="ui-rank-name-container">
                    <div className="ui-rank-icon">
                      <ClanIcon name={FIGHTER_RANKS[index].name} />
                    </div>
                    <div className="ui-rank-details">
                      <span className="ui-rank-name">{FIGHTER_RANKS[index].name}</span>
                      <span className="ui-rank-description">
                        {FIGHTER_RANKS[index].description}
                      </span>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {/* Last row only has TzKal if it wasn't included above */}
          {FIGHTER_RANKS.length > SKILLER_RANKS.length && (
            <tr className="ui-rank-row">
              <td className="ui-clan-ranks-cell ui-empty-cell"></td>
              <td className="ui-clan-ranks-cell">
                <div className="ui-rank-name-container">
                  <div className="ui-rank-icon">
                    <ClanIcon name="TzKal" />
                  </div>
                  <div className="ui-rank-details">
                    <span className="ui-rank-name">TzKal</span>
                    <span className="ui-rank-description">1500 EHB</span>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
