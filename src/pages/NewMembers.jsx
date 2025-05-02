import React from "react";
import {
  FaMedal,
  FaUserPlus,
  FaBook,
  FaDiscord,
  FaGlobe,
  FaComments,
  FaHandshake,
} from "react-icons/fa";
import Button from "../components/ui/Button";
import clanVideo from "../assets/videos/VT-986_OSRS_Video.mp4";
import "./NewMembers.css";

export default function NewMembers() {
  return (
    <div className="nm-page-container">
      {/* Video Hero Section */}
      <div className="nm-video-hero-container">
        <div className="nm-video-background">
          <video autoPlay muted loop playsInline>
            <source src={clanVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="nm-video-overlay"></div>
        </div>

        <div className="nm-hero-content">
          <h1 className="nm-hero-title">Welcome to Siege</h1>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="nm-section-container">
        <h3 className="nm-section-title">
          <FaUserPlus className="nm-section-icon" /> Clan Introduction
        </h3>

        <div className="nm-welcome-content">
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
        </div>
      </div>

      {/* Join Us Section */}
      <div className="nm-section-container">
        <h3 className="nm-section-title">
          <FaHandshake className="nm-section-icon" /> Join Us
        </h3>

        <div className="nm-connect-options">
          <div className="nm-connect-card">
            <div className="nm-connect-icon">
              <FaComments />
            </div>
            <h4>Clan Chat</h4>
            <div className="nm-connect-value">"Siege"</div>
            <p>Join as a guest - everyone is welcome!</p>
          </div>

          <div className="nm-connect-card">
            <div className="nm-connect-icon">
              <FaDiscord />
            </div>
            <h4>Discord</h4>
            <div className="nm-connect-value">Join our community</div>
            <a
              href="https://discord.gg/aXYHD6UdQJ"
              target="_blank"
              rel="noopener noreferrer"
              className="nm-discord-button nm-connect-button"
            >
              <FaDiscord /> Join Discord
            </a>
          </div>

          <div className="nm-connect-card">
            <div className="nm-connect-icon">
              <FaGlobe />
            </div>
            <h4>Home World</h4>
            <div className="nm-connect-value">World 517</div>
            <p>Find us on our official home world</p>
          </div>
        </div>
      </div>

      {/* Level Requirements Section */}
      <div className="nm-section-container">
        <h3 className="nm-section-title">
          <FaMedal className="nm-section-icon" /> Minimum Level Requirements
        </h3>

        <div className="nm-requirements-grid">
          <div className="nm-requirement-card">
            <h4>Skillers</h4>
            <div className="nm-requirement-value">Total Level 400+</div>
            <p>For accounts focused on non-combat skills</p>
          </div>

          <div className="nm-requirement-card">
            <h4>Ironman Accounts</h4>
            <div className="nm-requirement-value">Total Level 600+</div>
            <p>
              For all ironman account types (regular, hardcore, ultimate, or
              group)
            </p>
          </div>

          <div className="nm-requirement-card">
            <h4>Regular Accounts</h4>
            <div className="nm-requirement-value">Total Level 1750+</div>
            <p>For standard gameplay accounts</p>
          </div>
        </div>

        <div className="nm-requirements-note">
          <p>
            These requirements help ensure all members can participate in clan
            activities. Exceptions may be made on a case-by-case basis.
          </p>
          <p>
            Our clan rules are simple: follow the rules of the game, be respectful, and have fun! More detailed guidelines available in Discord, if needed.
          </p>
        </div>
      </div>
    </div>
  );
}
