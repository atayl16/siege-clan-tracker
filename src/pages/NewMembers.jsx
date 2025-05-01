import React from "react";
import {
  FaMedal,
  FaUserPlus,
  FaBook,
  FaChevronRight,
  FaDiscord,
} from "react-icons/fa";
import Button from "../components/ui/Button";
import clanVideo from "../assets/videos/VT-986_OSRS_Video.mp4";
import "./NewMembers.css";

export default function NewMembers() {
  return (
    <div className="ui-page-container">
      {/* Video Hero Section */}
      <div className="ui-video-hero-container">
        <div className="ui-video-background">
          <video autoPlay muted loop playsInline>
            <source src={clanVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="ui-video-overlay"></div>
        </div>
        
        <div className="ui-hero-content">
          <h1 className="ui-hero-title">Welcome to Siege</h1>
        </div>
      </div>
      
      {/* Welcome Section */}
      <div className="ui-section-container">
        <h3 className="ui-section-title">
          <FaUserPlus className="ui-section-icon" /> Clan Introduction
        </h3>

        <div className="ui-welcome-content">
          <p>
            Welcome to Siege's official clan site! We're a friendly and active
            clan founded on April 23, 2022.
          </p>

          <p>
            What is there to say? We're thriving as a clan right now. If you're
            looking for somewhere to come and chill in your downtime then feel
            free to come and hang out.
          </p>

          <p>
            With members right across the continent, our CC stays active pretty
            much all day long. We host a variety of events & competitions plus
            PvM Bingo! There's always something going on in our community!
          </p>

          <div className="ui-discord-button-container">
            <a
              href="https://discord.gg/aXYHD6UdQJ"
              target="_blank"
              rel="noopener noreferrer"
              className="ui-discord-button"
            >
              <FaDiscord /> Join us in Discord
            </a>
          </div>
        </div>
      </div>

      {/* Level Requirements Section */}
      <div className="ui-section-container">
        <h3 className="ui-section-title">
          <FaChevronRight className="ui-section-icon" /> Minimum Level Requirements
        </h3>

        <div className="ui-requirements-grid">
          <div className="ui-requirement-card">
            <h4>Skillers</h4>
            <div className="ui-requirement-value">Total Level 400+</div>
            <p>For accounts focused on non-combat skills</p>
          </div>

          <div className="ui-requirement-card">
            <h4>Ironman Accounts</h4>
            <div className="ui-requirement-value">Total Level 600+</div>
            <p>
              For all ironman account types (regular, hardcore, ultimate, or
              group)
            </p>
          </div>

          <div className="ui-requirement-card">
            <h4>Regular Accounts</h4>
            <div className="ui-requirement-value">Total Level 1750+</div>
            <p>For standard gameplay accounts</p>
          </div>
        </div>

        <div className="ui-requirements-note">
          <p>
            These requirements help ensure all members can participate in clan
            activities. Exceptions may be made on a case-by-case basis.
          </p>
        </div>
      </div>
      
      {/* Rules Section */}
      <div className="ui-section-container">
        <h3 className="ui-section-title">
          <FaBook className="ui-section-icon" /> Clan Rules
        </h3>

        <div className="ui-rules-content">
          <ol className="ui-rules-list">
            <li>Follow the rules of the game.</li>
            <li>Respect all clan members even if you disagree with their viewpoint - a little bit of respect goes a long way!</li>
            <li>No discrimination of any kind. We aim to have a very inclusive environment!</li>
            <li>Do not spoil anything from popular media in the clan chat or in the discord server. (Do not spoil anything in private chat without the consent of that person)</li>
            <li>No scamming.</li>
            <li>Do not bring drama to the clan. Any drama will get shut down and dealt with. This community is a place where members come and chill and play the game. Siege is a drama-free clan. Remember this rule and store it in your brains (:</li>
          </ol>
        
          <div className="ui-rules-note">
            <p>
              Siege Staff Team have the right to kick any member from this clan if you break any of the above rulings.
            </p>
            <p>
              We would like to think we a very laid back clan so please don't take advantage of that and ruin it for everyone else!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
