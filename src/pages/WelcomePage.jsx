import React from "react";
import { Link } from "react-router-dom";
import welcomeBackground from "../assets/images/welcome2.jpg";
import "./WelcomePage.css";

const WelcomePage = () => {
  return (
    <div
      className="welcome-page"
      style={{
        backgroundImage: `url(${welcomeBackground})`,
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
      }}
    >
      <div className="container py-5 welcome-container">
        <div className="row mt-4">
          <div className="col-sm mb-3">
            <div className="card text-dark bg-warning h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Clan XP Tracker</h5>
                <p className="card-text flex-grow-1">
                  Check out your current rank, see how far to your next level or
                  simply compete with your friends.
                </p>
                <Link
                  to="/members#members"
                  className="btn btn-secondary mt-auto"
                >
                  Go
                </Link>
              </div>
            </div>
          </div>

          <div className="col-sm mb-3">
            <div className="card text-dark bg-warning h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Leaderboard</h5>
                <p className="card-text flex-grow-1">
                  See the full event leaderboard including scores, ranks and
                  more. How close are you to leveling up?
                </p>
                <Link
                  to="/members#leaderboard"
                  className="btn btn-secondary mt-auto"
                >
                  Go
                </Link>
              </div>
            </div>
          </div>

          <div className="col-sm mb-3">
            <div className="card text-dark bg-warning h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Clan Events</h5>
                <p className="card-text flex-grow-1">
                  Check out all events, past and future! Find out when they
                  start, when they end, and who won.
                </p>
                <Link
                  to="/members#events"
                  className="btn btn-secondary mt-auto"
                >
                  Go
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div
          className="jumbotron p-4 rounded shadow"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
        >
          <div className="text-center">
            <h1 className="display-4">Welcome to Siege</h1>
            <p className="lead">Founded April 23, 2022</p>
          </div>
          <hr className="my-4" />
          <p style={{ textAlign: "left" }}>
            Welcome to Siege&apos; official clan site.
            <br />
            <br />
            A Clan introduction you say? What is there to say? We&apos;re just
            about a year old and we&apos;re absolutely thriving as a clan right
            now. If you&apos;re looking for somewhere to come and chill in your
            downtime then feel free to come and hang out.
            <br />
            <br />
            We have members right across the continent which makes the CC active
            pretty much all day long.
            <br />
            <br />
            We host a variety of events & competitions plus PvM Bingo!
            There&apos;s always something going on in our community!
            <br />
            <br />
            Well what are you waiting for?! Come and join the CC! See you soon!
          </p>
          <div className="text-center">
            <a
              className="btn btn-secondary btn-lg"
              href="https://discord.gg/aXYHD6UdQJ"
              role="button"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join us in Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
