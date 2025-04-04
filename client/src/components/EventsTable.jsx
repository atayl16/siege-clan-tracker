import React from "react";

export default function EventsTable({ events }) {
  return (
    <table className="table table-dark table-hover table-responsive table-bordered">
      <thead>
        <tr>
          <th style={{ textAlign: "center" }}>Time</th>
          <th style={{ textAlign: "left" }}>Name</th>
          <th style={{ textAlign: "center" }}>Duration</th>
          <th style={{ textAlign: "center" }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td style={{ textAlign: "center" }}>{event.time}</td>
            <td style={{ textAlign: "left" }}>{event.name}</td>
            <td style={{ textAlign: "center" }}>{event.duration}</td>
            <td style={{ textAlign: "center" }}>{event.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
